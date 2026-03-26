import json
import time

import requests


def serialize_agent_messages(messages) -> str:
    """Serialize agent chat history into the same plain-text format used by follow-up."""
    serialized = []
    for message in messages or []:
        role = getattr(message, "role", None)
        content = getattr(message, "content", None)
        if not isinstance(role, str) or not isinstance(content, str):
            continue
        serialized.append(f"[{role}]: {content}")
    return "\n".join(serialized)


def _workflow_headers(api_key: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }


def _iter_sse_payloads(response):
    event_name = None
    data_lines = []
    for raw_line in response.iter_lines(decode_unicode=True):
        if raw_line is None:
            continue
        line = raw_line.strip()
        if not line:
            if data_lines:
                data = "\n".join(data_lines)
                try:
                    payload = json.loads(data)
                except json.JSONDecodeError:
                    payload = data
                yield {"event": event_name, "data": payload}
            event_name = None
            data_lines = []
            continue
        if line.startswith("event:"):
            event_name = line.split(":", 1)[1].strip()
        elif line.startswith("data:"):
            data_lines.append(line.split(":", 1)[1].strip())

    if data_lines:
        data = "\n".join(data_lines)
        try:
            payload = json.loads(data)
        except json.JSONDecodeError:
            payload = data
        yield {"event": event_name, "data": payload}


def _find_in_payload(payload, target_keys):
    if isinstance(payload, dict):
        for key, value in payload.items():
            if key in target_keys:
                return value
            found = _find_in_payload(value, target_keys)
            if found is not None:
                return found
    elif isinstance(payload, list):
        for item in payload:
            found = _find_in_payload(item, target_keys)
            if found is not None:
                return found
    return None


def _get_workflow_run_result(*, api_url: str, api_key: str, workflow_run_id: str, timeout: int):
    response = requests.get(
        f"{api_url.rstrip('/')}/v1/workflows/run/{workflow_run_id}",
        headers=_workflow_headers(api_key),
        timeout=timeout,
    )
    response.raise_for_status()
    payload = response.json()
    data = payload.get("data", {}) if isinstance(payload, dict) else {}
    return data


def _run_dify_workflow_streaming(*, api_url: str, api_key: str, inputs: dict, user_id=None, timeout: int = 300):
    response = requests.post(
        f"{api_url.rstrip('/')}/v1/workflows/run",
        headers=_workflow_headers(api_key),
        json={
            "inputs": inputs,
            "response_mode": "streaming",
            "user": str(user_id or "agent"),
        },
        timeout=timeout,
        stream=True,
    )
    response.raise_for_status()

    workflow_run_id = None
    final_outputs = None
    for chunk in _iter_sse_payloads(response):
        payload = chunk.get("data")
        if isinstance(payload, dict):
            workflow_run_id = workflow_run_id or _find_in_payload(payload, {"workflow_run_id"})
            outputs = _find_in_payload(payload, {"outputs"})
            if outputs is not None:
                final_outputs = outputs

    if final_outputs is not None:
        return final_outputs

    if not workflow_run_id:
        raise RuntimeError("Dify streaming workflow did not return workflow_run_id")

    deadline = time.time() + timeout
    while time.time() < deadline:
        result = _get_workflow_run_result(
            api_url=api_url,
            api_key=api_key,
            workflow_run_id=str(workflow_run_id),
            timeout=timeout,
        )
        status = result.get("status")
        if status in {"succeeded", "completed", "success"}:
            return result.get("outputs", {})
        if status in {"failed", "stopped"}:
            raise RuntimeError(f"Dify workflow run finished with status={status}")
        time.sleep(2)

    raise RuntimeError("Timed out while waiting for Dify workflow result")


def run_dify_workflow(*, api_url: str, api_key: str, inputs: dict, user_id=None, timeout: int = 120, response_mode: str = "blocking"):
    """Run a Dify workflow and return raw outputs."""
    if response_mode == "streaming":
        return _run_dify_workflow_streaming(
            api_url=api_url,
            api_key=api_key,
            inputs=inputs,
            user_id=user_id,
            timeout=timeout,
        )

    response = requests.post(
        f"{api_url.rstrip('/')}/v1/workflows/run",
        headers=_workflow_headers(api_key),
        json={
            "inputs": inputs,
            "response_mode": "blocking",
            "user": str(user_id or "agent"),
        },
        timeout=timeout,
    )
    response.raise_for_status()
    payload = response.json()
    return payload.get("data", {}).get("outputs", {})


def json_input(value) -> str:
    """Serialize an input for Dify while tolerating non-JSON-native values."""
    return json.dumps(value, default=str)
