# PROJECT AUDIT — ActionOS AI

> Source of truth for the README. Every item below was verified by reading the actual source code during the repository audit. Items marked **Not verified** could not be confirmed from the code and must NOT be documented as implemented.

---

## 1. Project Identity

| Item | Status | Detail |
|---|---|---|
| Project name | Verified | ActionOS AI |
| Repository | Verified | `https://github.com/KrishnaPa3/actionos-ai.git` |
| One-line description | Verified | Meeting intelligence platform — transcribes audio, extracts tasks/decisions/risks/summaries via local LLM, syncs to Notion/Google/Slack |

---

## 2. Features (Verified from code)

| Feature | Status | Source |
|---|---|---|
| AI meeting transcription | Verified | `backend/services/transcription.py` — uses faster-whisper + WhisperX |
| Speaker diarization | Verified | `backend/services/whisperx_service.py` — Pyannote via WhisperX |
| Task extraction | Verified | `backend/services/extraction_service.py` + `backend/prompts/extraction_prompt.py` |
| Meeting summaries | Verified | Extraction prompt returns `summary` array; `backend/schemas/extraction.py` defines `SummaryItem` |
| Decisions extraction | Verified | `backend/schemas/extraction.py` defines `Decision`; `backend/routers/decisions.py` |
| Risk extraction | Verified | `backend/schemas/extraction.py` defines `Risk`; `backend/routers/risks.py` |
| Action plans | Verified | `backend/schemas/extraction.py` defines `ActionPlan`; `backend/routers/sessions.py` has action-plan endpoints |
| Dashboard | Verified | `frontend/src/pages/Dashboard.jsx` + `frontend/src/pages/dashboardcomponents/` |
| Session history | Verified | `frontend/src/pages/SessionsPage.jsx` + `backend/routers/sessions.py` |
| Reminder system | Verified | `backend/routers/reminders.py` — auto-reminders, snooze, custom |
| Authentication | Verified | `backend/dependencies/auth.py` — Supabase JWT validation |
| Profile system | Verified | `backend/routers/profile.py` — username, full_name, avatar, account deletion |
| Notion integration | Verified | `backend/integrations/notion/` — OAuth, database selection, task sync |
| Google Calendar integration | Verified | `backend/integrations/google/` — OAuth, task sync as events |
| Slack integration | Verified | `backend/integrations/slack/` — OAuth, channel selection, task sync |
| Docker deployment | Verified | `docker-compose.yml` — 3 services (ollama, backend, frontend) |
| GPU acceleration | Verified | `backend/Dockerfile` — CUDA 12.6; `docker-compose.yml` — `runtime: nvidia` |
| Voice recording | Verified | `frontend/src/VoiceRecorder.jsx` — in-browser recording |
| Task filtering & search | Verified | `backend/routers/actions.py` — search, priority, status, owner, session, date filters |
| Action plan editing | Verified | `backend/routers/sessions.py` — PUT/DELETE action-plan endpoints |
| Risk management | Verified | `backend/routers/risks.py` — update, resolve, delete |
| Decision management | Verified | `backend/routers/decisions.py` — update, accept, reject, delete |
| Model warm-up | Verified | `backend/routers/uploads.py` — `POST /warm-audio-models` |

---

## 3. Features NOT Implemented

| Feature | Status | Detail |
|---|---|---|
| OpenAI provider | Not verified | `backend/services/ai/factory.py` — raises `NotImplementedError` for `openai` |
| Gemini provider | Not verified | `backend/services/ai/factory.py` — raises `NotImplementedError` for `gemini` |
| Anthropic provider | Not verified | `backend/services/ai/factory.py` — raises `NotImplementedError` for `anthropic` |
| Real-time transcription | Not verified | No WebSocket/streaming transcription endpoints found |
| Email notifications | Not verified | No email sending code found |
| Webhook integrations | Not verified | No webhook receiver endpoints found |
| Team/workspace support | Not verified | All data is per-user via RLS; no team/workspace tables found |
| Mobile app | Not verified | No mobile-specific code found |
| API key auth | Not verified | Only JWT Bearer auth found |

---

## 4. Architecture

