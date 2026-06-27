from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user
from app.core.auth import TokenUser
from app.scenarios.scenario_runner import list_scenarios, run_scenario

router = APIRouter()


@router.get("/scenarios")
def get_scenarios(current_user: TokenUser = Depends(get_current_user)):
    return list_scenarios()


@router.post("/scenarios/{scenario_id}/run")
def run_scenario_endpoint(
    scenario_id: str,
    current_user: TokenUser = Depends(get_current_user),
):
    try:
        return run_scenario(scenario_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
