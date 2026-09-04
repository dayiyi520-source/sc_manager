#!/usr/bin/env python3

import argparse
import json
import os
import signal
import socket
import subprocess
import sys
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


RUNTIME_PATH = Path(".enterprise-app-factory/runtime")
STATE_NAME = "services.json"
LOCK_NAME = "services.lock"
LOGS_NAME = "logs"


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def runtime_paths(project_root):
    runtime_dir = Path(project_root).resolve() / RUNTIME_PATH
    return {
        "runtime": runtime_dir,
        "state": runtime_dir / STATE_NAME,
        "lock": runtime_dir / LOCK_NAME,
        "logs": runtime_dir / LOGS_NAME,
    }


def ensure_runtime(project_root):
    paths = runtime_paths(project_root)
    paths["logs"].mkdir(parents=True, exist_ok=True)
    ignore_path = paths["runtime"] / ".gitignore"
    expected = "*\n!.gitignore\n"
    if not ignore_path.exists() or ignore_path.read_text(encoding="utf-8") != expected:
        ignore_path.write_text(expected, encoding="utf-8")
    return paths


@contextmanager
def project_lock(lock_path):
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    with lock_path.open("a+b") as handle:
        handle.seek(0)
        if handle.read(1) == b"":
            handle.seek(0)
            handle.write(b"0")
            handle.flush()
        handle.seek(0)
        if os.name == "nt":
            import msvcrt

            msvcrt.locking(handle.fileno(), msvcrt.LK_LOCK, 1)
            try:
                yield
            finally:
                handle.seek(0)
                msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
        else:
            import fcntl

            fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
            try:
                yield
            finally:
                fcntl.flock(handle.fileno(), fcntl.LOCK_UN)


def read_state(path):
    if not path.exists():
        return {"version": 1, "services": {}}
    try:
        state = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {"version": 1, "services": {}}
    if not isinstance(state, dict) or not isinstance(state.get("services"), dict):
        return {"version": 1, "services": {}}
    state["version"] = 1
    return state


