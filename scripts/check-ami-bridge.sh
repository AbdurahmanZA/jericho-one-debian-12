
#!/bin/bash

# FreePBX AMI Bridge - Status Check Script
# Network: FreePBX (192.168.0.5) <-> CRM (192.168.0.132)

echo "=== AMI Bridge Status Check ==="
echo "FreePBX Server: 192.168.0.5"
echo "CRM Server: 192.168.0.132"
echo ""

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
    echo "API Response:"
    curl -s http://192.168.0.5:3001/api/ami/status | python -m json.tool 2>/dev/null || echo "Response received"
else
    echo "❌ HTTP API not responding (Port 3001) - Status: $HTTP_STATUS"
fi

# Test from CRM perspective
echo ""
echo "Testing connectivity from CRM server perspective..."
if command -v curl >/dev/null; then
    echo "Testing CORS preflight..."
    curl -s -o /dev/null -w "CORS Status: %{http_code}\n" \
        -H "Origin: http://192.168.0.132" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type" \
        -X OPTIONS http://192.168.0.5:3001/api/ami/status 2>/dev/null
fi

# Check WebSocket port
echo ""
echo "Testing WebSocket port..."
if nc -z 192.168.0.5 8080 2>/dev/null; then
    echo "✅ WebSocket port open (Port 8080)"
else
    echo "❌ WebSocket port not open (Port 8080)"
fi

# Check AMI port connectivity
echo ""
echo "Testing AMI port connectivity..."
if nc -z 192.168.0.5 5038 2>/dev/null; then
    echo "✅ AMI port accessible (Port 5038)"
else
    echo "❌ AMI port not accessible (Port 5038)"
fi

# Check network connectivity between servers
echo ""
echo "Network connectivity tests:"
if ping -c 1 192.168.0.132 >/dev/null 2>&1; then
    echo "✅ Can reach CRM server (192.168.0.132)"
else
    echo "❌ Cannot reach CRM server (192.168.0.132)"
fi

# Show recent logs
echo ""
echo "Recent logs (last 15 lines):"
if [ -f "/var/www/html/freepbx-crm/server/ami-bridge.log" ]; then
    tail -15 /var/www/html/freepbx-crm/server/ami-bridge.log
else
    echo "No log file found at /var/www/html/freepbx-crm/server/ami-bridge.log"
    
    # Check alternative locations
    for dir in "/home/asterisk/freepbx-crm/server" "/opt/freepbx-crm/server" "/root/freepbx-crm/server"; do
        if [ -f "$dir/ami-bridge.log" ]; then
            echo "Found log at: $dir/ami-bridge.log"
            tail -10 "$dir/ami-bridge.log"
            break
        fi
    done
fi

echo ""
echo "=== Troubleshooting Tips ==="
echo "1. Ensure AMI Bridge is running on FreePBX server (192.168.0.5)"
echo "2. Check firewall rules allow ports 3001 and 8080"
echo "3. Verify CRM can reach FreePBX server: ping 192.168.0.5"
echo "4. Check AMI credentials in config.json"
echo "5. Test from CRM browser: http://192.168.0.5:3001/api/ami/status"
