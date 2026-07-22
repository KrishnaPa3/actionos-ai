"""
Request schemas.

Moved verbatim out of main.py - field names, types, and defaults are
unchanged, so request validation behaviour (and therefore frontend
compatibility) is identical.
"""

from datetime import datetime

from pydantic import BaseModel


class ExtractRequest(BaseModel):
    transcript: str
    meeting_datetime: datetime


class RenameMeetingRequest(BaseModel):
    meeting_name: str


class UpdateActionRequest(BaseModel):
    title: str
    owner: str
    due_date: str | None = None
    priority: str
    description: str | None = None


class UpdateRiskRequest(BaseModel):
    title: str
    impact: str | None = None
    mitigation: str | None = None
    risk_score: int


class UpdateDecisionRequest(BaseModel):
    title: str
    reason: str | None = None
    confidence: float


class ReminderCreate(BaseModel):
    label: str
    reminder_time: str


class ReminderUpdate(BaseModel):
    reminder_time: str


class SnoozeRequest(BaseModel):
    duration: str
    custom_time: str | None = None
