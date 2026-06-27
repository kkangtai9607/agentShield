from typing import Any, Dict

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.api.deps import get_current_user
from app.core.auth import TokenUser
from app.core.config import get_settings
from app.shield.semantic_checker import effective_semantic_mode, run_semantic_check

router = APIRouter()


class SemanticCheckRequest(BaseModel):
    text: str = ""
    user_input: str = ""
    tool_name: str = ""
    tool_args: Dict[str, Any] = Field(default_factory=dict)
    tool_output: str = ""


@router.get("/shield/semantic/status")
def semantic_check_status():
    settings = get_settings()
    return {
        "enabled": settings.SEMANTIC_CHECK_ENABLED,
        "mode": effective_semantic_mode(),
        "similarity_threshold": settings.SEMANTIC_SIMILARITY_THRESHOLD,
        "block_threshold": settings.SEMANTIC_BLOCK_THRESHOLD,
        "confirm_threshold": settings.SEMANTIC_CONFIRM_THRESHOLD,
        "llm_available": bool(settings.API_KEY.strip()),
    }


@router.post("/shield/semantic-check")
def semantic_check(
    request: SemanticCheckRequest,
    current_user: TokenUser = Depends(get_current_user),
):
    _ = current_user
    user_input = request.user_input or request.text
    result = run_semantic_check(
        user_input=user_input,
        tool_name=request.tool_name,
        tool_args=request.tool_args,
        tool_output=request.tool_output,
    )
    return result.to_dict()
