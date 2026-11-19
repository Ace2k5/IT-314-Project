"""Pydantic request models for the backend HTTP API.

Request bodies use ``snake_case`` because that is both the Python convention and
the format the frontend converts to in ``src/WebSys/src/api/backendClient.ts``.
"""

from __future__ import annotations

from pydantic import BaseModel


class LogMessage(BaseModel):
    message: str


class Credentials(BaseModel):
    api: str
    key: str = ""


class EarthquakeDateRequest(BaseModel):
    year: int
    month: int
    day: int


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    api: str
    key: str = ""
    selected_model: str
    search_key: str = ""
    session_id: str
    history: list[ChatMessage]

class Shelter(BaseModel):
    """Reserved: shape of a row in the ``Shelters`` table."""

    id: int
    name: str
    lat: float
    lon: float
    type: str
    address: str | None = None
