from datetime import datetime, timezone

from config import AI_PROVIDER, OLLAMA_BASE_URL
from services.ai.factory import _SUPPORTED_PROVIDERS
from services.model_manager import get_model_manager_status, get_whisperx_device
from supabase_client import supabase


def _check_supabase() -> str:
    try:
        response = supabase.table("sessions").select("id", count="exact").limit(1).execute()
        if getattr(response, "status_code", None) in {200, 201, 204}:
            return "healthy"
        return "unhealthy"
    except Exception:
        return "unhealthy"


def _check_ollama() -> str:
    try:
        import httpx

        ollama_base = OLLAMA_BASE_URL.replace("/v1", "")
        response = httpx.get(f"{ollama_base}/api/tags", timeout=2.0)
        return "healthy" if response.status_code < 500 else "unhealthy"
    except Exception:
        return "unhealthy"


def build_health_report() -> dict:
    supabase_status = _check_supabase()
    ollama_status = _check_ollama()
    model_status = get_model_manager_status()
    gpu_status = "available" if get_whisperx_device() == "cuda" else "unavailable"
    ai_provider_status = "healthy" if AI_PROVIDER and AI_PROVIDER.lower() in _SUPPORTED_PROVIDERS else "unhealthy"

    services = {
        "backend": "healthy",
        "supabase": supabase_status,
        "ollama": ollama_status,
        "ai_provider": ai_provider_status,
        "models": model_status,
        "gpu": gpu_status,
    }

    overall = "healthy" if all(value == "healthy" for value in services.values()) else "degraded"
    if any(value == "unhealthy" for value in services.values()):
        overall = "unhealthy"

    return {
        "status": overall,
        "services": services,
        "timestamp": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "version": "1.0.0",
    }
