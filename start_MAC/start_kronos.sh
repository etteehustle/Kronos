#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/webui"
FRONTEND_DIR="$ROOT_DIR/webui-next"
BACKEND_LOG="$BACKEND_DIR/server.log"
BACKEND_ERR="$BACKEND_DIR/server.err.log"
FRONTEND_LOG="$FRONTEND_DIR/next-server.log"
FRONTEND_ERR="$FRONTEND_DIR/next-server.err.log"

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

port_in_use() {
  local port="$1"

  if command_exists lsof; then
    lsof -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1
  elif command_exists nc; then
    nc -z 127.0.0.1 "$port" >/dev/null 2>&1
  else
    return 1
  fi
}

open_url() {
  local url="$1"

  if command_exists open; then
    open "$url" >/dev/null 2>&1 || true
  elif command_exists xdg-open; then
    xdg-open "$url" >/dev/null 2>&1 || true
  fi
}

echo "Starting Kronos..."
echo "=================="

if command_exists python3; then
  PYTHON_BIN="python3"
elif command_exists python; then
  PYTHON_BIN="python"
else
  echo "Python was not found. Install Python first."
  exit 1
fi

if ! command_exists npm; then
  echo "npm was not found. Install Node.js/npm first."
  exit 1
fi

if [ ! -d "$BACKEND_DIR" ]; then
  echo "Backend directory not found: $BACKEND_DIR"
  exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
  echo "Frontend directory not found: $FRONTEND_DIR"
  exit 1
fi

if port_in_use 7070; then
  echo "Backend API is already running on http://localhost:7070"
else
  echo "Starting Kronos backend API on http://localhost:7070 ..."
  (
    cd "$BACKEND_DIR"
    "$PYTHON_BIN" app.py >>"$BACKEND_LOG" 2>>"$BACKEND_ERR"
  ) &
  echo "Backend PID: $!"
fi

sleep 4

if port_in_use 3000; then
  echo "Web UI is already running on http://localhost:3000"
else
  echo "Starting Kronos web UI on http://localhost:3000 ..."
  (
    cd "$FRONTEND_DIR"
    npm run dev -- --hostname 0.0.0.0 --port 3000 >>"$FRONTEND_LOG" 2>>"$FRONTEND_ERR"
  ) &
  echo "Frontend PID: $!"
fi

sleep 6
open_url "http://localhost:3000"

echo ""
echo "Kronos is starting."
echo "Backend API: http://localhost:7070"
echo "Web UI:      http://localhost:3000"
echo ""
echo "Logs:"
echo "  Backend:  $BACKEND_LOG"
echo "  Frontend: $FRONTEND_LOG"
echo ""
echo "To stop both services later, run:"
echo "  lsof -ti :7070,:3000 | xargs kill"
