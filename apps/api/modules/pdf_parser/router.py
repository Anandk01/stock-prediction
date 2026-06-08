from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import List
import logging
import pdfplumber
from io import BytesIO
from .service import PDFParserService
from modules.auth.router import get_current_user
from core.database import get_db_path
from modules.pdf_parser.format_detector import CASFormatDetector
import aiosqlite
import json
from datetime import datetime

router = APIRouter()
pdf_service = PDFParserService()
logger = logging.getLogger(__name__)


@router.post("/extract")
async def extract_holdings(file: UploadFile = File(...), current_user=Depends(get_current_user)):
    """
    Parse PDF and save to temporary ParsedPortfolio table.
    Returns parsed holdings with confidence score for user review.
    """
    logger.info(f"Received file upload request for: {file.filename}")
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail=f"Only PDF files allowed. Received: {file.filename}")

    try:
        content = await file.read()

        # Extract full text for format detection
        with pdfplumber.open(BytesIO(content)) as pdf:
            full_text = "\n".join([page.extract_text() or "" for page in pdf.pages])

        # Detect CAS format
        format_type, format_confidence = CASFormatDetector.detect_format(full_text)
        logger.info(f"Detected format: {format_type} (confidence: {format_confidence})")

        # Extract CAS total from header
        cas_total = CASFormatDetector.extract_cas_total(full_text, format_type)
        logger.info(f"CAS total from header: ₹{cas_total}")

        # Parse holdings
        holdings = await pdf_service.extract_holdings_from_pdf(content)

        if not holdings:
            raise HTTPException(status_code=400, detail="No holdings found in PDF")

        # Calculate extracted total
        extracted_total = sum(h.get("invested_value", 0) for h in holdings)
        logger.info(f"Extracted total: ₹{extracted_total}")

        # Calculate parsing confidence
        confidence = CASFormatDetector.calculate_confidence(cas_total, extracted_total)
        logger.info(f"Parsing confidence: {confidence}")

        # Save to parsed_portfolios table
        db_path = get_db_path()
        now = datetime.utcnow().isoformat()

        async with aiosqlite.connect(db_path) as db:
            # Delete existing parsed portfolio for this user
            await db.execute(
                "DELETE FROM parsed_portfolios WHERE user_id = ?",
                (current_user.id,)
            )
            # Insert new
            await db.execute(
                """INSERT INTO parsed_portfolios 
                   (user_id, holdings, cas_total, extracted_total, confidence, format_type, status, created_at) 
                   VALUES (?, ?, ?, ?, ?, ?, 'parsed', ?)""",
                (current_user.id, "[]", cas_total, extracted_total, confidence, format_type, now)
            )
            await db.commit()

        return {
            "status": "parsed",
            "holdings": holdings,
            "cas_total": cas_total,
            "extracted_total": extracted_total,
            "confidence": confidence,
            "format_type": format_type,
            "count": len(holdings)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF extraction failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"PDF extraction failed: {str(e)}")
