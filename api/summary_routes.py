from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from utils.ai_summary import generate_summary

summary_router = APIRouter(prefix="/summary", tags=["summary"])

class AlertItem(BaseModel):
    product: str
    type: str
    severity: float

class SummaryRequest(BaseModel):
    model: Optional[str] = "Unknown"
    accuracy: Optional[float] = None
    trend: Optional[str] = "Unknown"
    top_alerts: Optional[List[AlertItem]] = []
    top_product: Optional[str] = "Unknown"
    top_category: Optional[str] = "Unknown"

@summary_router.post("/generate")
def generate_ai_summary(request: SummaryRequest):
    payload = request.dict()
    return generate_summary(payload)
