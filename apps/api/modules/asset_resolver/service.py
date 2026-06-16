from typing import Dict, Any, Optional, List
import re
from core.models import AssetType, AccountType, AssetClass, RiskCategory, NormalizedHolding, ParsedHolding
from modules.market_data.nav_service import nav_service

# =========================
# Asset Normalization Layer
# =========================

class AssetNormalizationService:

    def normalize_holdings(self, raw_holdings: list[ParsedHolding]) -> list[NormalizedHolding]:
        normalized: list[NormalizedHolding] = []

        for holding in raw_holdings:
            # Skip junk rows only if BOTH quantity and value are missing
            if holding.quantity <= 0 and holding.invested_value <= 0:
                print(f"DEBUG resolver: Skipping junk row {holding.raw_name} (Qty=0 AND Val=0)")
                continue

            isin = getattr(holding, "isin", None)
            mapped = self._lookup_asset(holding.raw_name, isin)

            # --- Pricing logic ---
            current_val = 0.0

            # 1. Mutual Fund Pricing (via NAV Service)
            if mapped["type"] == AssetType.MF:
                try:
                    latest_nav = None
                    if isin:
                        latest_nav = nav_service.get_nav_by_isin(isin)
                    
                    if not latest_nav:
                        latest_nav = nav_service.get_nav_by_name(holding.raw_name)

                    if latest_nav:
                        current_val = holding.quantity * latest_nav
                        print(f"DEBUG: MF {holding.raw_name} priced via NAV: {latest_nav} -> {current_val}")
                    else:
                        current_val = holding.invested_value or 0.0
                        print(f"DEBUG: MF {holding.raw_name} price fetch failed. Falling back to invested: {current_val}")
                except Exception as e:
                    print(f"ERROR pricing MF {holding.raw_name}: {e}")
                    current_val = holding.invested_value or 0.0

            # 2. Stock/ETF Pricing (via Yahoo Finance)
            elif mapped["symbol"]:
                from modules.market_data.service import market_data_service
                try:
                    latest_price = market_data_service.get_latest_price(mapped["symbol"])
                    if not latest_price or latest_price <= 0:
                        raise ValueError("Invalid price from market data")

                    calculated_val = holding.quantity * latest_price
                    if calculated_val > 0:
                        current_val = calculated_val
                    else:
                        current_val = holding.invested_value or 0.0
                except Exception as e:
                    print(f"ERROR fetching price for {mapped['symbol']}: {e}")
                    current_val = holding.invested_value or 0.0
            
            # 3. Fallback for Unresolved/Cash
            else:
                current_val = holding.invested_value or 0.0

            normalized.append(
                NormalizedHolding(
                    symbol=mapped["symbol"],
                    isin=isin,
                    asset_name=holding.raw_name,
                    asset_type=mapped["type"],
                    account_type=self._infer_account_type(mapped["type"], holding.raw_name, isin),
                    asset_class=mapped["asset_class"],
                    sector=mapped["sector"],
                    risk_category=mapped["risk"],
                    quantity=holding.quantity,
                    invested_value=holding.invested_value,
                    current_value=round(current_val, 2),
                )
            )

        return normalized

    def _lookup_asset(self, raw_name: str, isin: Optional[str]) -> Dict[str, Any]:
        result = resolver.resolve(raw_name, isin)

        # Map string asset type -> enum
        try:
            asset_type = AssetType[result["asset_type"]]
        except Exception:
            asset_type = AssetType.STOCK

        return {
            "symbol": result["symbol"],
            "type": asset_type,
            "asset_class": self._infer_asset_class(asset_type, raw_name),
            "sector": self._infer_sector(asset_type, raw_name, result["symbol"]),
            "risk": self._infer_risk(result["asset_type"], result["confidence"]),
        }

    def _infer_asset_class(self, asset_type: AssetType, raw_name: str) -> AssetClass:
        name = raw_name.upper()
        
        # 1. Gold Detection (High Priority)
        if "GOLD" in name:
            return AssetClass.GOLD
        
        # 2. Type-based default with keyword refinement
        if asset_type == AssetType.STOCK:
            return AssetClass.EQUITY_SHARES
            
        if asset_type == AssetType.ETF:
            # Gold ETFs already handled above. Other ETFs usually map to Equity or Bonds.
            if any(x in name for x in ["BOND", "DEBT", "GSEC", "G-SEC"]):
                return AssetClass.BONDS
            return AssetClass.EQUITY_SHARES
            
        if asset_type == AssetType.MF:
            # Special case: If it's a Gold MF, it's already handled.
            # Otherwise, for now, we follow the user's request to see "Mutual Funds"
            return AssetClass.MUTUAL_FUNDS
        
        # 3. Other keywords
        if any(x in name for x in ["BOND", "DEBT", "GSEC", "G-SEC"]):
            return AssetClass.BONDS
        if "PREFERENCE" in name:
            return AssetClass.PREFERENCE_SHARES
        if "NPS" in name:
            return AssetClass.NPS
            
        return AssetClass.OTHERS

    def _infer_sector(self, asset_type: AssetType, raw_name: str, symbol: Optional[str] = None) -> str:
        # 1. Official Yahoo Finance Sector (if symbol available)
        if symbol and asset_type == AssetType.STOCK:
            from modules.market_data.service import market_data_service
            try:
                profile = market_data_service.get_company_profile(symbol)
                if profile.get("sector") and profile["sector"] != "Others":
                    return profile["sector"]
            except Exception:
                pass

        name = raw_name.upper()
        
        # 2. ETF Mapping (Hardcoded for common ETFs)
        if asset_type == AssetType.ETF:
            if "GOLD" in name: return "Commodity"
            if "BANK" in name: return "Financial Services"
            if "IT" in name or "TECH" in name: return "Technology"
            if "PHARMA" in name or "HEALTH" in name: return "Healthcare"
            if "NIFTY" in name or "SENSEX" in name: return "Index Fund"
            return "ETF"

        # 3. MF Mapping
        if asset_type == AssetType.MF:
            if "ELSS" in name: return "Tax Saving"
            if "LIQUID" in name: return "Liquid Fund"
            if "SMALL" in name: return "Small Cap"
            if "MID" in name: return "Mid Cap"
            if "LARGE" in name or "BLUECHIP" in name: return "Large Cap"
            return "Mutual Fund"

        # 4. Keyword Fallback for Stocks (if API failed)
        if "BANK" in name or "FINANCE" in name: return "Financial Services"
        if "TECH" in name or "INFOSYS" in name or "TCS" in name: return "Technology"
        if "PHARMA" in name or "LAB" in name: return "Healthcare"
        if "AUTO" in name or "MOTORS" in name: return "Automotive"
        if "POWER" in name or "ENERGY" in name: return "Energy"
        if "FMCG" in name or "LTD" in name: return "Consumer Goods" # Broad fallback

        return "Others"

    def _infer_risk(self, asset_type: str, confidence: float) -> RiskCategory:
        if confidence < 0.5:
            return RiskCategory.HIGH
        if asset_type in {"ETF", "MF"}:
            return RiskCategory.MODERATE
        return RiskCategory.MODERATE

    def _infer_account_type(self, asset_type: AssetType, raw_name: str, isin: Optional[str]) -> AccountType:
        # Stocks and ETFs are always DEMAT
        if asset_type in {AssetType.STOCK, AssetType.ETF}:
            return AccountType.DEMAT
        
        # If ISIN is present for MF, it's 99% in a Demat account
        if isin:
            return AccountType.DEMAT
            
        # Keyword based fallback
        name = raw_name.upper()
        if " FOLIO" in name or "SOA" in name or "(SOA)" in name:
            return AccountType.SOA
            
        # Default for mutual funds without ISIN usually SOA
        if asset_type == AssetType.MF:
            return AccountType.SOA
            
        return AccountType.UNKNOWN


