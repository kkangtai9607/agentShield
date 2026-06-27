from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.benchmark.runner import evaluate_single_sample, run_benchmark
from app.core.auth import TokenUser
from app.schemas.benchmark import BenchmarkEvaluateRequest, BenchmarkEvaluateResponse

router = APIRouter()


@router.post("/benchmark/run")
def run_benchmark_endpoint(current_user: TokenUser = Depends(get_current_user)):
    return run_benchmark()


@router.get("/benchmark/report")
def get_benchmark_report(current_user: TokenUser = Depends(get_current_user)):
    return run_benchmark()


@router.post("/benchmark/evaluate", response_model=BenchmarkEvaluateResponse)
def evaluate_custom_sample(
    body: BenchmarkEvaluateRequest,
    current_user: TokenUser = Depends(get_current_user),
):
    """评委现场自拟单条样本，实时走 policy_engine.evaluate（与 Gateway 同源）。"""
    sample_id = body.label or f"custom_{body.tool_name}"
    return evaluate_single_sample(
        user_role=body.user_role,
        tool_name=body.tool_name,
        tool_args=body.tool_args,
        user_input=body.user_input,
        expected_decision=body.expected_decision,
        sample_id=sample_id,
        category="custom",
    )
