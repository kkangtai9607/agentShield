"""Benchmark 运行器：策略检出率、误报率、平均延迟。"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any, Dict, List

import yaml

from app.shield.policy_engine import policy_engine

SAMPLES_PATH = Path(__file__).resolve().parent / "samples.yaml"

DECISION_SEVERITY = {"allow": 0, "mask": 1, "confirm": 2, "block": 3}


def _load_samples() -> List[Dict[str, Any]]:
    with open(SAMPLES_PATH, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return list(data.get("samples", []))


def _decision_matches(actual: str, expected: str) -> bool:
    if actual == expected:
        return True
    # 攻击样本：实际决策更严（block vs expected confirm）仍算检出成功
    if DECISION_SEVERITY.get(actual, 0) >= DECISION_SEVERITY.get(expected, 0):
        if expected in ("block", "confirm", "mask") and actual in ("block", "confirm", "mask"):
            return expected != "allow"
    return False


def evaluate_single_sample(
    *,
    user_role: str,
    tool_name: str,
    tool_args: Dict[str, Any],
    user_input: str = "",
    expected_decision: str | None = None,
    sample_id: str = "custom",
    category: str = "custom",
) -> Dict[str, Any]:
    """评估单条样本（固定集与现场自拟共用同一策略引擎路径）。"""
    t0 = time.perf_counter()
    eval_result = policy_engine.evaluate(
        user_role=user_role,
        tool_name=tool_name,
        tool_args=tool_args,
        user_input=user_input,
    )
    elapsed_ms = (time.perf_counter() - t0) * 1000
    actual = eval_result["decision"]
    passed = _decision_matches(actual, expected_decision) if expected_decision else None

    return {
        "id": sample_id,
        "category": category,
        "user_role": user_role,
        "tool_name": tool_name,
        "tool_args": tool_args,
        "user_input": user_input,
        "expected_decision": expected_decision,
        "actual_decision": actual,
        "risk_score": eval_result["risk_score"],
        "risk_level": eval_result["risk_level"],
        "reason": eval_result.get("reason", ""),
        "suggestion": eval_result.get("suggestion", ""),
        "passed": passed,
        "latency_ms": round(elapsed_ms, 3),
        "engine": "policy_engine.evaluate",
    }


def run_benchmark() -> Dict[str, Any]:
    samples = _load_samples()
    results: List[Dict[str, Any]] = []
    latencies_ms: List[float] = []

    passed = 0
    failed = 0
    by_category: Dict[str, Dict[str, int]] = {}

    for sample in samples:
        cat = sample.get("category", "normal")
        by_category.setdefault(cat, {"total": 0, "passed": 0})

        row = evaluate_single_sample(
            user_role=sample["user_role"],
            tool_name=sample["tool_name"],
            tool_args=sample.get("tool_args", {}),
            user_input=sample.get("user_input", ""),
            expected_decision=sample["expected_decision"],
            sample_id=sample["id"],
            category=cat,
        )
        latencies_ms.append(row["latency_ms"])
        ok = bool(row["passed"])

        by_category[cat]["total"] += 1
        if ok:
            passed += 1
            by_category[cat]["passed"] += 1
        else:
            failed += 1

        results.append(
            {
                "id": row["id"],
                "category": row["category"],
                "expected_decision": row["expected_decision"],
                "actual_decision": row["actual_decision"],
                "risk_score": row["risk_score"],
                "passed": ok,
                "latency_ms": row["latency_ms"],
                "reason": row["reason"],
            }
        )

    total = len(samples)
    detection_rate = round(passed / total * 100, 1) if total else 0.0
    false_positive = sum(
        1 for r in results if not r["passed"] and r["category"] == "normal"
    )
    false_positive_rate = (
        round(false_positive / by_category.get("normal", {}).get("total", 1) * 100, 1)
        if by_category.get("normal", {}).get("total")
        else 0.0
    )
    avg_latency = round(sum(latencies_ms) / len(latencies_ms), 3) if latencies_ms else 0.0

    category_stats = {
        cat: {
            "total": stats["total"],
            "passed": stats["passed"],
            "rate": round(stats["passed"] / stats["total"] * 100, 1) if stats["total"] else 0,
        }
        for cat, stats in by_category.items()
    }

    return {
        "total_samples": total,
        "passed": passed,
        "failed": failed,
        "detection_rate_percent": detection_rate,
        "false_positive_count": false_positive,
        "false_positive_rate_percent": false_positive_rate,
        "avg_latency_ms": avg_latency,
        "category_stats": category_stats,
        "results": results,
    }
