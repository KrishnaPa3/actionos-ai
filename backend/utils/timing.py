"""
Lightweight timing instrumentation.

Replaces the ad-hoc `perf_counter()` + `print()` pairs that were
hand-rolled inside GET /sessions. Behavior is preserved (same metrics,
same granularity) but:

  * it's reusable across any endpoint instead of one-off code,
  * it's silent unless config.DEBUG_TIMING is truthy, so production
    logs aren't flooded by default.
"""

from contextlib import contextmanager
from time import perf_counter
from typing import Iterator

from config import DEBUG_TIMING


class Stopwatch:
    """Accumulates named timing splits for a single request/endpoint."""

    def __init__(self, label: str):
        self.label = label
        self._start = perf_counter()
        self.splits: dict[str, float] = {}

    @contextmanager
    def track(self, name: str) -> Iterator[None]:
        """Time a block of code and store it under `name`."""
        start = perf_counter()
        try:
            yield
        finally:
            self.splits[name] = self.splits.get(name, 0.0) + (perf_counter() - start)

    def add(self, name: str, seconds: float) -> None:
        """Manually add elapsed time under `name` (e.g. from a loop)."""
        self.splits[name] = self.splits.get(name, 0.0) + seconds

    @property
    def total(self) -> float:
        return perf_counter() - self._start

    def report(self) -> None:
        """Print a summary, only when DEBUG_TIMING is enabled."""
        if not DEBUG_TIMING:
            return

        print()
        print(f"========== {self.label} ==========")
        for name, seconds in self.splits.items():
            print(f"{name:<14}: {seconds:.3f}s")
        print(f"{'Endpoint total':<14}: {self.total:.3f}s")
        print("=" * (22 + len(self.label)))
        print()
