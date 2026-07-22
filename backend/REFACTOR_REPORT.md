# ActionOS Backend Refactor — Deliverables Report

## Scope note

Only `main.py` was provided. Everything it imports (`services.extraction_service`,
`services.action_service`, `services.date_service`, `services.whisperx_service`,
`services.notion_service`, `dependencies.auth`, `auth_supabase`, `supabase_client`)
is treated as an existing, unmodified external module — this refactor only
reorganizes and optimizes what used to live inside `main.py` itself. Those
external modules are referenced by import exactly as before.

**Route parity:** the original file defines 35 endpoints (34 resource routes +
`GET /`). The refactored app defines the same 35, same paths, same HTTP verbs,
same request/response models. Verified by diffing the route list extracted
from both files — nothing added, nothing removed, nothing renamed.

---

## Phase 1 — N+1 query optimization (the headline fix)

**Endpoint:** `GET /sessions`

1. **What was inefficient:** the handler ran one query for sessions, then
   looped over every session and ran a *second* query per session to fetch
   its actions (`for session in sessions: db.table("actions").select(...)`).
2. **Why:** classic N+1 — for a user with 50 sessions, that's 51 round trips
   to the database instead of 2. The reported timings back this up: session
   query ≈0.1s, task queries ≈1.5s, total ≈1.6s — almost all the time was
   spent re-querying per session.
3. **Exact change:** `repositories/session_repository.py::list_sessions_with_tasks`
   now fetches all sessions once, collects their ids, and issues a single
   bulk query — `actions.select("*").in_("session_id", session_ids)` — then
   groups the results into a `dict[session_id, list[action]]` in one Python
   pass and attaches `session["tasks"]` from that dict. Same filters
   (`user_id`, `deleted=False`) as the original per-session query.
4. **Performance improvement:** query count drops from `1 + N` to `2`,
   regardless of how many sessions the user has. For the reported ~1.6s
   endpoint, this should collapse the ~1.5s spent on task queries down to
   roughly what one query costs (in the same ballpark as the ~0.1s session
   query) — an expected **~8-10x latency improvement** on this endpoint,
   and the improvement *grows* as the user's session count grows (the old
   code got linearly worse; the new code is flat).
5. **Complexity improvement:** O(N) database round trips → O(1); the
   in-Python grouping is O(sessions + actions), a single linear pass.
6. **Frontend compatibility:** the response shape is byte-for-byte
   identical — `{"success": true, "count": N, "sessions": [...]}` where each
   session still has a `"tasks"` array with the same fields, same filters,
   same ordering guarantees (task order within a session is preserved
   because it comes from one ordered query result, same as before per session).

---

## Phase 2 — Redundant query elimination

Three endpoints did `SELECT` (purely to check the row exists) immediately
followed by an `UPDATE` on the same row:

| Endpoint | Before | After |
|---|---|---|
| `DELETE /actions/{id}` | SELECT + UPDATE (soft delete) | UPDATE only; empty `response.data` = 404 |
| `DELETE /risks/{id}` | SELECT + UPDATE (soft delete) | UPDATE only |
| `DELETE /decisions/{id}` | SELECT + UPDATE (soft delete) | UPDATE only |

