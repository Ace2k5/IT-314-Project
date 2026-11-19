"""Logging setup: every record goes to ``info.log`` and to an in-memory buffer.

The buffer is what ``POST /log`` returns to the frontend debug panel.  It grows
for the lifetime of the process, so it is deliberately capped by the caller.
"""

from __future__ import annotations

import logging
from io import StringIO
from pathlib import Path

INFO_LOG_PATH = Path(__file__).resolve().parents[1] / "info.log"

LOG_FORMAT = "DATE: {asctime} | LEVEL: {levelname} | MSG: {message}"
DATE_FORMAT = "%Y-%m-%d %H:%M"

_configured = False


def setup_log(log_buffer: StringIO, log_path: Path = INFO_LOG_PATH) -> None:
    """Attach the buffer and file handlers exactly once per process."""
    global _configured
    if _configured:
        return

    formatter = logging.Formatter(LOG_FORMAT, style="{", datefmt=DATE_FORMAT)

    buffer_handler = logging.StreamHandler(log_buffer)
    buffer_handler.setFormatter(formatter)

    file_handler = logging.FileHandler(log_path, mode="a", encoding="UTF-8")
    file_handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(logging.INFO)
    root.addHandler(buffer_handler)
    root.addHandler(file_handler)

    _configured = True
