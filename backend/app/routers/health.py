from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    status: str
    application: str
    version: str


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Return system health status and application metadata."""
    return HealthResponse(
        status="ok",
        application="ComplianceX",
        version="0.1.0",
    )
