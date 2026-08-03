import logging
import os
from contextvars import ContextVar

REQUEST_PATH: ContextVar[str | None] = ContextVar("request_path", default=None)

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()


class RequestPathFilter(logging.Filter):
    def filter(self, record):
        record.request_path = REQUEST_PATH.get() or "-"
        return True


logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s %(request_path)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger("actionos")
logger.setLevel(getattr(logging, LOG_LEVEL, logging.INFO))
logger.addFilter(RequestPathFilter())

if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(request_path)s %(message)s", datefmt="%Y-%m-%d %H:%M:%S"))
    logger.addHandler(handler)


def get_request_context() -> str:
    path = REQUEST_PATH.get()
    return f" path={path}" if path else ""