asset_service = AssetNormalizationService()


# ======================================
# Indian Asset Resolver (Authoritative)
# ======================================

# ISIN -> Yahoo symbol registry (highest priority)
ISIN_REGISTRY = {
    # ETFs
    "INF204KB14I2": {"symbol": "NIFTYBEES.NS", "type": "ETF"},
    "INF204KB17I5": {"symbol": "NIFTYBEES.NS", "type": "ETF"},
    "INF204KB17I6": {"symbol": "GOLDBEES.NS", "type": "ETF"},
    "INF204K01VG4": {"symbol": "JUNIORBEES.NS", "type": "ETF"},
    "INF204KB15I9": {"symbol": "BANKBEES.NS", "type": "ETF"},
    "INF0R8F01091": {"symbol": "LIQUIDBEES.NS", "type": "ETF"},
    "INF204KB13I4": {"symbol": "INFRABEES.NS", "type": "ETF"},
    # Major Indian Stocks (Nifty 50)
    "INE002A01018": {"symbol": "RELIANCE.NS", "type": "STOCK"},
    "INE009A01021": {"symbol": "INFY.NS", "type": "STOCK"},
    "INE040A01034": {"symbol": "HDFCBANK.NS", "type": "STOCK"},
    "INE467B01029": {"symbol": "TCS.NS", "type": "STOCK"},
    "INE669E01016": {"symbol": "IDEA.NS", "type": "STOCK"},
    "INE528G01035": {"symbol": "YESBANK.NS", "type": "STOCK"},
    "INE066F01012": {"symbol": "PAYTM.NS", "type": "STOCK"},
    "INE699H01024": {"symbol": "AWL.NS", "type": "STOCK"},
    "INE154A01025": {"symbol": "ITC.NS", "type": "STOCK"},
    "INE090A01021": {"symbol": "ICICIBANK.NS", "type": "STOCK"},
    "INE062A01020": {"symbol": "SBIN.NS", "type": "STOCK"},
    "INE397D01024": {"symbol": "BHARTIARTL.NS", "type": "STOCK"},
    "INE585B01010": {"symbol": "MARUTI.NS", "type": "STOCK"},
    "INE121A01024": {"symbol": "NTPC.NS", "type": "STOCK"},
    "INE115A01026": {"symbol": "ONGC.NS", "type": "STOCK"},
    "INE019A01038": {"symbol": "POWERGRID.NS", "type": "STOCK"},
    "INE030A01027": {"symbol": "HINDALCO.NS", "type": "STOCK"},
    "INE081A01020": {"symbol": "BPCL.NS", "type": "STOCK"},
    "INE001A01036": {"symbol": "HDFC.NS", "type": "STOCK"},
    "INE018A01030": {"symbol": "HCLTECH.NS", "type": "STOCK"},
    "INE028A01039": {"symbol": "BAJFINANCE.NS", "type": "STOCK"},
    "INE047A01021": {"symbol": "WIPRO.NS", "type": "STOCK"},
    "INE160A01022": {"symbol": "SIEMENS.NS", "type": "STOCK"},
    "INE752E01010": {"symbol": "POWERGRID.NS", "type": "STOCK"},
    "INE245A01021": {"symbol": "TATAMOTORS.NS", "type": "STOCK"},
    "INE081A01012": {"symbol": "DRREDDY.NS", "type": "STOCK"},
    "INE176A01028": {"symbol": "TATASTEEL.NS", "type": "STOCK"},
    "INE020B01018": {"symbol": "ADANIENT.NS", "type": "STOCK"},
    "INE742F01042": {"symbol": "ADANIPORTS.NS", "type": "STOCK"},
    "INE216A01030": {"symbol": "ULTRACEMCO.NS", "type": "STOCK"},
    "INE774D01024": {"symbol": "COALINDIA.NS", "type": "STOCK"},
    "INE848E01016": {"symbol": "HINDUNILVR.NS", "type": "STOCK"},
    "INE237A01028": {"symbol": "KOTAKBANK.NS", "type": "STOCK"},
    "INE775A01035": {"symbol": "AXISBANK.NS", "type": "STOCK"},
    "INE860A01027": {"symbol": "JSWSTEEL.NS", "type": "STOCK"},
    "INE117A01022": {"symbol": "ASIANPAINT.NS", "type": "STOCK"},
    "INE101A01026": {"symbol": "SUNPHARMA.NS", "type": "STOCK"},
    "INE042A01014": {"symbol": "TECHM.NS", "type": "STOCK"},
    "INE261F01026": {"symbol": "LT.NS", "type": "STOCK"},
    "INE092T01019": {"symbol": "SUZLON.NS", "type": "STOCK"},
}

