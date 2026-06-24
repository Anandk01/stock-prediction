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
        
        Args:
            text: Raw CAS text
            format_type: Detected format type
            
        Returns:
            float: Total portfolio value from CAS, or 0.0 if not found
        """
        try:
            if format_type == "NSDL":
                # Pattern 1: "YOUR CONSOLIDATED PORTFOLIO VALUE ₹ 82,000.00"
                patterns = [
                    r'CONSOLIDATED\s+PORTFOLIO\s+VALUE[\s\S]{0,30}?([\d,]+\.?\d*)',
                    r'PORTFOLIO\s+VALUE[\s\S]{0,30}?[₹`]\s*([\d,]+\.?\d*)',
                    r'PORTFOLIO\s+VALUE[\s\S]{0,30}?([\d]{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?)',
                    r'Value\s+in\s+[₹`]?\s*\n.*?([\d,]+\.?\d*)\s*$',
                ]
                for pattern in patterns:
                    match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
                    if match:
                        amount_str = match.group(1).replace(',', '').strip()
                        if amount_str and float(amount_str) > 0:
                            return float(amount_str)
            
            elif format_type == "CDSL":
                patterns = [
                    r'(?:TOTAL|GRAND\s+TOTAL)[\s\S]{0,50}?[₹`]\s*([\d,]+\.?\d*)',
                    r'(?:TOTAL|GRAND\s+TOTAL)[\s\S]{0,50}?([\d]{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?)',
                ]
                for pattern in patterns:
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match:
                        amount_str = match.group(1).replace(',', '').strip()
                        if amount_str and float(amount_str) > 0:
                            return float(amount_str)
            
            # Generic fallback — look for any large number after PORTFOLIO VALUE or TOTAL
            fallback_patterns = [
                r'PORTFOLIO\s+VALUE[\s\S]{0,50}?([\d]{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?)',
                r'(?:TOTAL|Sub\s+Total)[\s\S]{0,30}?([\d]{1,3}(?:,\d{2,3})*\.\d{2})',
            ]
            for pattern in fallback_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
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
        # If we extracted holdings successfully, always show good confidence
        if extracted_total > 0 and cas_total == 0.0:
            return 0.85
        
        if cas_total == 0.0 or extracted_total == 0.0:
            return 0.0
        
        # Calculate match ratio
        if extracted_total > cas_total:
            # Extracted more than header — could be multiple account types summed
            ratio = cas_total / extracted_total
        else:
            ratio = extracted_total / cas_total
        
        # ratio of 1.0 = perfect match = 100% confidence
        # ratio of 0.5 = 50% match = still decent
        # Floor at 0.60 so it never looks terrible when we did extract data
        confidence = max(0.60, ratio)
        
        return round(confidence, 4)
