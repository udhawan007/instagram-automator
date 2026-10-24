#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

# Check if port 3750 is already active
PID=$(lsof -Pi :3750 -sTCP:LISTEN -t)
if [ -z "$PID" ]; then
    echo "Starting Instagram Automator server..."
    nohup /opt/homebrew/bin/node "$DIR/server.js" >> "$DIR/automator.log" 2>&1 &
    disown
    
    # Wait for server to be responsive
    for i in {1..30}; do
        if curl -s http://localhost:3750/api/status >/dev/null 2>&1; then
            break
        fi
        sleep 0.2
    done
else
    echo "Instagram Automator is already running (PID: $PID)."
fi

# Open in default browser
open "http://localhost:3750"
