from fastapi import APIRouter

router = APIRouter(prefix="/conversion", tags=["Conversion"])

@router.get("/")
def get_conversion_info():
    return {"message": "This is the conversion feature endpoint."}
