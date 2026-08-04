"""
Collector status tracker — records what each live collector did during a scan.

Design: each Celery worker process handles one task at a time, so a simple
module-level mutable dict is safe (no locking or contextvars needed).

Usage pattern in a Celery task:
    collector_status.reset()
    output = await module.execute(...)
    output["collector_status"] = collector_status.to_dict()

Individual scrapers (telegram_base, open_web_connector, etc.) call the
appropriate record_* helpers as they run — no changes needed at the task level
per-call; the scrapers self-report.
"""

from __future__ import annotations
import logging
from typing import Optional

logger = logging.getLogger(__name__)

COLLECTORS = ("telegram", "open_web", "darknet", "crypto", "domain")


def _blank() -> dict:
    return {
        "enabled": False,
        "ready": False,
        "scanned": False,
        "raw_count": 0,
        "error": None,
    }


class CollectorStatusTracker:
    """
    Thread-safe for Celery's default process-per-worker model.
    One instance lives per worker process; `reset()` clears it for each task.
    """

    def __init__(self) -> None:
        self._state: dict[str, dict] = {c: _blank() for c in COLLECTORS}

    # ── lifecycle ──────────────────────────────────────────────────────────────

    def reset(self) -> None:
        """Must be called at the start of each Celery task _run_async."""
        self._state = {c: _blank() for c in COLLECTORS}

    # ── write helpers (called by scrapers) ────────────────────────────────────

    def mark_enabled(self, collector: str) -> None:
        """Call when a collector is first invoked for this scan."""
        s = self._state.get(collector)
        if s:
            s["enabled"] = True

    def mark_ready(self, collector: str) -> None:
        """Call after credentials are confirmed valid."""
        s = self._state.get(collector)
        if s:
            s["enabled"] = True
            s["ready"] = True

    def mark_not_ready(self, collector: str, reason: str) -> None:
        """Call when credentials are missing or invalid."""
        s = self._state.get(collector)
        if s:
            s["enabled"] = True
            s["ready"] = False
            if not s["error"]:          # keep the first (most informative) error
                s["error"] = reason
        logger.warning("collector %s not ready: %s", collector, reason)

    def add_items(self, collector: str, count: int) -> None:
        """Call after a successful retrieval; count = number of raw items."""
        s = self._state.get(collector)
        if s:
            s["enabled"] = True
            s["ready"] = True
            s["scanned"] = True
            s["raw_count"] += count

    def mark_error(self, collector: str, error: str) -> None:
        """Call when an API call fails; does not overwrite a 'not_ready' error."""
        s = self._state.get(collector)
        if s:
            s["enabled"] = True
            s["scanned"] = True
            if not s["error"]:
                s["error"] = error
        logger.error("collector %s error: %s", collector, error)

    # ── read ──────────────────────────────────────────────────────────────────

    def to_dict(self) -> dict[str, dict]:
        """Return a copy safe to embed in the task result dict."""
        return {k: dict(v) for k, v in self._state.items()}

    def summary(self) -> str:
        parts = []
        for name, s in self._state.items():
            if s["enabled"]:
                parts.append(
                    f"{name}(count={s['raw_count']},err={s['error'] or 'none'})"
                )
        return " | ".join(parts) if parts else "no collectors ran"


# Module-level singleton — one per worker process.
collector_status = CollectorStatusTracker()
