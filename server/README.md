
# FreePBX AMI Bridge Server

This server-side component provides a bridge between your web application and FreePBX's Asterisk Manager Interface (AMI). It solves the browser limitation of not being able to make raw TCP connections to AMI.

## Features

- Real AMI connection to FreePBX/Asterisk
- REST API for call origination and management
- WebSocket support for real-time call events
- CORS enabled for frontend integration
- Proper error handling and logging

## Installation

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Copy and configure the example config:
```bash
cp config.example.json config.json
```

4. Edit `config.json` with your FreePBX AMI credentials:
```json
{
  "ami": {
    "host": "192.168.0.5",
    "port": 5038,
    "username": "crm-user",
    "password": "your-ami-password"
  }
}
```

## Running the Server

### Development:
```bash
npm run dev
```

### Production:
```bash
npm start
```

The server will start on:
- REST API: `http://localhost:3001`
- WebSocket: `ws://localhost:8080`

## API Endpoints

### Connect to AMI
```bash
POST /api/ami/connect
Content-Type: application/json

{
  "host": "192.168.0.5",
  "port": "5038",
  "username": "crm-user",
  "password": "your-password"
}
```

### Originate a Call
```bash
POST /api/ami/originate
Content-Type: application/json

{
  "channel": "PJSIP/1000",
  "extension": "+1234567890",
  "context": "from-internal",
  "callerID": "CRM Call <1000>"
}
```

### Get Connection Status
```bash
GET /api/ami/status
```

### Get Active Channels
```bash
GET /api/ami/channels
```

### Disconnect from AMI
```bash
POST /api/ami/disconnect
```

## WebSocket Events

Connect to `ws://localhost:8080` to receive real-time AMI events:

```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'event') {
    console.log('AMI Event:', data.data);
  } else if (data.type === 'status') {
    console.log('Connection Status:', data.connected);
  }
};
```

## Integration with Frontend

The frontend can now use the `amiBridgeClient` service instead of direct AMI connection:

```typescript
import { amiBridgeClient } from '@/services/amiBridgeClient';

// Connect to AMI through the bridge
await amiBridgeClient.connect({
  host: '192.168.0.5',
  port: '5038',
  username: 'crm-user',
  password: 'your-password'
});

// Originate a call
await amiBridgeClient.originateCall({
  channel: 'PJSIP/1000',
  extension: '+1234567890',
  context: 'from-internal'
});
```

## Deployment

For production deployment:

1. Use a process manager like PM2:
```bash
npm install -g pm2
pm2 start ami-bridge.js --name "ami-bridge"
```

2. Set up reverse proxy with nginx:
```nginx
location /api/ami/ {
    proxy_pass http://localhost:3001/api/ami/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

3. Configure firewall to allow ports 3001 and 8080 (or use reverse proxy)

## Troubleshooting

1. **AMI Connection Issues:**
   - Verify FreePBX AMI credentials
   - Check that port 5038 is accessible
   - Ensure AMI user has proper permissions

2. **CORS Issues:**
   - Update allowed origins in the server configuration
   - Ensure frontend URL matches CORS settings

3. **WebSocket Connection Issues:**
   - Check firewall settings for port 8080
   - Verify WebSocket URL in frontend configuration

## Security Notes

- Never expose AMI credentials in frontend code
- Use HTTPS/WSS in production
- Implement API authentication for production use
- Consider IP whitelisting for AMI access
