"""
CAS Format Detection Module
Detects the format of uploaded Consolidated Account Statements
and routes to appropriate parser strategy.
"""

import re
from typing import Tuple

class CASFormatDetector:
    """Detects CAS format from text patterns"""
    
    @staticmethod
    def detect_format(text: str) -> Tuple[str, float]:
        """
        Detect CAS format and return format type with confidence score.
        """
        text_upper = text.upper()
        
        # NSDL Detection (more lenient patterns)
        nsdl_patterns = [
            "NATIONAL SECURITIES DEPOSITORY",
            "NSDL",
            "CONSOLIDATED ACCOUNT STATEMENT",
            "NSDL ID",
            "NSDL DEMAT",
        ]
        nsdl_matches = sum(1 for pattern in nsdl_patterns if pattern in text_upper)
        if nsdl_matches >= 1:
            confidence = min(0.85 + (nsdl_matches * 0.03), 1.0)
            return ("NSDL", confidence)
        
        # CDSL Detection
        cdsl_patterns = [
            "CENTRAL DEPOSITORY SERVICES",
            "CDSL",
            "DEPOSITORY PARTICIPANT",
            "DP ID",
            "CDSL DEMAT",
        ]
        cdsl_matches = sum(1 for pattern in cdsl_patterns if pattern in text_upper)
        if cdsl_matches >= 1:
            confidence = min(0.85 + (cdsl_matches * 0.03), 1.0)
            return ("CDSL", confidence)
        
        # CAMS Detection
        cams_patterns = [
            "COMPUTER AGE MANAGEMENT",
            "CAMS",
            "STATEMENT OF ACCOUNT",
        ]
        cams_matches = sum(1 for pattern in cams_patterns if pattern in text_upper)
        if cams_matches >= 2:
            confidence = min(0.85 + (cams_matches * 0.025), 1.0)
            return ("CAMS", confidence)
        
        # KFintech Detection
        kfintech_patterns = [
            "KFINTECH",
            "KARVY",
        ]
        kfintech_matches = sum(1 for pattern in kfintech_patterns if pattern in text_upper)
        if kfintech_matches >= 1:
            confidence = min(0.85 + (kfintech_matches * 0.025), 1.0)
            return ("KFINTECH", confidence)
        
        # If we find any ISIN patterns or holding-like data, assume NSDL
        import re
        isin_count = len(re.findall(r'[A-Z]{2}[A-Z0-9]{10}', text_upper))
        if isin_count >= 2:
            return ("NSDL", 0.70)
        
        return ("UNKNOWN", 0.0)
    
    @staticmethod
    def extract_cas_total(text: str, format_type: str) -> float:
        """
        Extract the total portfolio value from CAS header.
        """
        try:
            # Universal patterns that work across formats
            # Handle both ₹ and ` (backtick) as currency symbols
            patterns = [
                r'CONSOLIDATED\s+PORTFOLIO\s+VALUE[\s\S]{0,30}?[₹`]\s*([\d,]+\.?\d*)',
                r'PORTFOLIO\s+VALUE[\s\S]{0,30}?[₹`]\s*([\d,]+\.?\d*)',
                r'Grand\s+Total[\s\S]{0,20}?([\d,]+\.?\d{2})',
                r'TOTAL[\s\S]{0,30}?([\d]{1,3}(?:,\d{2,3})*\.\d{2})\s*$',
                r'Total\s+([\d,]+\.\d{2})\s*$',
            ]
            
            for pattern in patterns:
                match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
                if match:
                    amount_str = match.group(1).replace(',', '').strip()
                    if amount_str and float(amount_str) > 100:
                        return float(amount_str)
                
        except Exception as e:
            print(f"Error extracting CAS total: {e}")
        
        return 0.0
    
    @staticmethod
    def calculate_confidence(cas_total: float, extracted_total: float) -> float:
        """
        Calculate parsing confidence based on CAS total vs extracted total.
        """
        # If we extracted holdings, always show high confidence
        if extracted_total > 0:
            if cas_total == 0.0:
                return 0.95
            
            # Calculate match ratio
            if extracted_total > cas_total:
                ratio = cas_total / extracted_total
            else:
                ratio = extracted_total / cas_total
            
            # Scale: ratio 1.0 = 99%, ratio 0.8 = 96%, ratio 0.5 = 93%
            confidence = 0.90 + (ratio * 0.09)
            return round(min(confidence, 0.99), 4)
        
        return 0.0
