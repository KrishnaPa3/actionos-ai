def normalize_extraction(data: dict) -> dict:
    """
    Normalize LLM output into the schema expected by ExtractionResult.
    This makes the pipeline resilient to small variations in model output.
    """

    # -------------------------
    # SUMMARY
    # -------------------------

    summary = data.get("summary", [])

    if isinstance(summary, str):
        summary = [summary]

    data["summary"] = summary

    # -------------------------
    # TASKS
    # -------------------------

    tasks = []

    for task in data.get("tasks", []):

        if not isinstance(task, dict):
            task = {
                "task": str(task)
            }

        normalized = {

            "task": task.get("task")
                    or task.get("title")
                    or "",

            "owner": task.get("owner", "Unknown"),

            "due_text": task.get("due_text"),

            "due_date_iso": (
                task.get("due_date_iso")
                or task.get("due_date")
            ),

            "priority": (
                task.get("priority", "medium")
                .lower()
            ),

            "confidence": task.get("confidence", 0.8),

            "due_confidence": task.get(
                "due_confidence",
                0.0
            )

        }

        tasks.append(normalized)

    data["tasks"] = tasks

    # -------------------------
    # ACTION PLANS
    # -------------------------

    if "action_plan" in data and "action_plans" not in data:

        action_plan = data["action_plan"]

        if isinstance(action_plan, dict):

            data["action_plans"] = [action_plan]

        elif isinstance(action_plan, list):

            data["action_plans"] = action_plan

    action_plans = []

    for plan in data.get("action_plans", []):

        if not isinstance(plan, dict):
            continue

        steps = []

        for step in plan.get("steps", []):

            if isinstance(step, dict):

                steps.append({

                    "step": step.get("step", ""),

                    "owner": step.get("owner")

                })

            else:

                steps.append({

                    "step": str(step),

                    "owner": None

                })

        action_plans.append({

            "objective": (
                plan.get("objective")
                or plan.get("title")
                or ""
            ),

            "steps": steps,

            "confidence": plan.get(
                "confidence",
                0.8
            )

        })

    data["action_plans"] = action_plans

    # -------------------------
    # DECISIONS
    # -------------------------

    decisions = []

    for decision in data.get("decisions", []):

        if not isinstance(decision, dict):
            continue

        decisions.append({

            "title": decision.get("title", ""),

            "reason": decision.get("reason", ""),

            "confidence": decision.get(
                "confidence",
                0.8
            )

        })

    data["decisions"] = decisions

    # -------------------------
    # RISKS
    # -------------------------

    risks = []

    for risk in data.get("risks", []):

        if not isinstance(risk, dict):
            continue

        risks.append({

            "title": risk.get("title", ""),

            "impact": risk.get("impact", ""),

            "mitigation": risk.get(
                "mitigation",
                "Unknown"
            ),

            "risk_score": risk.get(
                "risk_score",
                50
            ),

            "confidence": risk.get(
                "confidence",
                0.8
            )

        })

    data["risks"] = risks

    return data