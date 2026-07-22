"""
Reusable error helpers.

Standardizes the "did the query return a row?" check that was repeated
via slightly-inconsistent copy-pasted blocks throughout main.py:
sometimes `raise HTTPException(404, ...)`, sometimes a manually built
`{"success": False, "error": ...}` dict.

IMPORTANT: to keep responses byte-for-byte identical to the original
per-endpoint behaviour, `not_found_response()` reproduces the informal
`{"success": False, "error": ...}` shape used by the *specific*
endpoints that used it (rename_meeting, delete_session), while
`raise_404()` reproduces the HTTPException shape used by the
endpoints that raised one (delete_action, delete_risk, delete_decision,
etc). Nothing here changes any endpoint's actual contract - it just
avoids re-typing the same conditional in a dozen places.
"""

from typing import Any, NoReturn

from fastapi import HTTPException


def raise_404(detail: str) -> NoReturn:
    """Raise a standardized 404, matching the original HTTPException-based endpoints."""
    raise HTTPException(status_code=404, detail=detail)


def not_found_response(error: str) -> dict:
    """
    Build the informal '{"success": False, "error": ...}' payload used by
    the handful of endpoints (rename_meeting, delete_session) that
    returned a 200 with a success flag instead of raising an HTTPException.
    Preserved as-is for backward compatibility with the frontend.
    """
    return {"success": False, "error": error}


def require_rows(rows: list[Any], detail: str) -> Any:
    """
    Common "query returned nothing -> 404" guard. Returns the first row
    when present so call sites can do:

        row = require_rows(response.data, "Task not found")
    """
    if not rows:
        raise_404(detail)
    return rows[0]
