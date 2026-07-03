from datetime import datetime
from services.date_service import resolve_due_date

meeting = datetime(
    2026,
    7,
    3,
    14,
    30
)

tests = [

    "today",

    "tomorrow",

    "yesterday",

    "10 July",

    "July 10",

    "next Monday",

    "Friday",

    "in 2 weeks",

    "next month"

]

for t in tests:

    print(t)

    print(
        resolve_due_date(
            t,
            meeting
        )
    )

    print("-" * 30)