from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.features.conversion import router as conversion_router
from app.features.analytics import router as analytics_router
from loguru import logger

from app.db import Base, engine
import app.db.models  # noqa: F401 - ensure models are registered

app = FastAPI(title="ImageUpLift Service", version="0.1.0")


@app.on_event("startup")
def on_startup():
    # Create DB file/tables if they don't exist
    if engine.url.drivername.startswith("sqlite") and engine.url.database:
        db_path = Path(engine.url.database)
        db_path.parent.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)


# ✅ Log incoming origins for debugging
@app.middleware("http")
async def log_request_origin(request: Request, call_next):
    origin = request.headers.get("origin")
    method = request.method
    path = request.url.path
    logger.info(f"➡️  {method} {path} from Origin: {origin}")
    response = await call_next(request)
    return response


# ✅ Proper CORS — allow frontend on localhost:3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # For dev. You can later set ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ✅ Include feature routers
app.include_router(conversion_router.router)
app.include_router(analytics_router.router)


# ✅ Root endpoint
@app.get("/")
def read_root():
    return {"message": "Welcome to ImageUpLift Service API"}


# ✅ Health check
@app.get("/health")
def health_check():
    return {"status": "ok"}