**Why this is safe:** all three queries were scoped by the same
`user_id` + `id` filters as the subsequent update. If the row doesn't
exist (or doesn't belong to the user), the UPDATE itself returns zero
rows — exactly as reliable a 404 signal as the earlier SELECT, just
without paying for two round trips. This directly implements the
Phase 2 instruction: "if an UPDATE returns the updated row, use it
instead of querying again."

This removes 1 query from 3 of the highest-traffic mutation endpoints —
delete actions are common in a task-tracking UI, so this is a real win
under concurrent load even though each individual request only saves a
handful of milliseconds.

Endpoints that genuinely need a prior read (because the update logic
*depends on the current value* — `complete_action` needs to know the
current status to decide the toggle direction and due-date-based
reminder logic; `resolve_risk` needs to know current status to flip
Open↔Resolved; `confirm_action` needs the row's fields to create the
Notion page) were left as SELECT + UPDATE, because that SELECT is not
redundant — removing it would change behavior.

---

## Phase 3 — Duplicate logic removed

| Duplicated pattern | Where it lived (examples) | New home |
|---|---|---|
| `db = get_authenticated_supabase(user["access_token"])` | Repeated in ~30 of 35 endpoints | `dependencies/database.py::get_auth_context` — one FastAPI dependency, injected as `ctx: AuthContext` |
| Notion try/except-and-log wrapper | `update_action`, `complete_action` | `services/notion_sync_service.py::update_task_best_effort`, `update_status_best_effort` |
| Notion "create task or fail the request" | `confirm_action` | `services/notion_sync_service.py::create_task_or_raise` |
| "Schedule a reminder N hours before due_date, clamp to +1min if already past" | Upload pipeline (1h before) and `complete_action` (24h before) — two near-identical ~15-line blocks | `repositories/reminder_repository.py::create_default_reminder(hours_before=...)` — one function, one parameter difference |
| 404-on-empty-result check | Copy-pasted `if len(response.data) == 0: raise HTTPException(404, ...)` in ~10 places | `utils/errors.py::raise_404` / `require_rows` |
| Meeting-name generation | Inline function using the *unauthenticated* module-level `supabase` client | `repositories/session_repository.py::generate_meeting_name`, now consistently using the request-scoped RLS client like every other query |

---

## Phase 4 — Modularization

`main.py` (1,948 lines, everything in one file) becomes:

```
backend/
  main.py                       ~70 lines; app wiring only, no routes/logic
  config.py                     paths, CORS origins, debug flag, whisper config
  dependencies/
    database.py                 AuthContext + get_auth_context
    notion.py                   NotionService accessor (app.state-backed)
    whisper.py                  WhisperModel accessor (app.state-backed)
  repositories/
    session_repository.py       sessions + action-plan array ops
    action_repository.py        actions/tasks
    risk_repository.py
    decision_repository.py
    reminder_repository.py
  services/
    meeting_pipeline_service.py extraction + persistence orchestration for uploads
    notion_sync_service.py      consistent Notion error handling
    transcription.py            whisper / whisperx wrappers
  schemas/
    requests.py                 all Pydantic request models
  utils/
    timing.py                   Stopwatch (DEBUG-gated instrumentation)
    errors.py                   raise_404 / require_rows / not_found_response
  routers/
    sessions.py, actions.py, risks.py, decisions.py,
    reminders.py, uploads.py, extraction.py, integrations.py
```

`main.py` is now a thin entrypoint: it builds the app, wires CORS, loads the
whisper model + Notion client once at startup, and mounts routers. No
business logic, no database queries, no route handlers live there anymore.

---

## Phase 5 — FastAPI best practices

- **Dependency injection**: `get_auth_context` is now the single source of
  the authenticated user + their RLS-scoped DB client, reused via `Depends()`
  across all 8 routers instead of re-derived inline everywhere.
- **No unnecessary client recreation**: the Supabase client construction
  pattern (`get_authenticated_supabase(token)`) is unchanged — it still
  builds one per request (required, since it's a per-user RLS-scoped
  client) — but it's built in exactly one place now instead of copy-pasted.
- **Global mutable state removed**: `whisper_model` and `notion_service`
  used to be bare module-level globals, populated at import time (which
  also meant importing `main.py` had the side effect of loading a Whisper
  model — awkward for testing/tooling). They're now created once in a
  FastAPI `lifespan` handler and stored on `app.state`, accessed via
  dependency functions (`dependencies/whisper.py`, `dependencies/notion.py`).
  Same one-instance-per-process lifecycle, no ambient globals.
- **Centralized configuration**: `config.py` holds `BASE_DIR`, `UPLOAD_DIR`,
  CORS origins, and Whisper model parameters that were previously scattered
  module-level constants.
- **Typing**: repository/service functions now have parameter and return
  type hints (`dict | None`, `list[dict]`, etc.) where the original had none.
- **Reduced repeated imports**: several endpoints did `from x import y`
  *inside* the function body, re-importing something already imported at
  module level (e.g. `upload_audio` re-imported `get_authenticated_supabase`
  it already had at the top of the file). Cleaned up.

### Deliberately NOT done (per the "don't over-engineer" instruction)

No Redis, Celery, background workers, caching layer, or ORM swap was
introduced. The Supabase client usage pattern, RLS reliance, and query
style are unchanged — only query *count* and code *location* changed.

---

## Phase 6 — Async / performance

The Supabase Python client is synchronous; every route handler is declared
`async def` but blocks the event loop on each `.execute()` call. A full fix
(true async DB client, or wrapping every call in `run_in_threadpool`) would
touch every single query in the codebase — that's a bigger change than
"reorganize + fix N+1s" and risks behavior drift across 35 endpoints, so it
is **not** applied broadly here. It's called out explicitly in the roadmap
below as the highest-impact remaining change, since it affects every
endpoint's ability to handle concurrent requests, not just `/sessions`.

What *was* done in this phase:
- `GET /actions/filters` runs two independent, unrelated queries (owners,
  sessions) sequentially. They have no data dependency on each other, so
  they're a clean candidate for concurrent execution once the broader
  async-DB-client work (above) is undertaken — flagged in the roadmap
  rather than fixed in isolation, since fixing this one spot with
  `run_in_threadpool` while leaving 30+ other endpoints fully synchronous
  would be an inconsistent half-measure.
- No phantom duplicate serialization was found elsewhere in the codebase
  to remove; the reminders endpoint's per-item dict-building loop was kept
  as-is since it's genuine per-item response shaping, not redundant work.

---

## Phase 7 — Timing & profiling

- `utils/timing.py::Stopwatch` replaces the hand-rolled `perf_counter()` +
  `print()` pairs in `GET /sessions` with a reusable class:
  `stopwatch.track("Session query")`, `stopwatch.track("Task queries")`,
  `stopwatch.report()`.
- Gated behind `config.DEBUG_TIMING` (env var `DEBUG_TIMING`, defaults to
  "on" to match the original always-print behavior — set `DEBUG_TIMING=0`
  in production to silence it, which the original code had no way to do).
- Only wired into `/sessions` for now since that's the endpoint the spec
  called out by name and the only one with pre-existing instrumentation;
  the `Stopwatch` class is reusable for any other endpoint you want
  timed (DB time / LLM time / whisper time splits are one `.track()`
  call each).

---

## Phase 8 — Error handling

- Standardized the "row not found" pattern via `utils/errors.py`
  (`raise_404`, `require_rows`, `not_found_response`), used consistently
  across all routers instead of the original's inconsistent mix of
  `raise HTTPException(404, ...)` in some endpoints and hand-built
  `{"success": False, "error": ...}` dicts in others (both are still
  correctly reproduced per-endpoint — see "Behavioral notes" below — but
  now via one shared helper instead of copy-pasted blocks).
- Notion failures are consistently non-fatal (logged, not raised) except
  in `confirm_action`, where Notion creation *is* the point of the
  request — that one still raises a 500 on failure, matching the original.

### Behavioral notes / bugs fixed (flagging explicitly, not hiding them)

Two spots in the original code had a latent crash bug on the "not found"
path. I fixed both rather than reproduce the crash, since "preserve
functionality" is better served by preserving the *intended* behavior than
a bug nobody was relying on — but flagging clearly so you can revert if
you'd rather match the original byte-for-byte:

1. **`rename_meeting`** (`PATCH /session/{id}/rename`): on the "session not
   found" branch, the original did `print(response.data[0])` before
   returning the error dict — but `response.data` is empty on that branch,
   so this would throw `IndexError` (a 500) instead of the intended
   `{"success": false, "error": "Session not found"}`. Fixed by removing
   the dead debug print; the intended response is now actually returned.
2. **`snooze_reminder`** (`POST /reminders/{id}/snooze`): the original did
   `return response.data[0]` with no check that the update actually
   matched a row — a snooze on a nonexistent/foreign reminder id would
   throw `IndexError` (500) rather than a clean error. The refactored
   repository function returns `None` in that case; the router currently
   passes that through unchanged (matching the original's *lack* of an
   explicit 404) — only the crash-on-missing-id case is fixed, no new
   validation was added.

If your test suite or frontend actually depends on these crashing (e.g.
some retry logic keys off a 500), say so and these can be reverted to
match byte-for-byte.

---

## Phase 9 — Code quality

- Every repository/service function has a docstring explaining intent
  (especially where it deviates from a literal 1:1 port, e.g. the N+1 fix
  and the redundant-query removals) and type hints.
- Removed dead/duplicate imports (`resolve_due_date` was imported in the
  original `main.py` but never used there; `get_authenticated_supabase`
  was re-imported inside `upload_audio`'s body despite already being
  imported at module level).
- Removed the heavy inline `print()` debug logging that peppered
  `upload_audio` ("UPLOAD ENDPOINT HIT", full payload dumps, etc.) — none
  of it was behavior-affecting, and it made the function's real logic hard
  to follow. If you rely on grepping those specific log lines in
  production, say so and they can be reinstated via proper `logging` calls
  instead of `print()`.
- Long functions split by responsibility: `upload_audio` (was ~380 lines,
  one function) is now a ~60-line router function that calls
  `meeting_pipeline_service.extract_from_transcript` and
  `.save_extraction_results`, each with a focused job.

---

## Phase 10 — Scalability review

| Concern | Status after this refactor | Notes |
|---|---|---|
| Thousands of meetings | Improved | `/sessions` no longer scales with N sessions per request |
| Hundreds of users | Unchanged | Every request still builds a fresh Supabase client per Phase 5 note — fine at hundreds of users, worth revisiting at much higher scale |
| Large task lists | Improved | Bulk action fetch scales with total actions, not sessions × actions |
| Large reminder lists | Unchanged | `GET /reminders` is already a single query with a join; fine as-is |
| Many concurrent uploads | Unchanged | Whisper transcription is CPU-bound and blocking; concurrent uploads will queue behind each other on the same event loop regardless of this refactor — needs the async/threadpool work in the roadmap, or a queue, to truly parallelize |
| Many simultaneous dashboard users | Improved | `/sessions` is the main dashboard load endpoint and got the N+1 fix |

---

## Summary estimates

- **Database query reduction:** `GET /sessions` goes from `1 + N` to `2`
  queries (the dominant win). Three delete endpoints drop from 2 queries to
  1 each. No other endpoint's query count changed — everything else was
  already close to minimal.
- **Expected latency improvement:** `/sessions` should improve roughly
  **8-10x** for users with many sessions (bounded by whatever the bulk
  query's own cost is, versus N sequential round trips) — and the
  improvement scales up further as session counts grow, since the old
  endpoint was O(N) round trips and the new one is O(1).
- **Maintainability improvement:** 1 file, 1,948 lines → ~25 files, each
  under ~200 lines, organized by responsibility (routes / business logic /
  data access). Duplicated auth/db-client boilerplate, Notion error
  handling, and reminder-scheduling logic each collapsed from many copies
  to one canonical implementation.
- **Scalability improvement:** the dashboard's primary listing endpoint no
  longer degrades linearly with a user's session count; delete-path
  mutation endpoints do one fewer round trip each under load.

---

## Roadmap of remaining improvements (highest → lowest impact)

1. **Make DB calls actually non-blocking.** Every route is `async def` but
   every Supabase call inside it is synchronous, blocking the event loop.
   Under concurrent load this caps the whole app's throughput to roughly
   one request at a time per worker regardless of how few queries each
   endpoint makes. Wrapping calls in `starlette.concurrency.run_in_threadpool`
   (no new dependency — it ships with FastAPI/Starlette) is the
   lowest-risk fix; adopting an async Postgrest/Supabase client (if
   available for your supabase-py version) would be the more thorough one.
2. **Parallelize `GET /actions/filters`'s two independent queries** (owners,
   sessions) once (1) is in place — a trivial `asyncio.gather` win, held
   off for now since it only makes sense alongside the broader threadpool
   change.
3. **Add pagination to `GET /sessions` and `GET /actions`.** Both currently
   return the user's *entire* history in one response. Fine at hundreds of
   rows, a real problem at tens of thousands — "thousands of meetings" in
   your own scalability target will eventually need a `limit`/`cursor`.
4. **Index review on the `actions` and `sessions` tables** for the new bulk
   query's filter columns (`user_id`, `session_id`, `deleted`) and the
   `actions` date-range filters in `/actions` — not something to guess at
   from this file alone; worth an `EXPLAIN ANALYZE` pass against real data.
5. **Structured logging instead of `print()`** everywhere debug output
   still exists (mainly in the upload/error paths) — low urgency, but
   makes production log aggregation far more useful than free-text prints.
