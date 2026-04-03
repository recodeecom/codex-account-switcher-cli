from __future__ import annotations

import asyncio
import fcntl
import json
import os
import pty
import shlex
import signal
import struct
import subprocess
import termios
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState

from app.core.config.settings import BASE_DIR

DEFAULT_TERMINAL_COLS = 120
DEFAULT_TERMINAL_ROWS = 36
_DEFAULT_CHUNK_SIZE = 4096


@dataclass(slots=True)
class TerminalLaunchConfig:
    command: str
    cwd: Path
    shell: str


class TerminalLaunchError(RuntimeError):
    """Raised when terminal launch cannot proceed."""


def resolve_terminal_launch_config() -> TerminalLaunchConfig:
    raw_command = os.environ.get("CODEX_LB_TERMINAL_COMMAND", "codex").strip()
    if not raw_command:
        raise TerminalLaunchError("Terminal command is empty. Set CODEX_LB_TERMINAL_COMMAND.")

    raw_cwd = os.environ.get("CODEX_LB_TERMINAL_CWD", "").strip()
    cwd = Path(raw_cwd).expanduser() if raw_cwd else BASE_DIR

    shell = os.environ.get("SHELL", "/bin/bash").strip() or "/bin/bash"
    return TerminalLaunchConfig(command=raw_command, cwd=cwd, shell=shell)


@dataclass(slots=True)
class TerminalProcess:
    process: subprocess.Popen[bytes]
    master_fd: int

    @classmethod
    def start(cls, *, snapshot_name: str) -> tuple["TerminalProcess", TerminalLaunchConfig]:
        launch = resolve_terminal_launch_config()
        if not launch.cwd.is_dir():
            raise TerminalLaunchError(f"Terminal working directory does not exist: {launch.cwd}")

        startup_script = f"cd {shlex.quote(str(launch.cwd))} && {launch.command}"
        argv = [launch.shell, "-lc", startup_script]

        master_fd, slave_fd = pty.openpty()
        env = os.environ.copy()
        env.setdefault("TERM", "xterm-256color")
        env["CODEX_AUTH_ACTIVE_SNAPSHOT"] = snapshot_name

        try:
            process = subprocess.Popen(
                argv,
                stdin=slave_fd,
                stdout=slave_fd,
                stderr=slave_fd,
                env=env,
                start_new_session=True,
                close_fds=True,
            )
        except Exception as exc:  # pragma: no cover - exercised via caller behavior
            os.close(master_fd)
            os.close(slave_fd)
            raise TerminalLaunchError(f"Failed to launch terminal: {exc}") from exc
        finally:
            os.close(slave_fd)

        terminal_process = cls(process=process, master_fd=master_fd)
        terminal_process.resize(cols=DEFAULT_TERMINAL_COLS, rows=DEFAULT_TERMINAL_ROWS)
        return terminal_process, launch

    def write(self, data: str) -> None:
        if data:
            os.write(self.master_fd, data.encode("utf-8", errors="ignore"))

    def resize(self, *, cols: int, rows: int) -> None:
        packed = struct.pack("HHHH", max(rows, 1), max(cols, 1), 0, 0)
        fcntl.ioctl(self.master_fd, termios.TIOCSWINSZ, packed)

    async def read_chunk(self) -> bytes:
        return await asyncio.to_thread(os.read, self.master_fd, _DEFAULT_CHUNK_SIZE)

    async def wait(self) -> int:
        return await asyncio.to_thread(self.process.wait)

    async def terminate(self) -> None:
        if self.process.poll() is None:
            try:
                if hasattr(os, "killpg"):
                    os.killpg(self.process.pid, signal.SIGTERM)
                else:  # pragma: no cover - Windows fallback
                    self.process.terminate()
            except ProcessLookupError:
                pass
            try:
                await asyncio.to_thread(self.process.wait, 1)
            except subprocess.TimeoutExpired:
                if self.process.poll() is None:
                    try:
                        if hasattr(os, "killpg"):
                            os.killpg(self.process.pid, signal.SIGKILL)
                        else:  # pragma: no cover - Windows fallback
                            self.process.kill()
                    except ProcessLookupError:
                        pass
                    await asyncio.to_thread(self.process.wait)

        try:
            os.close(self.master_fd)
        except OSError:
            pass


async def stream_terminal_session(
    *,
    websocket: WebSocket,
    terminal_process: TerminalProcess,
    launch: TerminalLaunchConfig,
    account_id: str,
    snapshot_name: str,
) -> None:
    await _safe_send(
        websocket,
        {
            "type": "ready",
            "accountId": account_id,
            "snapshotName": snapshot_name,
            "cwd": str(launch.cwd),
            "command": launch.command,
        },
    )

    output_task = asyncio.create_task(_relay_terminal_output(websocket, terminal_process))
    exit_task = asyncio.create_task(_relay_terminal_exit(websocket, terminal_process))

    try:
        while True:
            if exit_task.done():
                break

            try:
                payload = await asyncio.wait_for(websocket.receive_text(), timeout=0.2)
            except TimeoutError:
                continue
            except WebSocketDisconnect:
                break

            _handle_client_message(payload, terminal_process)
    finally:
        await terminal_process.terminate()
        output_task.cancel()
        exit_task.cancel()
        await asyncio.gather(output_task, exit_task, return_exceptions=True)

        if websocket.application_state == WebSocketState.CONNECTED:
            await websocket.close(code=1000)


def _handle_client_message(payload: str, terminal_process: TerminalProcess) -> None:
    try:
        message = json.loads(payload)
    except json.JSONDecodeError:
        return

    if not isinstance(message, dict):
        return

    message_type = message.get("type")
    if message_type == "input":
        data = message.get("data")
        if isinstance(data, str):
            terminal_process.write(data)
        return

    if message_type == "resize":
        cols = _coerce_positive_int(message.get("cols"), DEFAULT_TERMINAL_COLS)
        rows = _coerce_positive_int(message.get("rows"), DEFAULT_TERMINAL_ROWS)
        terminal_process.resize(cols=cols, rows=rows)


async def _relay_terminal_output(websocket: WebSocket, terminal_process: TerminalProcess) -> None:
    while True:
        try:
            chunk = await terminal_process.read_chunk()
        except OSError:
            break
        if not chunk:
            break

        text = chunk.decode("utf-8", errors="replace")
        await _safe_send(websocket, {"type": "output", "data": text})


async def _relay_terminal_exit(websocket: WebSocket, terminal_process: TerminalProcess) -> None:
    code = await terminal_process.wait()
    await _safe_send(websocket, {"type": "exit", "code": code})


async def _safe_send(websocket: WebSocket, payload: dict[str, Any]) -> None:
    if websocket.application_state != WebSocketState.CONNECTED:
        return
    try:
        await websocket.send_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
    except RuntimeError:
        return


def _coerce_positive_int(value: object, default: int) -> int:
    if isinstance(value, bool):
        return default
    if isinstance(value, int):
        return max(value, 1)
    if isinstance(value, float):
        return max(int(value), 1)
    return default