def write_state(path, state):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(
        json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    os.replace(str(temporary), str(path))


def pid_is_alive(pid):
    try:
        pid = int(pid)
    except (TypeError, ValueError):
        return False
    if pid <= 0:
        return False
    try:
        os.kill(pid, 0)
    except OSError:
        return False
    return True


def port_is_open(host, port, timeout=0.25):
    try:
        with socket.create_connection((host, int(port)), timeout=timeout):
            return True
    except (OSError, TypeError, ValueError):
        return False


def health_is_ready(url, timeout=0.5):
    if not url:
        return True
    try:
        request = Request(url, headers={"Cache-Control": "no-cache"})
        with urlopen(request, timeout=timeout) as response:
            return response.status < 500
    except HTTPError as error:
        return error.code < 500
    except (OSError, URLError, ValueError):
        return False


def service_is_live(service):
    host = service.get("host") or "127.0.0.1"
    port = service.get("port")
    if service.get("pid") and not pid_is_alive(service.get("pid")):
        return False
    if not port_is_open(host, port):
        return False
    return health_is_ready(service.get("healthUrl"))


def clean_state(state):
    services = state.setdefault("services", {})
    stale = []
    for name, service in list(services.items()):
        if not isinstance(service, dict) or not service_is_live(service):
            stale.append(name)
            services.pop(name, None)
    return stale


def relative_to_project(path, project_root):
    try:
        return str(Path(path).resolve().relative_to(Path(project_root).resolve()))
    except ValueError:
        return str(Path(path).resolve())


def render_service(name, service):
    return (
        f"{name}: {service.get('url')} "
        f"(port {service.get('port')}, pid {service.get('pid') or 'external'})"
    )


def choose_port(host, preferred, search_limit):
    preferred = int(preferred)
    if preferred < 1 or preferred > 65535:
        raise SystemExit("Port must be between 1 and 65535.")
    last_port = min(65535, preferred + int(search_limit))
    for port in range(preferred, last_port + 1):
        if not port_is_open(host, port):
            return port
    raise SystemExit(
        f"No available port found from {preferred} through {last_port} on {host}."
    )


def substitute_port(values, port):
    return [str(value).replace("{port}", str(port)) for value in values]


def resolve_cwd(project_root, cwd):
    project_root = Path(project_root).resolve()
    resolved = (project_root / cwd).resolve() if cwd else project_root
    try:
        resolved.relative_to(project_root)
    except ValueError:
        raise SystemExit(f"Service cwd must stay inside the project: {resolved}")
    if not resolved.is_dir():
        raise SystemExit(f"Service cwd does not exist: {resolved}")
    return resolved


def start_process(command, cwd, log_path, environment):
    log_handle = log_path.open("ab")
    kwargs = {
        "cwd": str(cwd),
        "env": environment,
        "stdin": subprocess.DEVNULL,
        "stdout": log_handle,
        "stderr": subprocess.STDOUT,
    }
    if os.name == "nt":
        kwargs["creationflags"] = (
            getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
            | getattr(subprocess, "DETACHED_PROCESS", 0)
        )
    else:
        kwargs["start_new_session"] = True
    try:
        return subprocess.Popen(command, **kwargs)
    finally:
        log_handle.close()


def stop_process(service):
    pid = int(service.get("pid") or 0)
    if pid <= 0 or not pid_is_alive(pid):
        return
    if os.name == "nt":
        subprocess.run(
            ["taskkill", "/PID", str(pid), "/T", "/F"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
        return
    try:
        if service.get("managed"):
            os.killpg(pid, signal.SIGTERM)
        else:
            os.kill(pid, signal.SIGTERM)
    except OSError:
        return
    deadline = time.time() + 5
    while time.time() < deadline:
        if not pid_is_alive(pid) or not port_is_open(
            service.get("host") or "127.0.0.1", service.get("port")
        ):
            return
        time.sleep(0.1)
    try:
        if service.get("managed"):
            os.killpg(pid, signal.SIGKILL)
        else:
            os.kill(pid, signal.SIGKILL)
    except OSError:
        pass


def tail_log(path, max_lines=20):
    try:
        lines = Path(path).read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError:
        return ""
    return "\n".join(lines[-max_lines:])


def command_status(args):
    project_root = Path(args.project).resolve()
    paths = ensure_runtime(project_root)
    with project_lock(paths["lock"]):
        state = read_state(paths["state"])
        stale = clean_state(state)
        if stale:
            write_state(paths["state"], state)
        services = state["services"]
        if args.name:
            services = {args.name: services[args.name]} if args.name in services else {}
        if args.json:
            print(json.dumps({"services": services, "removedStale": stale}, ensure_ascii=False))
        elif not services:
            print("No live local services are registered for this project.")
        else:
            for name, service in sorted(services.items()):
                print(render_service(name, service))
    return 0


def command_register(args):
    project_root = Path(args.project).resolve()
    paths = ensure_runtime(project_root)
    host = args.host
    if not port_is_open(host, args.port):
        raise SystemExit(f"Cannot register {args.name}: {host}:{args.port} is not listening.")
    if args.pid and not pid_is_alive(args.pid):
        raise SystemExit(f"Cannot register {args.name}: PID {args.pid} is not running.")
    url = (args.url or "http://127.0.0.1:{port}").replace("{port}", str(args.port))
    health_url = (args.health_url or "").replace("{port}", str(args.port)) or None
    service = {
        "host": host,
        "port": args.port,
        "pid": args.pid,
        "url": url,
        "healthUrl": health_url,
        "managed": False,
        "cwd": relative_to_project(args.cwd or project_root, project_root),
        "startedAt": utc_now(),
    }
    with project_lock(paths["lock"]):
        state = read_state(paths["state"])
        clean_state(state)
        existing = state["services"].get(args.name)
        if existing and service_is_live(existing):
            print("Reusing " + render_service(args.name, existing))
            return 0
        state["services"][args.name] = service
        write_state(paths["state"], state)
    print("Registered " + render_service(args.name, service))
    return 0


def command_start(args):
    project_root = Path(args.project).resolve()
    paths = ensure_runtime(project_root)
    command = list(args.command)
    if command and command[0] == "--":
        command = command[1:]
    if not command:
        raise SystemExit("A service command is required after --.")

    with project_lock(paths["lock"]):
        state = read_state(paths["state"])
        clean_state(state)
        existing = state["services"].get(args.name)
        if existing and service_is_live(existing):
            print("Reusing " + render_service(args.name, existing))
            return 0

        port = choose_port(args.host, args.port, args.search_limit)
        command = substitute_port(command, port)
        url = (args.url or "http://127.0.0.1:{port}").replace("{port}", str(port))
        health_url = (args.health_url or "").replace("{port}", str(port)) or None
        cwd = resolve_cwd(project_root, args.cwd)
        log_path = paths["logs"] / f"{args.name}.log"
        environment = os.environ.copy()
        environment["PORT"] = str(port)
        environment["EAF_LOCAL_SERVICE_PORT"] = str(port)
        process = start_process(command, cwd, log_path, environment)
        deadline = time.time() + args.wait
        ready = False
        while time.time() < deadline:
            if process.poll() is not None:
                break
            if port_is_open(args.host, port) and health_is_ready(health_url):
                ready = True
                break
            time.sleep(0.2)

        if not ready:
            service = {"pid": process.pid, "managed": True}
            stop_process(service)
            details = tail_log(log_path)
            message = f"Service {args.name} did not become ready on {args.host}:{port}."
            if details:
                message += f"\nLast log lines:\n{details}"
            raise SystemExit(message)

        service = {
            "host": args.host,
            "port": port,
            "pid": process.pid,
            "url": url,
            "healthUrl": health_url,
            "managed": True,
            "cwd": relative_to_project(cwd, project_root),
            "logPath": relative_to_project(log_path, project_root),
            "startedAt": utc_now(),
        }
        state["services"][args.name] = service
        write_state(paths["state"], state)
    print("Started " + render_service(args.name, service))
    return 0


def command_stop(args):
    project_root = Path(args.project).resolve()
    paths = ensure_runtime(project_root)
    with project_lock(paths["lock"]):
        state = read_state(paths["state"])
        service = state.setdefault("services", {}).pop(args.name, None)
        if not service:
            print(f"Local service {args.name} is not registered.")
            return 1
        if service.get("managed") and service.get("pid"):
            stop_process(service)
        write_state(paths["state"], state)
    print(f"Stopped local service {args.name} and removed its project registration.")
    return 0


def build_parser():
    parser = argparse.ArgumentParser(
        description="Share local service ports and processes across Codex conversations."
    )
    parser.add_argument("--project", default=".", help="Project root.")
    subparsers = parser.add_subparsers(dest="action")

    status = subparsers.add_parser("status", help="List live project services and clean stale entries.")
    status.add_argument("--name")
    status.add_argument("--json", action="store_true")
    status.set_defaults(handler=command_status)

    register = subparsers.add_parser("register", help="Register an already running service.")
    register.add_argument("--name", required=True)
    register.add_argument("--port", required=True, type=int)
    register.add_argument("--host", default="127.0.0.1")
    register.add_argument("--pid", type=int)
    register.add_argument("--url")
    register.add_argument("--health-url")
    register.add_argument("--cwd")
    register.set_defaults(handler=command_register)

    start = subparsers.add_parser("start", help="Start or reuse one project service.")
    start.add_argument("--name", required=True)
    start.add_argument("--port", required=True, type=int)
    start.add_argument("--host", default="127.0.0.1")
    start.add_argument("--url")
    start.add_argument("--health-url")
    start.add_argument("--cwd")
    start.add_argument("--wait", type=float, default=30.0)
    start.add_argument("--search-limit", type=int, default=100)
    start.add_argument("command", nargs=argparse.REMAINDER)
    start.set_defaults(handler=command_start)

    stop = subparsers.add_parser("stop", help="Stop a managed service or unregister an external one.")
    stop.add_argument("--name", required=True)
    stop.set_defaults(handler=command_stop)
    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()
    if not getattr(args, "action", None):
        parser.error("a command is required: status, start, register, or stop")
    raise SystemExit(args.handler(args))


if __name__ == "__main__":
    main()
