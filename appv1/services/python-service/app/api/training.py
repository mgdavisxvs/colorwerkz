from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/training")

class TrainingJobRequest(BaseModel):
    model_id: str

class TrainingJobResponse(BaseModel):
    job_id: str
    status: str

@router.post("/start", response_model=TrainingJobResponse)
def start_job(req: TrainingJobRequest):
    return TrainingJobResponse(job_id="job_placeholder", status="queued")
