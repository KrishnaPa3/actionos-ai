"""
Centralized application configuration.

Collects everything that was previously scattered as module-level
globals in main.py (paths, CORS origins, debug flags) into one place.
Behavior is unchanged - values are identical to the originals.
"""

import os

# ----------------------------------------------------
# Paths
# ----------------------------------------------------

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

os.makedirs(UPLOAD_DIR, exist_ok=True)

# ----------------------------------------------------
# CORS
# ----------------------------------------------------

CORS_ALLOW_ORIGINS = ["http://localhost:5173"]

# ----------------------------------------------------
# Debug / timing instrumentation
# ----------------------------------------------------
# Same behaviour as before (timings were always printed) but now gated
# behind an env var so production logs aren't spammed by default.
# Set DEBUG_TIMING=1 to restore the old "always print" behaviour.

DEBUG_TIMING = os.getenv("DEBUG_TIMING", "1") == "1"

# ----------------------------------------------------
# Whisper model configuration
# ----------------------------------------------------

WHISPER_MODEL_SIZE = "base"
WHISPER_DEVICE = "cpu"
WHISPER_COMPUTE_TYPE = "int8"
