from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, field_validator
from enum import Enum


class AssetType(str, Enum):
    STOCK = "STOCK"
    MF = "MF"
    ETF = "ETF"
    COMMODITY = "COMMODITY"
    CASH = "CASH"
    UNKNOWN = "UNKNOWN"


class AccountType(str, Enum):
    DEMAT = "DEMAT"
    SOA = "SOA"
    UNKNOWN = "UNKNOWN"


class AssetClass(str, Enum):
    MUTUAL_FUNDS = "Mutual Funds"
    EQUITY_SHARES = "Equity Shares"
    PREFERENCE_SHARES = "Preference Shares"
    BONDS = "Bonds / Debt"
    GOLD = "Gold"
    NPS = "NPS"
    OTHERS = "Others"


class RiskCategory(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"


class ParsedHolding(BaseModel):
    raw_name: str
    isin: Optional[str] = None
    quantity: float
    invested_value: float


class NormalizedHolding(BaseModel):
    symbol: Optional[str] = None
    isin: Optional[str] = None
    asset_name: str
    asset_type: AssetType
    account_type: AccountType = AccountType.UNKNOWN
    asset_class: AssetClass = AssetClass.EQUITY_SHARES
    sector: Optional[str] = None
    risk_category: RiskCategory = RiskCategory.MODERATE
    quantity: float
    invested_value: float
    current_value: float

    @field_validator('quantity', 'invested_value', 'current_value')
    @classmethod
    def round_financials(cls, v: float) -> float:
        return round(v, 4)


class Portfolio(BaseModel):
    id: Optional[int] = None
    user_id: str
    created_at: datetime = None
    holdings: List[NormalizedHolding] = []
    metrics: Optional[dict] = None
    allocation: Optional[List[dict]] = None
    ai_strategy: Optional[dict] = None


class ParsedPortfolio(BaseModel):
    id: Optional[int] = None
    user_id: str
    holdings: List[NormalizedHolding] = []
    cas_total: float = 0.0
    extracted_total: float = 0.0
    confidence: float = 0.0
    format_type: str = "UNKNOWN"
    status: str = "parsed"
    created_at: datetime = None


class User(BaseModel):
    id: Optional[int] = None
    email: str
    hashed_password: str
    full_name: Optional[str] = None
    created_at: datetime = None
    is_active: bool = True
