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

class Risk(BaseModel):
    title: str

    impact: str

    mitigation: str

    risk_score: int = Field(ge=0, le=100)

    confidence: float = Field(ge=0.0, le=1.0)

class Decision(BaseModel):
    title: str
    reason: str = ""
    confidence: float = 0.0

class ActionStep(BaseModel):
    step: str
    owner: str | None = None
class ActionPlan(BaseModel):
    objective: str
    steps: list[ActionStep]
    confidence: float


class ExtractionResult(BaseModel):
    summary: List[str]

    tasks: List[Task]

    action_plans: List[ActionPlan]

    decisions: List[Decision] = Field(default_factory=list)

    risks: List[Risk] = Field(default_factory=list)