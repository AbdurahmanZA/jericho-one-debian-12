
#!/bin/bash

# FreePBX AMI Bridge - Status Check Script

echo "=== AMI Bridge Status Check ==="

# Check if process is running
PID=$(pgrep -f "node.*ami-bridge.js")
if [ ! -z "$PID" ]; then
    echo "✅ AMI Bridge is running (PID: $PID)"
else
    echo "❌ AMI Bridge is not running"
fi

# Check HTTP API
echo ""
echo "Testing HTTP API..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://192.168.0.5:3001/api/ami/status 2>/dev/null)
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ HTTP API responding (Port 3001)"
    curl -s http://192.168.0.5:3001/api/ami/status | python -m json.tool 2>/dev/null || echo "Response received"
else
    echo "❌ HTTP API not responding (Port 3001)"
fi

# Check WebSocket port
echo ""
echo "Testing WebSocket port..."
if nc -z 192.168.0.5 8080 2>/dev/null; then
    echo "✅ WebSocket port open (Port 8080)"
else
    echo "❌ WebSocket port not open (Port 8080)"
fi

# Show recent logs
echo ""
echo "Recent logs (last 10 lines):"
if [ -f "/var/www/html/freepbx-crm/server/ami-bridge.log" ]; then
    tail -10 /var/www/html/freepbx-crm/server/ami-bridge.log
else
    echo "No log file found"
fi
