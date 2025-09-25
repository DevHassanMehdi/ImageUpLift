from fastapi import FastAPI
from app.features.conversion import router as conversion_router

app = FastAPI(title="Bitmap to Vector Conversion Service", version="0.1.0")

# Include feature routers
app.include_router(conversion_router.router)

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Welcome to Bitmap-to-Vector Conversion Service API"}

# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "ok"}


