import time
from typing import Dict

_sessions: Dict[str, float] = {}

SESSION_DURATION = 60 * 60  # 1 hour in seconds


def create_session(session_id: str, expires_at: float):
    _sessions[session_id] = expires_at


def is_valid_session(session_id: str) -> bool:
    expires_at = _sessions.get(session_id)
    if not expires_at:
        return False
    if expires_at < time.time():
        _sessions.pop(session_id, None)
        return False
    return True


def delete_session(session_id: str):
    _sessions.pop(session_id, None)
