#!/usr/bin/env python3
import base64
import fcntl
import json
import os
import pty
import selectors
import signal
import struct
import subprocess
import sys
import termios
from typing import Any


def send_message(message: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(message, separators=(",", ":")) + "\n")
    sys.stdout.flush()


def set_winsize(fd: int, cols: int, rows: int) -> None:
    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))


def get_shell_args(shell_path: str) -> list[str]:
    if os.name == "nt":
        return [shell_path]
    return [shell_path, "-i"]


shell_path = sys.argv[1]
cwd = sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 120
rows = int(sys.argv[4]) if len(sys.argv) > 4 else 30

master_fd, slave_fd = pty.openpty()
set_winsize(master_fd, cols, rows)

process = subprocess.Popen(
    get_shell_args(shell_path),
    cwd=cwd,
    env=os.environ.copy(),
    stdin=slave_fd,
    stdout=slave_fd,
    stderr=slave_fd,
    start_new_session=True,
    close_fds=True,
)
os.close(slave_fd)

selector = selectors.DefaultSelector()
selector.register(master_fd, selectors.EVENT_READ, "pty")
selector.register(sys.stdin.buffer, selectors.EVENT_READ, "stdin")
stdin_buffer = b""
pty_open = True
shutdown_requested = False
shutdown_started_at = 0.0

while True:
    for key, _ in selector.select(timeout=0.1):
        if key.data == "pty":
            try:
                chunk = os.read(master_fd, 65536)
            except OSError:
                chunk = b""

            if chunk:
                send_message({"type": "output", "data": base64.b64encode(chunk).decode("ascii")})
            else:
                pty_open = False
                selector.unregister(master_fd)
                os.close(master_fd)
        else:
            chunk = os.read(sys.stdin.fileno(), 65536)
            if not chunk:
                shutdown_requested = True
                continue

            stdin_buffer += chunk
            while b"\n" in stdin_buffer:
                raw_line, stdin_buffer = stdin_buffer.split(b"\n", 1)
                if not raw_line:
                    continue

                message = json.loads(raw_line.decode("utf-8"))
                message_type = message.get("type")

                if message_type == "input":
                    data = base64.b64decode(message["data"])
                    os.write(master_fd, data)
                elif message_type == "resize":
                    set_winsize(master_fd, int(message["cols"]), int(message["rows"]))
                elif message_type == "shutdown":
                    shutdown_requested = True
                    shutdown_started_at = __import__("time").monotonic()
                    try:
                        os.killpg(process.pid, signal.SIGTERM)
                    except ProcessLookupError:
                        pass

    if shutdown_requested and process.poll() is None:
        if __import__("time").monotonic() - shutdown_started_at > 1.0:
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
        continue

    if process.poll() is not None and not pty_open:
        break

send_message({"type": "exit", "code": process.wait()})
