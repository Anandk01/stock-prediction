import logging
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from core.config import settings
from core.database import init_db
import traceback

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Import module routers
from modules.pdf_parser.router import router as pdf_router
from modules.asset_resolver.router import router as asset_router
from modules.market_data.router import router as market_router
from modules.analytics.router import router as analytics_router, stocks_router
from modules.ai_insights.router import router as insights_router
from modules.auth.router import router as auth_router
from modules.portfolio.router import router as portfolio_router
from modules.intelligence.router import router as intelligence_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Profolio AI Backend...")
    await init_db()
    logger.info("Database initialized (SQLite)")
    yield
    # Shutdown
    logger.info("Shutting down...")


app = FastAPI(
    title="Profolio AI API",
    version="1.0.0",
    lifespan=lifespan
)


# 1. Request Size Limit Middleware (10MB)
@app.middleware("http")
async def limit_upload_size(request: Request, call_next):
    if request.method == "POST":
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                size = int(content_length)
                if size > 10 * 1024 * 1024:  # 10MB
                    return JSONResponse(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        content={"detail": "File too large. Maximum size is 10MB."}
                    )
            except ValueError:
                pass
    response = await call_next(request)
    return response


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register module routers
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(portfolio_router, prefix="/api/portfolio", tags=["portfolio"])
app.include_router(pdf_router, prefix="/api/pdf-parser", tags=["pdf-parser"])
app.include_router(asset_router, prefix="/api/asset-resolver", tags=["asset-resolver"])
app.include_router(market_router, prefix="/api/market-data", tags=["market-data"])
app.include_router(analytics_router, prefix="/api/analytics", tags=["analytics"])
app.include_router(stocks_router, prefix="/api/stocks", tags=["stocks"])
app.include_router(insights_router, prefix="/api/ai-insights", tags=["ai-insights"])
app.include_router(intelligence_router, prefix="/api/intelligence", tags=["intelligence"])


@app.get("/")
async def root():
    return {"message": "Portfolio AI API v1.0", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"}
    )
