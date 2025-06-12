
#!/bin/bash

# FreePBX AMI Bridge - Restart Script

echo "=== FreePBX AMI Bridge Restart Script ==="

# Stop the current AMI Bridge process
echo "Stopping AMI Bridge server..."
pkill -f "node.*ami-bridge.js" || echo "No existing AMI Bridge process found"

# Wait a moment for cleanup
sleep 2

# Navigate to server directory
cd /var/www/html/freepbx-crm/server

# Start the AMI Bridge server
echo "Starting AMI Bridge server..."
nohup node ami-bridge.js > ami-bridge.log 2>&1 &

# Get the new process ID
sleep 2
NEW_PID=$(pgrep -f "node.*ami-bridge.js")

if [ ! -z "$NEW_PID" ]; then
    echo "✅ AMI Bridge restarted successfully!"
    echo "Process ID: $NEW_PID"
    echo "Log file: /var/www/html/freepbx-crm/server/ami-bridge.log"
    echo ""
    echo "Server URLs:"
    echo "  HTTP API: http://192.168.0.5:3001"
    echo "  WebSocket: ws://192.168.0.5:8080"
    echo ""
    echo "To check status: curl http://192.168.0.5:3001/api/ami/status"
    echo "To view logs: tail -f /var/www/html/freepbx-crm/server/ami-bridge.log"
else
    echo "❌ Failed to start AMI Bridge!"
    echo "Check the log for errors: cat /var/www/html/freepbx-crm/server/ami-bridge.log"
    exit 1
fi
