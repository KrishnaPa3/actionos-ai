from pydantic import BaseModel
from typing import List, Optional

class Task(BaseModel):
    title: str
    owner: Optional[str] = None
    due_date: Optional[str] = None
    priority: str = "medium"
    confidence: float

class Reminder(BaseModel):
    title: str
    remind_at: str
    confidence: float

class ActionPlan(BaseModel):
    goal: str
    steps: List[str]

class Decision(BaseModel):
    title: str
    reason: str = ""
    confidence: float = 0.0

class ExtractionResult(BaseModel):
    tasks: List[Task]
    action_plans: List[ActionPlan]
    summary: List[str]
    decisions: List[str]
    risks: List[str]

class TranscriptRequest(BaseModel):
    transcript: str