| Component | Status | Detail |
|---|---|---|
| Frontend: React + Vite | Verified | `frontend/package.json` — React 19, Vite 8 |
| Backend: FastAPI | Verified | `backend/main.py` — FastAPI app with lifespan |
| AI: WhisperX | Verified | `backend/services/whisperx_service.py` |
| AI: faster-whisper | Verified | `backend/services/transcription.py` — `transcribe_audio()` |
| AI: Pyannote diarization | Verified | `backend/services/whisperx_service.py` — `DiarizationPipeline` |
| AI: Ollama | Verified | `backend/services/ai/providers/ollama_provider.py` |
| Database: Supabase (PostgreSQL) | Verified | `backend/supabase_client.py`, `backend/auth_supabase.py` |
| Auth: Supabase Auth + JWT | Verified | `backend/dependencies/auth.py` — `get_current_user()` |
| RLS: Row Level Security | Verified | `backend/auth_supabase.py` — `get_authenticated_supabase()` authenticates PostgREST with user token |
| Storage: Supabase Storage | Verified | `backend/routers/uploads.py` — uploads to `audio-files` bucket |
| Containerization: Docker | Verified | `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile` |
| GPU: CUDA 12.6 | Verified | `backend/Dockerfile` — `nvidia/cuda:12.6.3-runtime-ubuntu24.04` |
| GPU: NVIDIA Container Toolkit | Verified | `docker-compose.yml` — `runtime: nvidia` |
| Reverse proxy: nginx (frontend) | Verified | `frontend/Dockerfile` — Stage 2 uses `nginx:alpine` |

---

## 5. Tech Stack

### Frontend (Verified from `frontend/package.json`)

| Technology | Version | Purpose |
|---|---|---|
| React | 19.2.6 | UI framework |
| Vite | 8.0.12 | Build tool & dev server |
| React Router DOM | 7.18.1 | Client-side routing |
| Tailwind CSS | 4.3.1 | Styling |
| @supabase/supabase-js | 2.110.7 | Supabase client |
| Motion | 12.42.2 | Animations |
| Lucide React | 1.23.0 | Icons |
| WaveSurfer.js | 7.12.8 | Audio waveform visualization |
| React Loading Skeleton | 3.5.0 | Loading states |

### Backend (Verified from `backend/requirements.txt`)

| Technology | Version | Purpose |
|---|---|---|
| Python | 3.12 | Runtime (from Dockerfile) |
| FastAPI | 0.137.2 | Web framework |
| Uvicorn | 0.51.0 | ASGI server |
| Pydantic | 2.13.4 | Data validation |
| python-dotenv | 1.2.2 | Environment variable loading |
| supabase | 2.31.0 | Supabase client |
| openai | 2.43.0 | Ollama OpenAI-compatible API client |
| notion-client | 3.1.0 | Notion API |
| slack_sdk | 3.43.0 | Slack API |
| google-api-python-client | 2.198.0 | Google Calendar API |
| PyJWT | 2.13.0 | JWT handling |
| python-jose | 3.5.0 | JWT verification |
| python-multipart | 0.0.32 | File upload handling |

### AI (Verified from `backend/requirements.txt` + code)

| Technology | Version | Purpose |
|---|---|---|
| whisperx | 3.8.6 | Speech-to-text with word-level alignment |
| faster-whisper | 1.2.1 | Lightweight transcription |
| pyannote-audio | 4.0.7 | Speaker diarization |
| torch (PyTorch) | 2.13.0 (CUDA) | Deep learning runtime |
| transformers | 4.57.6 | Model loading |
| Ollama | latest (Docker image) | Local LLM inference (default: `qwen3:8b`) |

### Database / Auth / Storage (Verified from code)

| Technology | Purpose |
|---|---|
| Supabase (PostgreSQL) | Primary database with RLS |
| Supabase Auth | Email/password, OAuth, JWT issuance |
| Supabase Storage | Audio file storage (`audio-files` bucket) |

### Deployment (Verified from Dockerfiles + docker-compose)

| Technology | Purpose |
|---|---|
| Docker | Containerization |
| Docker Compose | Multi-service orchestration |
| NVIDIA Container Toolkit | GPU passthrough |
| nginx | Frontend static file serving |

---

