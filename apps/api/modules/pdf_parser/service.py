import pdfplumber
import pytesseract
from PIL import Image
import io
import re
from typing import List, Dict, Any
from core.config import settings

# Configure Tesseract Path if provided (User's E: drive preference logic handled via config)
if settings.TESSERACT_CMD_PATH:
    pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD_PATH

import csv
import os
from datetime import datetime

class PDFParserService:
    
    def __init__(self):
        # Create debug directory for raw extracts
        self.debug_dir = os.path.join(os.getcwd(), "data", "debug", "raw_extracts")
        os.makedirs(self.debug_dir, exist_ok=True)

    async def extract_holdings_from_pdf(self, file_content: bytes) -> List[Dict[str, Any]]:
        """
        Main entry point. Determines strategy (Text vs OCR) and extracts data.
        """
        holdings = []
        
        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
            # simple heuristic: check if first page has text
            first_page_text = pdf.pages[0].extract_text()
            
            if first_page_text and len(first_page_text.strip()) > 50:
                print("Text PDF detected.")
                holdings = self._extract_via_text(pdf)
            else:
                print("Scanned PDF detected. Attempting OCR.")
                holdings = self._extract_via_ocr(pdf)
        
        # SAVE TO CSV FOR AUDITABILITY
        if holdings:
            csv_path = self._save_to_csv(holdings)
            print(f"AUDIT LOG: Raw extraction saved to {csv_path}")
                
        return holdings

    def _save_to_csv(self, holdings: List[Dict[str, Any]]) -> str:
        """Saves extracted data to a CSV for debugging/transparency."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"extract_{timestamp}.csv"
        filepath = os.path.join(self.debug_dir, filename)
        
        if not holdings: return filepath
        
        keys = holdings[0].keys()
        with open(filepath, 'w', newline='', encoding='utf-8') as f:
            dict_writer = csv.DictWriter(f, fieldnames=keys)
            dict_writer.writeheader()
            dict_writer.writerows(holdings)
            
        return filepath

    def _extract_via_text(self, pdf) -> List[Dict[str, Any]]:
        """
        Primary extraction: tries table-based parsing first.
        Falls back to text-line parsing if tables yield no data rows
        (common with NSDL CAS PDFs where holdings are in free text).
        """
        extracted_data = []

        # --- Pass 1: table-based ---
        for page in pdf.pages:
            tables = page.extract_tables()
            for table in tables:
                parsed_rows = self._parse_table(table)
                extracted_data.extend(parsed_rows)

        if extracted_data:
            return extracted_data

        # --- Pass 2: text-line fallback (NSDL / free-text CAS format) ---
        print("INFO: Table extraction yielded no holdings. Falling back to text-line parser.")
        full_text = "\n".join([page.extract_text() or "" for page in pdf.pages])
        extracted_data = self._extract_via_text_lines(full_text)
        return extracted_data

    def _extract_via_text_lines(self, text: str) -> List[Dict[str, Any]]:
        """
        Parse holdings from free-form text as produced by NSDL CAS PDFs.

        NSDL text layout (per holding block):
            INE002A01018           ← ISIN line
            RELIANCE INDUSTRIES LTD  45  1,520.00  68,400.00
            RELIANCE               ← ticker (optional, ignored)

        OR for Mutual Funds:
            INF209K01234  Parag Parikh Flexi Cap Fund  500.25  65.40  32,716.35

        Strategy:
          1. Find every ISIN (12-char pattern) in the text.
          2. Parse the same or next non-empty line for name + numbers.
        """
        isin_pattern = re.compile(r'\b([A-Z]{2}[A-Z0-9]{10})\b')
        # Matches 1–4 numbers (possibly with commas/decimals) at end of a line
        numbers_pattern = re.compile(r'([\d,]+\.?\d*)')

        lines = [l.strip() for l in text.splitlines()]
        results = []
        seen_isins = set()

        i = 0
        while i < len(lines):
            line = lines[i]
            m = isin_pattern.search(line)

            if m:
                isin = m.group(1)
                if isin in seen_isins:
                    i += 1
                    continue
                seen_isins.add(isin)

                # The data could be on the SAME line (MF style) or NEXT line (equity style)
                # Try same line first: after the ISIN there should be name + numbers
                rest_of_line = line[m.end():].strip()
                nums_on_same = numbers_pattern.findall(rest_of_line)

                if len(nums_on_same) >= 2:
                    # Same-line format: INF... Scheme Name  500.25  65.40  32716.35
                    name_part = numbers_pattern.split(rest_of_line)[0].strip()
                    asset_name = name_part if name_part else isin
                    numbers = [self._parse_float(n) for n in nums_on_same]
                    quantity = numbers[0]
                    # Last number is usually Value; second-to-last is NAV/Price
                    value = numbers[-1]
                else:
                    # Next-line format: ISIN on one line, data on next
                    asset_name = isin  # fallback
                    quantity = 0.0
                    value = 0.0

                    # Look ahead for the data line (skip blank lines, max 2 ahead)
                    for offset in range(1, 3):
                        if i + offset >= len(lines):
                            break
                        next_line = lines[i + offset].strip()
                        if not next_line:
                            continue
                        nums = numbers_pattern.findall(next_line)
                        if len(nums) >= 2:
                            # Extract name: everything before first number
                            name_part = numbers_pattern.split(next_line)[0].strip()
                            if name_part:
                                asset_name = name_part
                            numbers = [self._parse_float(n) for n in nums]
                            quantity = numbers[0]
                            value = numbers[-1]
                            i += offset  # skip the consumed lines
                            break

                # Skip junk (header repeats, zero rows)
                junk_keywords = ['isin', 'symbol', 'scheme', 'company name',
                                  'security name', 'units', 'nav', 'shares',
                                  'price', 'value', 'total', 'grand total']
                if any(k in asset_name.lower() for k in junk_keywords):
                    i += 1
                    continue

                if quantity == 0.0 and value == 0.0:
                    i += 1
                    continue

                print(f"DEBUG [text-line]: ISIN={isin}, Name={asset_name}, Qty={quantity}, Value={value}")
                results.append({
                    "raw_name": asset_name,
                    "isin": isin,
                    "quantity": quantity,
                    "invested_value": value
                })

            i += 1

        return results

    def _extract_via_ocr(self, pdf) -> List[Dict[str, Any]]:
        """
        Fallback for scanned PDFs. Converts pages to images and uses Tesseract.
        """
        extracted_data = []
        try:
            for page in pdf.pages:
                # Convert PDF page to image
                # Note: pdfplumber has .to_image() which requires Wand or similar, 
                # but standard approach often uses 'pdf2image'. 
                # For this snippet, assuming pdfplumber's image extraction or basic text fallback.
                # Since 'pdf2image' requires poppler which is a heavy external dep, 
                # we will try to use pdfplumber's native image handling if possible or warn.
                
                # IMPORTANT: In a real scenario, we'd use 'pdf2image' here. 
                # For this prototype, we'll try to extract text from the page image object if available
                # Or just return empty and warn the user they need a text-based PDF for this version 
                # unless they have the heavy image pipelines set up.
                
                # Simplified OCR stub for this environment:
                # We simply try to text-extract again with OCR enabled logic if we had the image tools.
                print("WARNING: OCR is not fully implemented in this prototype environment. Scanned PDFs may fail to extract data.")
                pass
        except Exception as e:
            print(f"OCR Failed: {e}")
            
        return extracted_data

    def _parse_table(self, table: List[List[str]]) -> List[Dict[str, Any]]:
        """
        Normalize table rows into structured dicts.
        Heuristics: Look for columns like 'Script', 'Security', 'Unit', 'Qty', 'Buy', 'Invested'.
        """
        headers = []
        data_rows = []
        
        # 1. Identify Header Row
        header_idx = -1
        keywords = ['script', 'security', 'symbol', 'fund name', 'description', 'isin', 'instruments', 'folio']
        for i, row in enumerate(table):
            # clean None values
            row_text = [str(c).lower() if c else "" for c in row]
            # Check for common header keywords using substring match
            if any(k in cell for cell in row_text for k in keywords):
                headers = row_text
                header_idx = i
                break
        
        if header_idx == -1:
            if table and len(table) > 0:
                print(f"WARNING: No header row found in table. First row: {table[0]}")
            return []
        
        print(f"DEBUG: Found headers at row {header_idx}: {headers}")

        col_map = {}
        for idx, col_name in enumerate(headers):
            # 1. Name/Security identification
            if any(k in col_name for k in ['script', 'security', 'fund', 'symbol', 'description', 'company']):
                col_map['name'] = idx
            
            # 2. ISIN identification (can be same column as name)
            if 'isin' in col_name:
                col_map['isin'] = idx

            # 3. Units/Quantity (prioritize 'bal' or 'units' specifically for MFs)
            if any(k in col_name for k in ['no. of', 'qty', 'unit', 'quantity', 'bal', 'balance', 'shares']):
                # If we already have a units col, but this one says "shares" or "units" explicitly, prefer it
                if 'units' not in col_map or 'units' in col_name or 'shares' in col_name:
                    col_map['units'] = idx

            # 4. Values (Invested or Current)
            if any(k in col_name for k in ['value', 'market', 'amt', 'invested', 'price', 'cost']):
                if 'invested' in col_name or 'cost' in col_name:
                    col_map['invested'] = idx
                elif 'current' in col_name or 'market' in col_name or ('value' in col_name and 'invested' not in col_name):
                    col_map['current'] = idx
        
        print(f"DEBUG: Column mapping: {col_map}")
                    
        # 3. Extract Data
        valid_rows = []
        for i in range(header_idx + 1, len(table)):
            row = table[i]
            if not row or all(c is None for c in row): continue
            
            try:
                name_idx = col_map.get('name')
                units_idx = col_map.get('units')
                inv_idx = col_map.get('invested')
                curr_idx = col_map.get('current')
                isin_idx = col_map.get('isin')

                if name_idx is not None and row[name_idx]:
                    # Normalize whitespace and newlines completely
                    asset_name = re.sub(r'\s+', ' ', str(row[name_idx])).strip()
                    
                    # skip header repetitions or junk
                    blacklist = [
                        'script', 'total', 'page',
                        'demat', 'folio', 'pan:', 'statement',
                        'summary', 'report', 'as on', 'account type'
                    ]
                    # Note: 'nsdl', 'cdsl', 'security', 'description', 'account' removed —
                    # these strings legitimately appear in company/fund names.
                    if any(b in asset_name.lower() for b in blacklist): continue 
                    
                    units = self._parse_float(row[units_idx]) if units_idx is not None else 0.0
                    inv_val = self._parse_float(row[inv_idx]) if inv_idx is not None else 0.0
                    if curr_idx is not None and inv_val == 0.0:
                        inv_val = self._parse_float(row[curr_idx]) # Fallback to current if invested is 0
                    
                    # FILTER: If both units and value are 0, it's definitely junk/metadata
                    if units == 0.0 and inv_val == 0.0:
                        continue

                    # ISIN Extraction (try from isin_idx or from name if combined)
                    # Using a more lenient 12-char pattern [A-Z]{2}[A-Z0-9]{10}
                    isin_pattern = r'[A-Z]{2}[A-Z0-9]{10}'
                    isin = None
                    if isin_idx is not None and row[isin_idx]:
                        isin_str = str(row[isin_idx]).upper()
                        match = re.search(isin_pattern, isin_str)
                        if match:
                            isin = match.group(0)
                    
                    # Fallback to extracting from name if not found in isin column
                    if not isin:
                        match = re.search(isin_pattern, asset_name.upper())
                        if match:
                            isin = match.group(0)
                    
                    print(f"DEBUG: Extracted row - Name: {asset_name}, ISIN: {isin}, Units: {units}, Value: {inv_val}")
                    
                    valid_rows.append({
                        "raw_name": asset_name,
                        "isin": isin,
                        "quantity": units,
                        "invested_value": inv_val
                    })
            except Exception as e:
                print(f"Row parse error: {e}")
                continue
                
        return valid_rows

    def _parse_float(self, value: Any) -> float:
        if not value: return 0.0
        # Remove currency symbols, commas
        # Remove common currency identifiers
        clean = str(value).replace(',', '').replace('Rs.', '').replace('Rs', '').strip()
        # Remove any remaining non-numeric characters except decimal
        clean = re.sub(r'[^\d.]', '', clean)
        try:
            return round(float(clean), 4)
        except:
            return 0.0

pdf_service = PDFParserService()

