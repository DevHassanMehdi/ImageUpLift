from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException
from app.features.conversion import router as conversion_router
from app.features.analytics import router as analytics_router
from loguru import logger

from app.db import Base, engine
import app.db.models  # noqa: F401 - ensure models are registered

app = FastAPI(title="ImageUpLift Service", version="0.1.0")
REPO_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_BUILD_DIR = REPO_ROOT / "frontend" / "build"


class SPAStaticFiles(StaticFiles):
    """
    Serve the React build and fall back to index.html for client-side routes.
    """

    async def get_response(self, path, scope):
        try:
            return await super().get_response(path, scope)
        except HTTPException as exc:
            if exc.status_code == 404:
                return await super().get_response("index.html", scope)
            raise


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


# ✅ API root endpoint
@app.get("/api")
def read_root():
    return {"message": "Welcome to ImageUpLift Service API"}


# ✅ Health check
@app.get("/health")
def health_check():
    return {"status": "ok"}


if FRONTEND_BUILD_DIR.exists():
    app.mount("/", SPAStaticFiles(directory=FRONTEND_BUILD_DIR, html=True), name="frontend")
else:
    logger.warning(
        f"Frontend build directory not found at {FRONTEND_BUILD_DIR}. "
        "Run `npm run build` inside frontend/ to serve the UI."
    )
