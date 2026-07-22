"""
Notion integration endpoints.
"""

from fastapi import APIRouter, Depends

from dependencies.notion import get_notion_service

router = APIRouter()


@router.get("/notion/status")
async def notion_status(notion_service=Depends(get_notion_service)):
    return notion_service.get_status()


@router.get("/notion/database")
async def notion_database(notion_service=Depends(get_notion_service)):
    return notion_service.get_database()