## 6. Docker Configuration

### docker-compose.yml (Verified)

| Service | Image | Port | Runtime | Health Check |
|---|---|---|---|---|
| ollama | `ollama/ollama:latest` | 11434 | nvidia | `ollama list` |
| backend | `nvidia/cuda:12.6.3-runtime-ubuntu24.04` (built) | 8000 | nvidia | `curl -f http://localhost:8000/health` |
| frontend | `node:20-slim` → `nginx:alpine` (built) | 5173 | default | Not verified (no healthcheck in compose) |

### Volumes (Verified)

| Volume | Purpose |
|---|---|
| `actionos_ollama_models` | Ollama model storage |
| `actionos_huggingface_cache` | HuggingFace model cache |
| `actionos_whisper_cache` | Whisper model cache |
| `actionos_torch_cache` | PyTorch model cache |
| `actionos_uploads` | Uploaded audio files |

### docker-compose.dev.yml (Verified to exist, content Not verified)

File exists. Purpose: hot-reload override. Specific overrides Not verified (did not read content).

### Backend Dockerfile (Verified)

- Base: `nvidia/cuda:12.6.3-runtime-ubuntu24.04`
- Python 3.12 + venv
- PyTorch installed with CUDA 12.6 (`--index-url https://download.pytorch.org/whl/cu126`)
- Non-root user: `actionos`
- Health check: `curl -f http://localhost:8000/health`
- Exposes port 8000
- CMD: `uvicorn main:app --host 0.0.0.0 --port 8000`

### Frontend Dockerfile (Verified)

- Multi-stage build
- Stage 1: `node:20-slim` — builds Vite React app
- Stage 2: `nginx:alpine` — serves static files on port 5173
- Build args: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_URL`
- nginx config: SPA routing with `try_files $uri $uri/ /index.html`

---

## 7. Environment Variables

### Supabase (Verified from `backend/config.py` + `backend/main.py`)

| Variable | Required | Default | Status |
|---|---|---|---|
| `SUPABASE_URL` | Yes | — | Verified (validated at startup) |
| `SUPABASE_KEY` | Yes | — | Verified (validated at startup) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | — | Verified (validated at startup) |
| `SUPABASE_JWT_SECRET` | No | `""` | Verified |

### AI (Verified from `backend/config.py`)

| Variable | Required | Default | Status |
|---|---|---|---|
| `AI_PROVIDER` | No | `ollama` | Verified |
| `OLLAMA_BASE_URL` | No | `http://localhost:11434/v1` | Verified |
| `OLLAMA_MODEL` | No | `qwen3:8b` | Verified |
| `OPENAI_API_KEY` | No | `""` | Verified (configured but provider Not implemented) |
| `OPENAI_MODEL` | No | `gpt-4o` | Verified (configured but provider Not implemented) |
| `GEMINI_API_KEY` | No | `""` | Verified (configured but provider Not implemented) |
| `GEMINI_MODEL` | No | `gemini-2.5-pro` | Verified (configured but provider Not implemented) |
| `ANTHROPIC_API_KEY` | No | `""` | Verified (configured but provider Not implemented) |
| `ANTHROPIC_MODEL` | No | `claude-sonnet-4` | Verified (configured but provider Not implemented) |
| `HF_TOKEN` | Yes | `""` | Verified (required for Pyannote diarization) |

### Notion (Verified from `backend/config.py`)

| Variable | Required | Default | Status |
|---|---|---|---|
| `NOTION_API_KEY` | No | `""` | Verified |
| `NOTION_DATABASE_ID` | No | `""` | Verified |
| `NOTION_CLIENT_ID` | No | `""` | Verified |
| `NOTION_CLIENT_SECRET` | No | `""` | Verified |
| `NOTION_REDIRECT_URI` | No | `{BACKEND_URL}/oauth/notion/callback` | Verified |

### Google Calendar (Verified from `backend/config.py`)

| Variable | Required | Default | Status |
|---|---|---|---|
| `GOOGLE_CLIENT_ID` | No | `""` | Verified |
| `GOOGLE_CLIENT_SECRET` | No | `""` | Verified |
| `GOOGLE_REDIRECT_URI` | No | `{BACKEND_URL}/oauth/google/callback` | Verified |

