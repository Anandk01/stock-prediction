from fastapi import APIRouter, Depends, HTTPException
from typing import List
from modules.auth.router import get_current_user
from core.database import get_db_path
from core.models import Portfolio, NormalizedHolding, ParsedPortfolio, AssetType, AccountType
from pydantic import BaseModel
from modules.analytics.service import analytics_engine
from modules.ai_insights.service import ai_insights_engine
import pandas as pd
import aiosqlite
import json
from datetime import datetime

router = APIRouter()


class SavePortfolioRequest(BaseModel):
    holdings: List[NormalizedHolding]


class SaveParsedRequest(BaseModel):
    holdings: List[NormalizedHolding]


def _serialize_holdings(holdings: List[NormalizedHolding]) -> str:
    return json.dumps([h.model_dump() for h in holdings])


def _deserialize_holdings(data: str) -> List[NormalizedHolding]:
    if not data:
        return []
    return [NormalizedHolding(**h) for h in json.loads(data)]


@router.get("/current")
async def get_current_portfolio(current_user=Depends(get_current_user)):
    """Fetch the user's current portfolio with persisted analytics and AI insights."""
    try:
        db_path = get_db_path()
        async with aiosqlite.connect(db_path) as db:
            cursor = await db.execute(
                "SELECT holdings, metrics, allocation, ai_strategy, created_at FROM portfolios WHERE user_id = ?",
                (current_user.id,)
            )
            row = await cursor.fetchone()

        if not row:
            return {
                "holdings": [],
                "portfolio_metrics": None,
                "allocation_breakdown": [],
                "ai_strategy": None,
                "message": "No portfolio found. Please upload a statement."
            }

        holdings = _deserialize_holdings(row[0])
        metrics = json.loads(row[1]) if row[1] else None
        allocation_list = json.loads(row[2]) if row[2] else None
        ai_strategy = json.loads(row[3]) if row[3] else None

        if metrics is None or not allocation_list:
            metrics = analytics_engine.calculate_portfolio_metrics(holdings, {})

            allocation_breakdown = {}
            for h in holdings:
                if h.asset_type == AssetType.STOCK:
                    label = "Equity"
                elif (h.asset_type == AssetType.MF and h.account_type == AccountType.DEMAT) or h.asset_type == AssetType.ETF:
                    label = "Mutual Funds (Demat)"
                elif h.asset_type == AssetType.MF and h.account_type == AccountType.SOA:
                    label = "Mutual Funds (SOA)"
                else:
                    type_label_map = {
                        AssetType.COMMODITY: "Commodities",
                        AssetType.CASH: "Cash",
                    }
                    label = type_label_map.get(h.asset_type, "Others")
                allocation_breakdown[label] = allocation_breakdown.get(label, 0) + h.current_value

            allocation_list = [{"name": k, "value": round(v, 2)} for k, v in allocation_breakdown.items()]

            opt = ai_insights_engine.optimize_portfolio_rl(holdings)
            ins = ai_insights_engine.generate_explainable_insights(metrics)
            ai_strategy = {"optimization": opt, "insights": ins}

        return {
            "holdings": [h.model_dump() for h in holdings],
            "portfolio_metrics": metrics,
            "allocation_breakdown": allocation_list,
            "ai_strategy": ai_strategy,
            "created_at": row[4]
        }
    except Exception as e:
        import traceback
        print(f"ERROR in get_current_portfolio: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save")
async def save_portfolio(request: SavePortfolioRequest, current_user=Depends(get_current_user)):
    """Save or update the user's portfolio holdings."""
    db_path = get_db_path()
    holdings_json = _serialize_holdings(request.holdings)
    now = datetime.utcnow().isoformat()

    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute(
            "SELECT id FROM portfolios WHERE user_id = ?", (current_user.id,)
        )
        existing = await cursor.fetchone()

        if existing:
            await db.execute(
                "UPDATE portfolios SET holdings = ? WHERE user_id = ?",
                (holdings_json, current_user.id)
            )
        else:
            await db.execute(
                "INSERT INTO portfolios (user_id, holdings, created_at) VALUES (?, ?, ?)",
                (current_user.id, holdings_json, now)
            )
        await db.commit()

    return {
        "status": "success",
        "holdings_count": len(request.holdings),
        "message": "Portfolio saved successfully"
    }


@router.post("/save-parsed")
async def save_parsed_holdings(request: SaveParsedRequest, current_user=Depends(get_current_user)):
    """Save normalized holdings to ParsedPortfolio for review."""
    db_path = get_db_path()
    holdings_json = _serialize_holdings(request.holdings)

    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute(
            "SELECT id FROM parsed_portfolios WHERE user_id = ?", (current_user.id,)
        )
        existing = await cursor.fetchone()

        if not existing:
            raise HTTPException(status_code=404, detail="No parsed portfolio found. Please upload a PDF first.")

        await db.execute(
            "UPDATE parsed_portfolios SET holdings = ? WHERE user_id = ?",
            (holdings_json, current_user.id)
        )
        await db.commit()

    return {"status": "success", "message": "Normalized holdings saved for review"}


