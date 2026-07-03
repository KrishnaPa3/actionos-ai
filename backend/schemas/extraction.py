from typing import List, Optional

from pydantic import BaseModel, Field


class Task(BaseModel):
    task: str
    owner: str

    # Original natural language spoken by the user
    due_text: Optional[str] = None

    # AI-resolved ISO datetime
    due_date_iso: Optional[str] = None

    priority: str

    # Confidence that this is a valid task
    confidence: float = Field(ge=0.0, le=1.0)

    # Confidence that the due date was resolved correctly
    due_confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class Reminder(BaseModel):
    title: str
    owner: str

    # Original natural language
    due_text: Optional[str] = None

    # AI-resolved ISO datetime
    due_date_iso: Optional[str] = None

    due_confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class ActionPlan(BaseModel):
    title: str
    owner: str
    steps: List[str]


class ExtractionResult(BaseModel):
    summary: List[str]

    tasks: List[Task]

    reminders: List[Reminder]

    action_plans: List[ActionPlan]

    decisions: List[str]

    risks: List[str]