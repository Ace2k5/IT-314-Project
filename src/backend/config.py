"""Runtime configuration loaded from the repository-level ``.env`` file.

The backend is started from ``src/backend`` (see ``start.bat``), so a plain
``os.getenv`` would never see the repository ``.env``.  ``load_env_file`` fills
``os.environ`` once at startup and never overwrites a value that the real
environment already provides, which keeps "environment first" behaviour: an
exported variable always wins over the file.
"""

from __future__ import annotations

import os
from pathlib import Path

# src/backend/config.py -> src/backend -> src -> repository root
REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = REPOSITORY_ROOT / ".env"

_loaded = False


def load_env_file(path: Path = ENV_PATH) -> None:
    """Populate ``os.environ`` from ``KEY=VALUE`` lines. Existing values win."""
    global _loaded
    if _loaded:
        return
    _loaded = True

    if not path.is_file():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, _, value = line.partition("=")
        key = key.strip()
        if key.startswith("export "):
            key = key[len("export "):].strip()
        if not key:
            continue

        os.environ.setdefault(key, value.strip().strip('"').strip("'"))


def get_tavily_key() -> str | None:
    """Return the Tavily key, accepting the older ``ARGUS_`` prefixed name."""
    return os.getenv("TAVILY_API_KEY") or os.getenv("ARGUS_TAVILY_API_KEY")