@router.post("/process")
async def process_portfolio(current_user=Depends(get_current_user)):
    """Process parsed portfolio: fetch market data → compute analytics → save."""
    from modules.market_data.service import market_data_service

    db_path = get_db_path()

    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute(
            "SELECT holdings, status FROM parsed_portfolios WHERE user_id = ?",
            (current_user.id,)
        )
        row = await cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="No parsed portfolio found. Please upload a PDF first.")

    if row[1] == "processing":
        raise HTTPException(status_code=409, detail="Portfolio is already being processed")

    try:
        # Update status
        async with aiosqlite.connect(db_path) as db:
            await db.execute(
                "UPDATE parsed_portfolios SET status = 'processing' WHERE user_id = ?",
                (current_user.id,)
            )
            await db.commit()

        normalized_holdings = _deserialize_holdings(row[0])

        if not normalized_holdings:
            raise HTTPException(status_code=400, detail="No holdings to process. Please re-upload your PDF.")

        # Fetch market data
        market_data_map = {}
        for h in normalized_holdings:
            if h.symbol:
                try:
                    file_path = market_data_service.fetch_historical_data(h.symbol)
                    market_data_map[h.symbol] = pd.read_parquet(file_path)
                except Exception as e:
                    print(f"Warning: Could not fetch market data for {h.symbol}: {e}")

        # Compute analytics
        metrics = analytics_engine.calculate_portfolio_metrics(normalized_holdings, market_data_map)

        allocation_breakdown = {}
        for h in normalized_holdings:
            if h.asset_type == AssetType.STOCK:
                label = "Equity"
            elif (h.asset_type == AssetType.MF and h.account_type == AccountType.DEMAT) or h.asset_type == AssetType.ETF:
                label = "Mutual Funds (Demat)"
            elif h.asset_type == AssetType.MF and h.account_type == AccountType.SOA:
                label = "Mutual Funds (SOA)"
            else:
                type_label_map = {AssetType.COMMODITY: "Commodities", AssetType.CASH: "Cash"}
                label = type_label_map.get(h.asset_type, "Others")
            allocation_breakdown[label] = allocation_breakdown.get(label, 0) + h.current_value

        allocation_list = [{"name": k, "value": round(v, 2)} for k, v in allocation_breakdown.items()]

        ai_optimization = ai_insights_engine.optimize_portfolio_rl(normalized_holdings)
        ai_insights = ai_insights_engine.generate_explainable_insights(metrics)
        ai_strategy = {"optimization": ai_optimization, "insights": ai_insights}

        # Save to portfolios table
        holdings_json = _serialize_holdings(normalized_holdings)
        now = datetime.utcnow().isoformat()

        async with aiosqlite.connect(db_path) as db:
            cursor = await db.execute(
                "SELECT id FROM portfolios WHERE user_id = ?", (current_user.id,)
            )
            existing = await cursor.fetchone()

            if existing:
                await db.execute(
                    "UPDATE portfolios SET holdings = ?, metrics = ?, allocation = ?, ai_strategy = ? WHERE user_id = ?",
                    (holdings_json, json.dumps(metrics), json.dumps(allocation_list), json.dumps(ai_strategy), current_user.id)
                )
            else:
                await db.execute(
                    "INSERT INTO portfolios (user_id, holdings, metrics, allocation, ai_strategy, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                    (current_user.id, holdings_json, json.dumps(metrics), json.dumps(allocation_list), json.dumps(ai_strategy), now)
                )

            # Mark parsed as completed
            await db.execute(
                "UPDATE parsed_portfolios SET status = 'completed' WHERE user_id = ?",
                (current_user.id,)
            )
            await db.commit()

        return {
            "status": "processed",
            "holdings_count": len(normalized_holdings),
            "portfolio_metrics": metrics,
            "allocation_breakdown": allocation_list,
            "ai_strategy": ai_strategy,
            "message": "Portfolio processed successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"ERROR in process_portfolio: {str(e)}")
        traceback.print_exc()

        async with aiosqlite.connect(db_path) as db:
            await db.execute(
                "UPDATE parsed_portfolios SET status = 'failed' WHERE user_id = ?",
                (current_user.id,)
            )
            await db.commit()
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@router.delete("/clear")
async def clear_portfolio(current_user=Depends(get_current_user)):
    """Clear the user's portfolio."""
    db_path = get_db_path()
    async with aiosqlite.connect(db_path) as db:
        await db.execute("DELETE FROM portfolios WHERE user_id = ?", (current_user.id,))
        await db.commit()
    return {"status": "success", "message": "Portfolio cleared"}
