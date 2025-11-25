from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.features.conversion import router as conversion_router
from loguru import logger

from app.db import Base, engine
import app.models

app = FastAPI(title="ImageUpLift Service", version="0.1.0")


@app.on_event("startup")
def on_startup():
    # Creates the conversions table if it doesn't exist
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

# ✅ Robust CORS Middleware (allow all during dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for dev only; restrict later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Include feature routers
app.include_router(conversion_router.router)

# ✅ Root endpoint
@app.get("/")
def read_root():
    return {"message": "Welcome to ImageUpLift Service API"}

# ✅ Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "ok"}

# ✅ Optional fallback for OPTIONS (just in case)
@app.options("/{rest_of_path:path}")
async def preflight_handler():
    return JSONResponse({"message": "Preflight handled globally"}, status_code=200)
