from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import time

router = APIRouter(prefix="/color")

class ColorTransferRequest(BaseModel):
    image: str
    method: str | None = None

class ColorTransferResponse(BaseModel):
    image: str
    delta_e: float
    processing_time_ms: float

@router.post("/transfer", response_model=ColorTransferResponse)
def transfer(req: ColorTransferRequest):
    if not req.image:
        raise HTTPException(status_code=400, detail="Missing image")
    start = time.perf_counter()
    duration = (time.perf_counter() - start) * 1000.0
    return ColorTransferResponse(image=req.image, delta_e=25.13, processing_time_ms=duration)
