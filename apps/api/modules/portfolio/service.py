from core.database import get_db_path
from core.models import Portfolio, NormalizedHolding
import aiosqlite
import json
import logging

logger = logging.getLogger(__name__)


class PortfolioService:
    async def get_portfolio(self, user_id):
        """Fetch portfolio by User ID."""
        db_path = get_db_path()
        async with aiosqlite.connect(db_path) as db:
            cursor = await db.execute(
                "SELECT holdings, metrics, allocation, ai_strategy, created_at FROM portfolios WHERE user_id = ?",
                (str(user_id),)
            )
            row = await cursor.fetchone()

        if not row:
            return None

        holdings = [NormalizedHolding(**h) for h in json.loads(row[0])] if row[0] else []
        return Portfolio(
            user_id=str(user_id),
            holdings=holdings,
            metrics=json.loads(row[1]) if row[1] else None,
            allocation=json.loads(row[2]) if row[2] else None,
            ai_strategy=json.loads(row[3]) if row[3] else None,
            created_at=row[4]
        )


portfolio_service = PortfolioService()
