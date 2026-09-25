from pydantic import BaseModel

class LogMessage(BaseModel):
    key: str