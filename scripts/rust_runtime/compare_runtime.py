#!/usr/bin/env python3
"""Compare endpoint contract parity and latency between Python and Rust runtimes."""

from __future__ import annotations

import argparse
import hashlib
import json
import statistics
import sys
import time
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass
from typing import Any, Iterable


@dataclass(slots=True)
class ProbeSample:
    status: int
    elapsed_ms: float
    body_sha256: str
    content_type: str
    json_canonical: str | None


@dataclass(slots=True)
class EndpointReport:
    endpoint: str
    python_status: int
    rust_status: int
    status_match: bool
    python_content_type: str
    rust_content_type: str
    content_type_match: bool
    body_hash_match: bool
    json_body_match: bool
    contract_match: bool
    mismatch_reasons: list[str]
    python_p50_ms: float
    rust_p50_ms: float
    python_p95_ms: float
    rust_p95_ms: float


@dataclass(slots=True)
class RuntimeComparison:
    python_base_url: str
    rust_base_url: str
    iterations: int
    strict: bool
    overall_match: bool
    reports: list[EndpointReport]


def _normalize_content_type(value: str | None) -> str:
    if not value:
        return ""
    return value.split(";", 1)[0].strip().lower()


def _canonical_json(body: bytes) -> str | None:
    try:
        parsed = json.loads(body)
    except Exception:
        return None
    return json.dumps(parsed, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _fetch_once(base_url: str, endpoint: str, timeout_seconds: float) -> ProbeSample:
    url = f"{base_url.rstrip('/')}{endpoint}"
    req = urllib.request.Request(url, method="GET")
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
            body = resp.read()
            status = resp.status
            content_type = _normalize_content_type(resp.headers.get("Content-Type"))
    except urllib.error.HTTPError as exc:
        body = exc.read() if exc.fp else b""
        status = exc.code
        content_type = _normalize_content_type(exc.headers.get("Content-Type") if exc.headers else "")
    elapsed_ms = (time.perf_counter() - started) * 1000
    return ProbeSample(
        status=status,
        elapsed_ms=elapsed_ms,
        body_sha256=hashlib.sha256(body).hexdigest(),
        content_type=content_type,
        json_canonical=_canonical_json(body),
    )


def _percentile(values: Iterable[float], pct: float) -> float:
    sorted_values = sorted(values)
    if not sorted_values:
        return 0.0
    if len(sorted_values) == 1:
        return sorted_values[0]
    idx = int(round((pct / 100) * (len(sorted_values) - 1)))
    return sorted_values[idx]


def _probe_runtime(base_url: str, endpoint: str, iterations: int, timeout_seconds: float) -> list[ProbeSample]:
    return [_fetch_once(base_url, endpoint, timeout_seconds) for _ in range(iterations)]


def _build_report(
    endpoint: str,
    python_samples: list[ProbeSample],
    rust_samples: list[ProbeSample],
) -> EndpointReport:
    python_status = statistics.mode(sample.status for sample in python_samples)
    rust_status = statistics.mode(sample.status for sample in rust_samples)

    python_content_type = statistics.mode(sample.content_type for sample in python_samples)
    rust_content_type = statistics.mode(sample.content_type for sample in rust_samples)

    python_body = statistics.mode(sample.body_sha256 for sample in python_samples)
    rust_body = statistics.mode(sample.body_sha256 for sample in rust_samples)

    python_json = statistics.mode(sample.json_canonical for sample in python_samples)
    rust_json = statistics.mode(sample.json_canonical for sample in rust_samples)

    status_match = python_status == rust_status
    content_type_match = python_content_type == rust_content_type
    body_hash_match = python_body == rust_body
    json_body_match = python_json == rust_json
    contract_match = status_match and content_type_match and json_body_match

    mismatch_reasons: list[str] = []
    if not status_match:
        mismatch_reasons.append("status")
    if not content_type_match:
        mismatch_reasons.append("content_type")
    if not json_body_match:
        mismatch_reasons.append("json_body")

    python_latencies = [sample.elapsed_ms for sample in python_samples]
    rust_latencies = [sample.elapsed_ms for sample in rust_samples]

    return EndpointReport(
        endpoint=endpoint,
        python_status=python_status,
        rust_status=rust_status,
        status_match=status_match,
        python_content_type=python_content_type,
        rust_content_type=rust_content_type,
        content_type_match=content_type_match,
        body_hash_match=body_hash_match,
        json_body_match=json_body_match,
        contract_match=contract_match,
        mismatch_reasons=mismatch_reasons,
        python_p50_ms=round(_percentile(python_latencies, 50), 2),
        rust_p50_ms=round(_percentile(rust_latencies, 50), 2),
        python_p95_ms=round(_percentile(python_latencies, 95), 2),
        rust_p95_ms=round(_percentile(rust_latencies, 95), 2),
    )


def run(args: argparse.Namespace) -> RuntimeComparison:
    reports: list[EndpointReport] = []
    for endpoint in args.endpoints:
        py_samples = _probe_runtime(args.python_base_url, endpoint, args.iterations, args.timeout)
        rs_samples = _probe_runtime(args.rust_base_url, endpoint, args.iterations, args.timeout)
        reports.append(_build_report(endpoint, py_samples, rs_samples))

    overall_match = all(report.contract_match for report in reports)
    return RuntimeComparison(
        python_base_url=args.python_base_url,
        rust_base_url=args.rust_base_url,
        iterations=args.iterations,
        strict=args.strict,
        overall_match=overall_match,
        reports=reports,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--python-base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--rust-base-url", default="http://127.0.0.1:8099")
    parser.add_argument("--iterations", type=int, default=20)
    parser.add_argument("--timeout", type=float, default=5.0)
    parser.add_argument(
        "--endpoints",
        nargs="+",
        default=["/health", "/health/live", "/health/ready", "/health/startup"],
        help="List of endpoint paths to compare.",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit with status 1 when any endpoint has contract mismatch.",
    )
    parser.add_argument("--output", default="", help="Optional path to write JSON result.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    result = run(args)

    payload: dict[str, Any] = {
        "python_base_url": result.python_base_url,
        "rust_base_url": result.rust_base_url,
        "iterations": result.iterations,
        "strict": result.strict,
        "overall_match": result.overall_match,
        "reports": [asdict(report) for report in result.reports],
    }

    print(json.dumps(payload, indent=2, sort_keys=True))
    if args.output:
        with open(args.output, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2, sort_keys=True)
            handle.write("\n")

    if args.strict and not result.overall_match:
        sys.exit(1)


if __name__ == "__main__":
    main()
