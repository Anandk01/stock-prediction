
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Optional
from pydantic import BaseModel
import pandas as pd
import yfinance as yf
from core.models import NormalizedHolding
from .service import analytics_engine, sentiment_service, PricePredictor
from .score_service import score_service
from .benchmark_service import benchmark_service
from modules.market_data.service import market_data_service
from modules.auth.router import get_current_user

router = APIRouter()

class BenchmarkRequest(BaseModel):
    holdings: Optional[List[NormalizedHolding]] = None

@router.post("/metrics")
async def calculate_metrics(holdings: List[NormalizedHolding]):
    """
    Module 4: Analytics
    Calculate portfolio metrics using real market data.
    """
    try:
        market_data_map = {}
        for h in holdings:
            symbol = h.symbol
            if symbol and not symbol.endswith(".UNRESOLVED"):
                # Defensive check for clearly malformed symbols (e.g., from stale frontend data)
                # ISIN is 12 chars. Symbol is usually < 12. Combined is > 15.
                if len(symbol) > 15 and re.search(r'[A-Z]{2}[0-9]{2}', symbol):
                    print(f"Skipping malformed symbol: {symbol}")
                    continue
                    
                try:
                    parquet_path = market_data_service.fetch_historical_data(symbol)
                    df = pd.read_parquet(parquet_path)
                    market_data_map[h.symbol] = df
                except Exception as e:
                    print(f"Warning: Could not fetch market data for {h.symbol}: {e}")
        
        metrics = analytics_engine.calculate_portfolio_metrics(holdings, market_data_map)
        return {
            "portfolio_metrics": metrics,
            "asset_analysis": [] # Placeholder for future expansion
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/score")
async def get_portfolio_score(user=Depends(get_current_user)):
    """
    Get AI Portfolio Health Score (0-100) and Grade.
    """
    # 0. Dependencies
    from modules.portfolio.service import portfolio_service

    try:
        # 1. Fetch Portfolio
        portfolio = await portfolio_service.get_portfolio(user.id)
        if not portfolio or not portfolio.holdings:
            return score_service._empty_score()
        
        # 2. Get Market Data Map
        market_data_map = {}
        for h in portfolio.holdings:
            if h.symbol and h.symbol != "Unresolved":
                try:
                    path = market_data_service.fetch_historical_data(h.symbol)
                    market_data_map[h.symbol] = pd.read_parquet(path)
                except Exception:
                    pass

        # 3. Calculate Base Metrics
        # Ensure analytics_engine doesn't crash on empty or partial data
        metrics = analytics_engine.calculate_portfolio_metrics(portfolio.holdings, market_data_map)
        
        # 4. Calculate Score
        score_data = score_service.calculate_health_score(portfolio, metrics)
        return score_data
    except Exception as e:
        print(f"Error calculating score: {e}")
        import traceback
        traceback.print_exc()
        return score_service._empty_score()


@router.post("/benchmark")
async def get_benchmark_comparison(request: Optional[BenchmarkRequest] = None, period: str = "1y", user=Depends(get_current_user)):
    """
    Get Portfolio vs NIFTY 50 vs Gold comparison.
    If holdings is provided, simulates that specific portfolio's performance.
    """
    from modules.portfolio.service import portfolio_service
    from .benchmark_service import benchmark_service
    
    try:
        # 1. Get Holdings (Simulated or Current)
        holdings = request.holdings if request else None
        
        if holdings is None:
            portfolio = await portfolio_service.get_portfolio(user.id)
            if not portfolio: return []
            holdings = portfolio.holdings

        if not holdings: return []

        # 2. Get Dates and Market Data
        market_data_map = {}
        for h in holdings:
            if h.symbol and h.symbol != "Unresolved":
                try:
                    path = market_data_service.fetch_historical_data(h.symbol, period="2y") # Fetch enough history
                    market_data_map[h.symbol] = pd.read_parquet(path)
                except Exception:
                    pass

        # 3. Calculate Portfolio Historical Returns
        pf_returns = analytics_engine.calculate_historical_returns(holdings, market_data_map)
        
        # 4. Compare with benchmarks for the requested period
        chart_data = benchmark_service.get_benchmark_comparison(pf_returns, period=period)
        return chart_data
        
    except Exception as e:
        print(f"Error generating benchmark: {e}")
        import traceback
        traceback.print_exc()
        return []


@router.post("/simulate")
async def simulate_portfolio(holdings: List[NormalizedHolding], user=Depends(get_current_user)):
    """
    Simulate portfolio metrics for 'What-If' scenarios.
    Does NOT save to database.
    """
    try:
        # 1. Fetch Market Data for Hypothetical Holdings
        # We need to fetch data even for new assets the user might be testing
        market_data_map = {}
        for h in holdings:
            if h.symbol and h.symbol != "Unresolved":
                try:
                    # Try to get data. If not in cache, it might be slow, but acceptable for simulation.
                    # For MVP, we assume commonly traded assets or already cached ones.
                    path = market_data_service.fetch_historical_data(h.symbol)
                    market_data_map[h.symbol] = pd.read_parquet(path)
                except Exception:
                    pass

        # 2. Calculate Metrics
        metrics = analytics_engine.calculate_portfolio_metrics(holdings, market_data_map)
        
        # 3. Calculate Allocation Breakdown (Duplicate logic from portfolio router for consistency)
        from core.models import AssetType, AccountType
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

        # 4. Calculate Score (Optional, but good for comparison)
        # We need a dummy portfolio object to pass to score_service
        from core.models import Portfolio
        dummy_pf = Portfolio(user_id="sim", email="sim", holdings=holdings)
        score_data = score_service.calculate_health_score(dummy_pf, metrics)
        
        return {
            "metrics": metrics,
            "score": score_data,
            "allocation": allocation_list
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/risk/correlation")
async def get_risk_analysis(holdings: List[NormalizedHolding], user=Depends(get_current_user)):
    """
    Get Correlation Matrix and Drawdown Analysis.
    Strategies:
    - Log Returns correlation matrix.
    - Max Drawdown calculation.
    """
    from .risk_service import risk_service
    
    try:
        if not holdings: return {}

        # 1. Fetch Data
        market_data_map = {}
        for h in holdings:
            if h.symbol and h.symbol != "Unresolved":
                try:
                    path = market_data_service.fetch_historical_data(h.symbol)
                    market_data_map[h.symbol] = pd.read_parquet(path)
                except Exception:
                    pass

        # 2. Calculate Returns Matrix (Reuse helper but need raw DF)
        # We need a DataFrame where columns are symbols and rows are daily returns
        # Reusing calculate_historical_returns logic roughly
        
        # Extract basic returns dataframe for correlation
        returns_df = pd.DataFrame()
        for sym, df in market_data_map.items():
            if "Close" in df.columns:
                # Align on Date if possible
                if "Date" in df.columns: df = df.set_index("Date")
                rets = df["Close"].pct_change()
                returns_df[sym] = rets
        
        # Align
        if not returns_df.empty:
            returns_df = returns_df.ffill().fillna(0)

        # 3. Correlation Metrics
        risk_data = risk_service.calculate_risk_metrics(returns_df)

        # 4. Portfolio Drawdown
        # We need weighted portfolio returns series
        pf_returns = analytics_engine.calculate_historical_returns(holdings, market_data_map)
        dd_data = risk_service.calculate_portfolio_drawdown(pf_returns)

        return {
            "correlation": risk_data,
            "drawdown": dd_data
        }

    except Exception as e:
        print(f"Error in risk analysis: {e}")
        raise HTTPException(status_code=500, detail="Risk analysis failed")


@router.post("/optimize")
async def optimize_portfolio(
    holdings: List[NormalizedHolding], 
    strategy: str = "aggressive",
    user=Depends(get_current_user)
):
    """
    AI Optimization using SciPy Efficient Frontier.
    Strategies: 'aggressive' (Max Sharpe) or 'conservative' (Min Vol).
    """
    from .optimization_service import optimization_service
    
    try:
        # 1. Fetch Data
        market_data_map = {}
        current_weights = {}
        total_val = sum(h.current_value for h in holdings)
        
        for h in holdings:
            if h.symbol and h.symbol != "Unresolved":
                try:
                    path = market_data_service.fetch_historical_data(h.symbol)
                    market_data_map[h.symbol] = pd.read_parquet(path)
                    
                    if total_val > 0:
                        current_weights[h.symbol] = h.current_value / total_val
                except Exception:
                    pass

        # 2. Prepare Returns DataFrame
        returns_df = pd.DataFrame()
        for sym, df in market_data_map.items():
            if "Close" in df.columns:
                if "Date" in df.columns: df = df.set_index("Date")
                rets = df["Close"].pct_change()
                returns_df[sym] = rets
        
        if not returns_df.empty:
            returns_df = returns_df.ffill().fillna(0) # Align

        # 3. Optimize
        result = optimization_service.optimize_portfolio(returns_df, current_weights, strategy)
        
        return result

    except Exception as e:
        print(f"Error in optimization: {e}")
    except Exception as e:
        print(f"Error in optimization: {e}")
        raise HTTPException(status_code=500, detail="Optimization failed")


@router.post("/frontier")
async def get_efficient_frontier(holdings: List[NormalizedHolding], user=Depends(get_current_user)):
    """
    Generate Efficient Frontier via Monte Carlo (n=1000).
    """
    from .optimization_service import optimization_service
    
    try:
        # 1. Fetch Data
        market_data_map = {}
        current_weights = {}
        total_val = sum(h.current_value for h in holdings)
        
        for h in holdings:
            if h.symbol and h.symbol != "Unresolved":
                try:
                    path = market_data_service.fetch_historical_data(h.symbol)
                    market_data_map[h.symbol] = pd.read_parquet(path)
                    
                    if total_val > 0:
                        current_weights[h.symbol] = h.current_value / total_val
                except Exception:
                    pass

        # 2. Prepare Returns DataFrame
        returns_df = pd.DataFrame()
        for sym, df in market_data_map.items():
            if "Close" in df.columns:
                if "Date" in df.columns: df = df.set_index("Date")
                rets = df["Close"].pct_change()
                returns_df[sym] = rets
        
        if not returns_df.empty:
            returns_df = returns_df.ffill().fillna(0)

        # 3. Simulate
        result = optimization_service.generate_efficient_frontier(returns_df, current_weights)
        return result

    except Exception as e:
        print(f"Error generating frontier: {e}")
        raise HTTPException(status_code=500, detail="Frontier generation failed")


# ==========================================
# HACKATHON STOCKS API ROUTER
# ==========================================
import sqlite3
import json
from datetime import datetime
from fastapi import Query
from pydantic import BaseModel
from .predictive_service import (
    DataCollectorService,
    FeatureEngineeringService,
    SentimentService,
    PredictionEngine,
    ExplanationService,
    IncrementalTrainer,
    DB_PATH
)

stocks_router = APIRouter()

class StockUpdateRequest(BaseModel):
    symbol: str

@stocks_router.get("/predictions")
async def get_stock_predictions(symbol: Optional[str] = None, user=Depends(get_current_user)):
    """
    Get predictions, sentiment, explainability, and technical indicators.
    Fallback to default watchlist if no portfolio or symbol provided.
    """
    from modules.portfolio.service import portfolio_service
    
    symbols_to_predict = []
    if symbol:
        symbols_to_predict = [symbol.upper()]
    else:
        # Load from user portfolio
        try:
            portfolio = await portfolio_service.get_portfolio(user.id)
            if portfolio and portfolio.holdings:
                # filter stock symbols
                symbols_to_predict = [
                    h.symbol.upper() for h in portfolio.holdings 
                    if h.asset_type == "STOCK" and h.symbol and h.symbol != "Unresolved"
                ]
        except Exception as e:
            print(f"Error fetching portfolio for predictions: {e}")
            
    # Fallback watchlist for hackathon demo
    if not symbols_to_predict:
        symbols_to_predict = ["TCS.NS", "INFY.NS", "RELIANCE.NS"]
        
    results = []
    for sym in symbols_to_predict:
        # Smart symbol resolution: if it already has a suffix, use as-is.
        # Otherwise try without suffix first (international), then with .NS (Indian).
        clean_sym = sym
        if not sym.endswith(".NS") and not sym.endswith(".BO") and "." not in sym:
            # Test if it works as a plain symbol (e.g. MSFT, AAPL, GOOGL)
            test_ticker = yf.Ticker(sym)
            test_df = test_ticker.history(period="5d", interval="1d")
            if not test_df.empty:
                clean_sym = sym  # International stock, use as-is
            else:
                clean_sym = f"{sym}.NS"  # Assume Indian NSE stock
            
        try:
            # 1. Initialize data & pre-train if database empty for this stock
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM candles WHERE symbol = ?", (clean_sym,))
            candle_count = cursor.fetchone()[0]
            conn.close()
            
            if candle_count < 50:
                print(f"Bootstrapping historical data for new stock: {clean_sym}")
                DataCollectorService.collect_historical_data(clean_sym)
                IncrementalTrainer.pretrain_on_history(clean_sym, "2h")
                IncrementalTrainer.pretrain_on_history(clean_sym, "1d")
                
            # 2. Fetch live metrics
            live_data = DataCollectorService.fetch_latest_candles(clean_sym)
            current_price = live_data["current_price"]
            daily_change = live_data["daily_change"]
            volume = live_data["volume"]
            
            # 3. Get sentiment score
            sent_data = SentimentService.fetch_headlines_and_sentiment(clean_sym)
            sent_score = sent_data["score"]
            
            # 4. Generate features
            df_5m = FeatureEngineeringService.get_features_df(clean_sym, "5m", sentiment_score=sent_score)
            df_1d = FeatureEngineeringService.get_features_df(clean_sym, "1d", sentiment_score=sent_score)
            
            feat_5m = FeatureEngineeringService.extract_latest_feature_dict(df_5m)
            feat_1d = FeatureEngineeringService.extract_latest_feature_dict(df_1d)
            
            # Extract basic indicators for UI
            rsi = feat_5m.get("rsi_14", 50.0)
            macd = feat_5m.get("macd", 0.0)
            macd_signal = feat_5m.get("macd_signal", 0.0)
            
            # Calculate Trend Strength
            ema_ratio = feat_5m.get("ema_20_ratio", 0.0)
            trend_strength = "Neutral"
            if ema_ratio < -0.01:
                trend_strength = "Strong Uptrend"
            elif ema_ratio < -0.002:
                trend_strength = "Weak Uptrend"
            elif ema_ratio > 0.01:
                trend_strength = "Strong Downtrend"
            elif ema_ratio > 0.002:
                trend_strength = "Weak Downtrend"
                
            # 5. Run River Predictions
            pred_2h = PredictionEngine.predict_stock(clean_sym, feat_5m, "2h")
            pred_1d = PredictionEngine.predict_stock(clean_sym, feat_1d, "1d")
            
            # 6. Recommendation logic (Based on 2h Intraday trend for quick feedback)
            rec = "HOLD"
            conf = pred_2h["confidence"]
            ret = pred_2h["expected_return"]
            direction = pred_2h["direction"]
            
            if direction == "Bullish" and conf > 0.55 and ret > 0.1:
                rec = "BUY"
            elif direction == "Bearish" and conf > 0.55:
                rec = "SELL"
                
            # 7. Generate Explainability Justification
            explanation = ExplanationService.generate_explanation(clean_sym, direction, conf, ret, feat_5m)
            
            # 8. Running Accuracy Metrics
            metrics = IncrementalTrainer.get_monitoring_metrics(clean_sym)
            
            results.append({
                "symbol": clean_sym,
                "current_price": round(current_price, 2),
                "daily_change": round(daily_change, 2),
                "volume": volume,
                "rsi": round(rsi, 2),
                "macd": round(macd, 4),
                "macd_signal": round(macd_signal, 4),
                "trend_strength": trend_strength,
                "predictions": {
                    "2h": {
                        "direction": pred_2h["direction"],
                        "confidence": round(pred_2h["confidence"] * 100, 1),
                        "expected_return": pred_2h["expected_return"],
                        "explanation": explanation
                    },
                    "1d": {
                        "direction": pred_1d["direction"],
                        "confidence": round(pred_1d["confidence"] * 100, 1),
                        "expected_return": pred_1d["expected_return"],
                        "explanation": ExplanationService.generate_explanation(clean_sym, pred_1d["direction"], pred_1d["confidence"], pred_1d["expected_return"], feat_1d)
                    }
                },
                "recommendation": rec,
                "sentiment": {
                    "score": round(sent_score, 2),
                    "classification": sent_data["classification"],
                    "headlines": sent_data["headlines"]
                },
                "metrics": metrics
            })
        except Exception as e:
            print(f"Error preparing prediction for {sym}: {e}")
            import traceback
            traceback.print_exc()
            
    return results

@stocks_router.post("/update")
async def update_stock_predictions(request: StockUpdateRequest, user=Depends(get_current_user)):
    """
    Trigger manual incremental update:
    Fetch live candles -> Run Sentiment -> Run Incremental Learner -> Store new prediction
    """
    sym = request.symbol.upper()
    clean_sym = sym
    if not sym.endswith(".NS") and not sym.endswith(".BO") and "." not in sym:
        # Test if it works as a plain symbol (international stock)
        test_ticker = yf.Ticker(sym)
        test_df = test_ticker.history(period="5d", interval="1d")
        if not test_df.empty:
            clean_sym = sym
        else:
            clean_sym = f"{sym}.NS"
        
    try:
        print(f"Updating predictions and training incrementally for {clean_sym}...")
        
        # 1. Fetch live candles
        live_data = DataCollectorService.fetch_latest_candles(clean_sym)
        
        # 2. Get sentiment
        sent_data = SentimentService.fetch_headlines_and_sentiment(clean_sym)
        sent_score = sent_data["score"]
        
        # 3. Evaluate matured predictions & trigger learn_one() incremental learning
        samples_learned = IncrementalTrainer.evaluate_and_train_live(clean_sym)
        
        # 4. Compute latest features for new prediction entry
        df_5m = FeatureEngineeringService.get_features_df(clean_sym, "5m", sentiment_score=sent_score)
        df_1d = FeatureEngineeringService.get_features_df(clean_sym, "1d", sentiment_score=sent_score)
        
        feat_5m = FeatureEngineeringService.extract_latest_feature_dict(df_5m)
        feat_1d = FeatureEngineeringService.extract_latest_feature_dict(df_1d)
        
        # 5. Make predictions
        pred_2h = PredictionEngine.predict_stock(clean_sym, feat_5m, "2h")
        pred_1d = PredictionEngine.predict_stock(clean_sym, feat_1d, "1d")
        
        # 6. Save current predictions into DB for future evaluation
        # Store both 2h and 1d
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        pred_time = datetime.utcnow().isoformat()
        
        # Store 2h
        cursor.execute("""
            INSERT INTO predictions (symbol, prediction_time, target_type, predicted_direction, confidence, expected_return, explanation, features, is_evaluated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
        """, (
            clean_sym, pred_time, "2h", pred_2h["direction"], pred_2h["confidence"], pred_2h["expected_return"],
            ExplanationService.generate_explanation(clean_sym, pred_2h["direction"], pred_2h["confidence"], pred_2h["expected_return"], feat_5m),
            json.dumps(feat_5m)
        ))
        
        # Store 1d
        cursor.execute("""
            INSERT INTO predictions (symbol, prediction_time, target_type, predicted_direction, confidence, expected_return, explanation, features, is_evaluated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
        """, (
            clean_sym, pred_time, "1d", pred_1d["direction"], pred_1d["confidence"], pred_1d["expected_return"],
            ExplanationService.generate_explanation(clean_sym, pred_1d["direction"], pred_1d["confidence"], pred_1d["expected_return"], feat_1d),
            json.dumps(feat_1d)
        ))
        
        conn.commit()
        conn.close()
        
        # 7. Return refreshed predictions list
        refreshed_data = await get_stock_predictions(clean_sym, user)
        return {
            "status": "success",
            "samples_learned": samples_learned,
            "message": f"Successfully performed incremental updates. Model trained on {samples_learned} matured samples.",
            "predictions": refreshed_data
        }
        
    except Exception as e:
        print(f"Error during incremental update for {clean_sym}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Incremental update failed: {str(e)}")

@stocks_router.get("/timeline")
async def get_prediction_timeline(symbol: str, user=Depends(get_current_user)):
    """
    Get recent prediction history timeline for display.
    """
    sym = symbol.upper()
    clean_sym = sym
    if not sym.endswith(".NS") and not sym.endswith(".BO") and "." not in sym:
        clean_sym = f"{sym}.NS"
        
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT prediction_time, target_type, predicted_direction, actual_direction, confidence, is_evaluated
        FROM predictions 
        WHERE symbol = ? 
        ORDER BY prediction_time DESC LIMIT 10
    """, (clean_sym,))
    rows = cursor.fetchall()
    conn.close()
    
    timeline = []
    for row in rows:
        timeline.append({
            "time": row[0],
            "target": row[1],
            "predicted": row[2],
            "actual": row[3] if row[5] == 1 else "Pending",
            "confidence": round(row[4] * 100, 1),
            "status": "correct" if row[5] == 1 and row[2] == row[3] else ("incorrect" if row[5] == 1 else "pending")
        })
        
    return timeline

@stocks_router.get("/top-picks")
async def get_top_picks(user=Depends(get_current_user)):
    """
    Return top stock recommendations from the watchlist with their signals.
    Shows all stocks with BUY or SELL recommendations sorted by confidence.
    """
    # Indian stock watchlist (these always have .NS suffix)
    watchlist = ["TCS.NS", "INFY.NS", "RELIANCE.NS", "HDFCBANK.NS", "SUZLON.NS"]
    
    all_picks = []
    for sym in watchlist:
        try:
            preds = await get_stock_predictions(sym, user)
            if preds:
                data = preds[0]
                rec = data["recommendation"]
                # Include BUY and SELL recommendations
                if rec in ("BUY", "SELL"):
                    all_picks.append({
                        "symbol": data["symbol"],
                        "price": data["current_price"],
                        "change": data["daily_change"],
                        "confidence": data["predictions"]["2h"]["confidence"],
                        "expected_return": data["predictions"]["2h"]["expected_return"],
                        "recommendation": rec
                    })
        except Exception as e:
            print(f"Top picks error for {sym}: {e}")
            pass
    
    # If no BUY/SELL signals, return all with highest confidence regardless
    if not all_picks:
        for sym in watchlist[:3]:
            try:
                preds = await get_stock_predictions(sym, user)
                if preds:
                    data = preds[0]
                    all_picks.append({
                        "symbol": data["symbol"],
                        "price": data["current_price"],
                        "change": data["daily_change"],
                        "confidence": data["predictions"]["2h"]["confidence"],
                        "expected_return": data["predictions"]["2h"]["expected_return"],
                        "recommendation": data["recommendation"]
                    })
            except Exception:
                pass
            
    # Sort by confidence descending
    all_picks.sort(key=lambda x: x["confidence"], reverse=True)
    return all_picks[:5]