### Slack (Verified from `backend/config.py`)

| Variable | Required | Default | Status |
|---|---|---|---|
| `SLACK_CLIENT_ID` | No | `""` | Verified |
| `SLACK_CLIENT_SECRET` | No | `""` | Verified |
| `SLACK_REDIRECT_URI` | No | `{BACKEND_URL}/oauth/slack/callback` | Verified |

### Application URLs (Verified from `backend/config.py`)

| Variable | Required | Default | Status |
|---|---|---|---|
| `FRONTEND_URL` | No | `http://localhost:5173` | Verified |
| `BACKEND_URL` | No | `http://localhost:8000` | Verified |
| `CORS_ORIGINS` | No | `{FRONTEND_URL}` | Verified |
| `DEBUG_TIMING` | No | `1` | Verified |
| `UPLOAD_DIR` | No | `/app/uploads` | Verified |

### Frontend (Verified from `frontend/Dockerfile` build args)

| Variable | Required | Status |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Verified |
| `VITE_SUPABASE_ANON_KEY` | Yes | Verified |
| `VITE_API_URL` | No | Verified |
| `VITE_SITE_URL` | No | Verified |

---

## 8. API Endpoints (Verified from router files)

### Sessions (`backend/routers/sessions.py`)

| Method | Path | Status |
|---|---|---|
| GET | `/sessions` | Verified |
| GET | `/session/{session_id}` | Verified |
| GET | `/session/{session_id}/actions` | Verified |
| GET | `/session/{session_id}/risks` | Verified |
| GET | `/session/{session_id}/decisions` | Verified |
| PATCH | `/session/{session_id}/rename` | Verified |
| DELETE | `/sessions/{session_id}` | Verified (hard delete) |
| PATCH | `/session/{session_id}/delete` | Verified (soft delete) |
| DELETE | `/session/{session_id}/action-plan/{index}` | Verified |
| PUT | `/session/{session_id}/action-plan/{index}` | Verified |

### Actions (`backend/routers/actions.py`)

| Method | Path | Status |
|---|---|---|
| GET | `/actions` | Verified (filters: search, priority, status, owner, session, date_mode, date, end) |
| GET | `/actions/filters` | Verified |
| PATCH | `/actions/{action_id}` | Verified |
| DELETE | `/actions/{action_id}` | Verified (soft delete) |
| PATCH | `/actions/{action_id}/complete` | Verified (toggle) |
| PATCH | `/actions/{action_id}/confirm` | Verified |
| GET | `/actions/{action_id}/reminders` | Verified |
| POST | `/actions/{action_id}/reminders` | Verified |

### Risks (`backend/routers/risks.py`)

| Method | Path | Status |
|---|---|---|
| PATCH | `/risks/{risk_id}` | Verified |
| PATCH | `/risks/{risk_id}/resolve` | Verified (toggle) |
| DELETE | `/risks/{risk_id}` | Verified (soft delete) |

### Decisions (`backend/routers/decisions.py`)

| Method | Path | Status |
|---|---|---|
| GET | `/decisions` | Verified |
| PATCH | `/decisions/{decision_id}` | Verified |
| PATCH | `/decisions/{decision_id}/accept` | Verified |
| PATCH | `/decisions/{decision_id}/reject` | Verified |
| DELETE | `/decisions/{decision_id}` | Verified (soft delete) |

### Reminders (`backend/routers/reminders.py`)

| Method | Path | Status |
|---|---|---|
| GET | `/reminders` | Verified |
| PATCH | `/reminders/{reminder_id}` | Verified |
| POST | `/reminders/{reminder_id}/snooze` | Verified (15m, 30m, 1h, tomorrow, custom) |
| DELETE | `/reminders/{reminder_id}` | Verified |

### Uploads (`backend/routers/uploads.py`)

| Method | Path | Status |
|---|---|---|
| POST | `/warm-audio-models` | Verified |
| POST | `/upload-audio` | Verified |

### Extraction (`backend/routers/extraction.py`)

| Method | Path | Status |
|---|---|---|
| POST | `/extract` | Verified |

### Integrations (`backend/routers/integrations.py` + `backend/integrations/*/router.py`)