ETF_NAME_PATTERNS = {
    "GOLDBEES": "GOLDBEES.NS",
    "GOLD BEES": "GOLDBEES.NS",
    "NIFTYBEES": "NIFTYBEES.NS",
    "NIFTY BEES": "NIFTYBEES.NS",
    "BANKBEES": "BANKBEES.NS",
    "LIQUID BEES": "LIQUIDBEES.NS",
    "JUNIOR BEES": "JUNIORBEES.NS",
    "INFRA BEES": "INFRABEES.NS",
}


class IndianAssetResolver:

    def resolve(self, raw_name: str, isin: Optional[str] = None) -> Dict[str, Any]:
        # 1. ISIN registry (absolute authority)
        if isin and isin in ISIN_REGISTRY:
            entry = ISIN_REGISTRY[isin]
            return {
                "symbol": entry["symbol"],
                "asset_type": entry["type"],
                "confidence": 1.0,
                "resolution_source": "ISIN_REGISTRY",
            }

        normalized = self._normalize_name(raw_name)

        # 2. Mutual fund detection (MUST come before ETF patterns!)
        # Check raw_name first to catch "MUTUAL FUND" before normalization removes it
        if self._is_mutual_fund(raw_name):
            return {
                "symbol": None,
                "asset_type": "MF",
                "confidence": 0.8,
                "resolution_source": "MF_HEURISTIC",
            }

        # 3. ETF name patterns
        for pattern, symbol in ETF_NAME_PATTERNS.items():
            if pattern in normalized:
                return {
                    "symbol": symbol,
                    "asset_type": "ETF",
                    "confidence": 0.9,
                    "resolution_source": "ETF_NAME_PATTERN",
                }

        # 4. Stock heuristic (STRICT)
        if self._is_valid_stock_symbol(normalized):
            symbol = normalized.split()[0] + ".NS"
            return {
                "symbol": symbol,
                "asset_type": "STOCK",
                "confidence": 0.6,
                "resolution_source": "STOCK_HEURISTIC",
            }

        # 5. Last resort: If it's not a MF or ETF, and has multiple words, it's likely a company (STOCK)
        if len(normalized.split()) > 1:
             return {
                "symbol": None, # Price via invested fallback or search
                "asset_type": "STOCK",
                "confidence": 0.4,
                "resolution_source": "FALLBACK_STOCK",
            }

        # 6. Unresolved
        return {
            "symbol": None,
            "asset_type": "UNKNOWN",
            "confidence": 0.0,
            "resolution_source": "UNRESOLVED",
        }

    # ---------- helpers ----------

    def _normalize_name(self, raw_name: str) -> str:
        # Multi-stage cleaning
        name = raw_name.upper()
        
        # Replace all whitespace (newlines, tabs, multiple spaces) with single space
        name = re.sub(r"\s+", " ", name).strip()

        # Remove 12-char ISINs more leniently
        name = re.sub(r"[A-Z]{2}[A-Z0-9]{10}", "", name)

        # Remove exchange suffixes
        name = name.replace(".NSE", "").replace(".NS", "")

        # Strip noise tokens but keep the core name
        # We want to keep "RELIANCE" and "INDUSTRIES"
        noise_tokens = [
            "ACCOUNT", "STATEMENT", "HOLDER",
            "TYPE", "SINGLE", "FOLIO", "DEMAT",
            "INDIAN", "INDIA", "CLIENT", "ID", "DP ID", "PAN:", "NAME"
        ]
        for token in noise_tokens:
            name = name.replace(token, "")

        # Final cleanup for punctuation and extra spaces
        name = re.sub(r'[^A-Z0-9\s]', '', name)
        name = re.sub(r"\s+", " ", name).strip()
        return name

    def _is_valid_stock_symbol(self, normalized: str) -> bool:
        # If it's a multi-word name like "RELIANCE INDUSTRIES", 
        # it's likely a STOCK if it doesn't match MF/ETF patterns.
        # We'll be more lenient here to ensure things like "RELIANCE" match.
        words = normalized.split()
        if not words:
            return False
        # If the first word looks like a potential symbol or the name is short
        return len(words[0]) >= 3

    def _is_mutual_fund(self, raw_name: str) -> bool:
        indicators = ["DIRECT", "REGULAR", "GROWTH", "DIVIDEND", "PLAN"]
        up = raw_name.upper()
        return any(i in up for i in indicators) or "MUTUAL" in up

    def _is_valid_stock_symbol(self, normalized: str) -> bool:
        return (
            normalized.isalpha()
            and 1 <= len(normalized) <= 12
            and " " not in normalized
        )


resolver = IndianAssetResolver()
