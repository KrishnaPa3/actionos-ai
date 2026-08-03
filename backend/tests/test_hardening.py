import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from routers.uploads import validate_upload_file
from utils.health import build_health_report


def test_build_health_report_reports_unhealthy_when_dependencies_missing(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "")
    monkeypatch.setenv("SUPABASE_KEY", "")
    monkeypatch.setenv("HF_TOKEN", "")

    report = build_health_report()

    assert report["status"] in {"degraded", "unhealthy"}
    assert report["services"]["backend"] == "healthy"


def test_validate_upload_file_rejects_empty_and_oversized_files():
    with pytest.raises(ValueError):
        validate_upload_file(filename="test.wav", content_type="audio/wav", size=0)

    with pytest.raises(ValueError):
        validate_upload_file(filename="test.wav", content_type="audio/wav", size=21 * 1024 * 1024)