| Method | Path | Status |
|---|---|---|
| GET | `/integrations` | Verified |
| GET | `/oauth/notion/login` | Verified |
| GET | `/oauth/notion/callback` | Verified |
| GET | `/integrations/notion/status` | Verified |
| GET | `/integrations/notion/databases` | Verified |
| POST | `/integrations/notion/database` | Verified |
| POST | `/integrations/notion/disconnect` | Verified |
| POST | `/integrations/notion/sync-task` | Verified |
| GET | `/oauth/google/login` | Verified |
| GET | `/oauth/google/callback` | Verified |
| GET | `/integrations/google/status` | Verified |
| POST | `/integrations/google/disconnect` | Verified |
| POST | `/integrations/google/sync-task` | Verified |
| GET | `/oauth/slack/login` | Verified |
| GET | `/oauth/slack/callback` | Verified |
| GET | `/integrations/slack/status` | Verified |
| GET | `/integrations/slack/channels` | Verified |
| POST | `/integrations/slack/default-channel` | Verified |
| POST | `/integrations/slack/sync-task` | Verified |
| POST | `/integrations/slack/disconnect` | Verified |

### Profile (`backend/routers/profile.py`)

| Method | Path | Status |
|---|---|---|
| GET | `/profile` | Verified |
| POST | `/profile/setup` | Verified (idempotent) |
| PATCH | `/profile` | Verified |
| DELETE | `/profile/delete-account` | Verified (cascade) |

### Health (`backend/main.py`)

| Method | Path | Status |
|---|---|---|
| GET | `/` | Verified |
| GET | `/health` | Verified |

---

## 9. AI Pipeline (Verified from `backend/routers/uploads.py` + `backend/services/meeting_pipeline_service.py`)

| Step | Status | Detail |
|---|---|---|
| 1. Audio upload | Verified | `POST /upload-audio` — saves to disk |
| 2. Supabase Storage | Verified | Uploads to `audio-files` bucket, gets public URL |
| 3. WhisperX transcription | Verified | `transcription.transcribe_with_diarization(file_path)` |
| 4. faster-whisper transcription | Verified | `transcription.transcribe_audio(whisper_model, file_path)` — flat transcript |
| 5. Speaker diarization | Verified | Pyannote via WhisperX (min_speakers=2, max_speakers=2) |
| 6. Transcript alignment | Verified | WhisperX word-level alignment |
| 7. Prompt engineering | Verified | `backend/prompts/extraction_prompt.py` — system prompt with schema instructions |
| 8. Ollama LLM | Verified | `temperature=0.0`, `response_format=json_object` |
| 9. Structured JSON | Verified | Validated against `ExtractionResult` Pydantic schema |
| 10. Supabase Database | Verified | `meeting_pipeline_service.save_extraction_results()` — persists summary, actions, risks, decisions |
| 11. Auto-reminders | Verified | Default reminder created 1 hour before due date |
| 12. Frontend dashboard | Verified | `frontend/src/pages/Dashboard.jsx` + `ResultsPage.jsx` |

### Model warm-up (Verified)

`POST /warm-audio-models` calls `warm_audio_models()` from `backend/services/model_manager.py` to pre-load WhisperX, faster-whisper, and Pyannote models.

---

## 10. Integrations (Verified)

### Notion (`backend/integrations/notion/`)

| Aspect | Status | Detail |
|---|---|---|
| OAuth flow | Verified | `oauth.py` — authorization code flow with `state` parameter |
| Token storage | Verified | Stored in `integrations` table |
| Database selection | Verified | `service.py` — lists and selects databases |
| Task sync | Verified | Creates Notion page with title, owner, due date, priority, session link |
| Duplicate protection | Verified | Returns existing page URL if already synced |
| Disconnect | Verified | Deletes integration record |

### Google Calendar (`backend/integrations/google/`)

| Aspect | Status | Detail |
|---|---|---|
| OAuth flow | Verified | `oauth.py` — authorization code flow with refresh token |
| Token storage | Verified | Stored in `integrations` table |
| Task sync | Verified | Creates calendar event with title, description, due date |
| Duplicate protection | Verified | Returns existing event URL if already synced |
| Disconnect | Verified | Deletes integration record |

