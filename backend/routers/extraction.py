"""
Standalone extraction endpoint (extract structured data from an
arbitrary transcript, independent of the upload pipeline).
"""

from fastapi import APIRouter, Depends

from dependencies.auth import get_current_user
from schemas.requests import ExtractRequest
from services.extraction_service import extract_structured_data

router = APIRouter()


@router.post("/extract")
async def extract_text(request: ExtractRequest, user=Depends(get_current_user)):
    if not request.transcript.strip():
        return {
            "summary": [],
            "tasks": [],
            "action_plans": [],
            "decisions": [],
            "risks": [],
        }

    return extract_structured_data(
        transcript=request.transcript,
        meeting_datetime=request.meeting_datetime,
    )
