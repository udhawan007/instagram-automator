#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

PID=$(lsof -Pi :3750 -sTCP:LISTEN -t)
if [ -n "$PID" ]; then
    echo "Stopping Instagram Automator (PID: $PID)..."
    kill $PID
    rm -f "$DIR/.server.pid"
    echo "Stopped."
else
    echo "Instagram Automator is not running."
fi