### Slack (`backend/integrations/slack/`)

| Aspect | Status | Detail |
|---|---|---|
| OAuth flow | Verified | `oauth.py` — bot token flow with `state` parameter |
| Token storage | Verified | Stored in `integrations` table |
| Channel selection | Verified | `service.py` — lists channels, saves default |
| Task sync | Verified | Posts formatted message to default channel |
| Duplicate protection | Verified | Returns existing message timestamp if already synced |
| Disconnect | Verified | Deletes integration record |

---

## 11. Authentication & Security (Verified)

| Aspect | Status | Detail |
|---|---|---|
| Supabase Auth | Verified | `backend/dependencies/auth.py` — `get_current_user()` validates JWT via `supabase.auth.get_user()` |
| JWT Bearer tokens | Verified | All endpoints require `Authorization: Bearer <token>` |
| RLS (Row Level Security) | Verified | `backend/auth_supabase.py` — `get_authenticated_supabase()` authenticates PostgREST with user token |
| AuthContext | Verified | `backend/dependencies/database.py` — bundles user + RLS-scoped client |
| Admin operations | Verified | `backend/supabase_admin.py` — service role client for account deletion, OAuth storage |
| OAuth state | Verified | `state` parameter contains user's Supabase ID |
| CORS | Verified | `backend/config.py` — configurable via `CORS_ORIGINS` |
| Non-root container | Verified | `backend/Dockerfile` — runs as `actionos` user |
| HTTPS | Not verified | No TLS configuration in code; left to reverse proxy |

---

## 12. Frontend Pages (Verified from file existence + `App.jsx`)

| Page | Status | File |
|---|---|---|
| Dashboard | Verified | `frontend/src/pages/Dashboard.jsx` |
| Sessions | Verified | `frontend/src/pages/SessionsPage.jsx` |
| Results | Verified | `frontend/src/pages/ResultsPage.jsx` (inferred from CSS) |
| Task List | Verified | `frontend/src/pages/TaskList.css` (inferred from CSS) |
| Integrations | Verified | `frontend/src/pages/Integrations.jsx` |
| Profile | Verified | `frontend/src/pages/Profile.jsx` |
| Login | Verified | `frontend/src/pages/Login.jsx` |
| Signup | Verified | `frontend/src/pages/Signup.jsx` |
| Forgot Password | Verified | `frontend/src/pages/ForgotPassword.jsx` |
| Reset Password | Verified | `frontend/src/pages/ResetPassword.jsx` |
| Auth Callback | Verified | `frontend/src/pages/AuthCallback.jsx` |
| Voice Recorder | Verified | `frontend/src/VoiceRecorder.jsx` |

### Frontend Auth (Verified)

| Component | Status | File |
|---|---|---|
| AuthProvider | Verified | `frontend/src/auth/AuthProvider.jsx` |
| AuthContext | Verified | `frontend/src/auth/AuthContext.jsx` |
| ProtectedRoute | Verified | `frontend/src/auth/ProtectedRoute.jsx` |
| useAuth hook | Verified | `frontend/src/auth/useAuth.jsx` |

---

## 13. Roadmap (Verified from `TODO.md` + code analysis)

| Item | Status | Detail |
|---|---|---|
| Update TODO.md | Verified | Slack backend is implemented but TODO.md marks it incomplete |
| Implement OpenAI provider | Verified | Configured in `config.py` but `factory.py` raises `NotImplementedError` |
| Implement Gemini provider | Verified | Configured in `config.py` but `factory.py` raises `NotImplementedError` |
| Implement Anthropic provider | Verified | Configured in `config.py` but `factory.py` raises `NotImplementedError` |
| Database migration docs | Verified | `backend/migrate_tasks.py` + `backend/MIGRATION_GUIDE.md` exist but not documented in README |

---

## 14. Scripts (Verified)

| Script | Status | Purpose |
|---|---|---|
| `scripts/pull-ollama-model.sh` | Verified (exists) | Pulls Ollama model into container. Content Not verified. |

---

## 15. License

| Item | Status |
|---|---|
| LICENSE file | Not verified (does not exist in repository) |
| License type | Not verified |