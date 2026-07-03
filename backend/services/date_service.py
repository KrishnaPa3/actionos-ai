from datetime import datetime, timedelta, time
import calendar
import re

import dateparser


DEFAULT_EOD = time(17, 0)


def _has_explicit_time(text: str) -> bool:
    """
    Returns True if the user explicitly mentioned a time.
    """

    text = text.lower()

    patterns = [

        r"\b\d{1,2}:\d{2}\b",      # 10:30

        r"\b\d{1,2}\s?(am|pm)\b",  # 3pm

        r"\b\d{1,2}:\d{2}\s?(am|pm)\b",

        r"\bnoon\b",

        r"\bmidnight\b",

        r"\bmorning\b",

        r"\bafternoon\b",

        r"\bevening\b",

        r"\bnight\b"

    ]

    return any(
        re.search(pattern, text)
        for pattern in patterns
    )


def _next_weekday(reference: datetime, weekday: int):

    days_ahead = weekday - reference.weekday()

    if days_ahead <= 0:
        days_ahead += 7

    return reference + timedelta(days=days_ahead)


def resolve_due_date(
    due_text: str | None,
    meeting_datetime: datetime
):

    if not due_text:
        return None

    due_text = due_text.strip()

    if due_text == "":
        return None

    lower = due_text.lower()

    # ---------------------------------------
    # Business shortcuts
    # ---------------------------------------

    if lower in ["eod", "end of day", "cob", "close of business"]:

        return datetime.combine(
            meeting_datetime.date(),
            DEFAULT_EOD
        )

    if lower in ["eow", "end of week"]:

        friday = _next_weekday(
            meeting_datetime,
            4
        )

        return datetime.combine(
            friday.date(),
            DEFAULT_EOD
        )

    # ---------------------------------------
    # Handle "next Monday"
    # ---------------------------------------

    if lower.startswith("next "):

        day = lower.replace("next ", "").strip()

        weekdays = {
            name.lower(): index
            for index, name in enumerate(calendar.day_name)
        }

        if day in weekdays:

            dt = _next_weekday(
                meeting_datetime,
                weekdays[day]
            )

            return datetime.combine(
                dt.date(),
                DEFAULT_EOD
            )

    # ---------------------------------------
    # Fallback to dateparser
    # ---------------------------------------

    dt = dateparser.parse(
        due_text,
        settings={
            "RELATIVE_BASE": meeting_datetime,
            "PREFER_DATES_FROM": "future",
            "RETURN_AS_TIMEZONE_AWARE": False
        }
    )

    if dt is None:
        return None

    # ---------------------------------------
    # If no explicit time, default to EOD
    # ---------------------------------------

    if not _has_explicit_time(due_text):

        dt = datetime.combine(
            dt.date(),
            DEFAULT_EOD
        )

    return dt


def format_due_date(dt: datetime | None):

    if dt is None:
        return None

    return dt.strftime("%d %b %Y %I:%M %p")


def is_overdue(dt: datetime | None):

    if dt is None:
        return False

    return dt < datetime.now()


def days_remaining(dt: datetime | None):

    if dt is None:
        return None

    return (dt.date() - datetime.now().date()).days