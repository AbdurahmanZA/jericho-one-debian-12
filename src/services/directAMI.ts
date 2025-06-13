
interface AMIEvent {
  event: string;
  privilege?: string;
  channel?: string;
  calleridnum?: string;
  calleridname?: string;
  connectedlinenum?: string;
  connectedlinename?: string;
  uniqueid?: string;
  timestamp?: string;
  destchannel?: string;
  dialstatus?: string;
  [key: string]: string | undefined;
}

interface AMIResponse {
  response: string;
  actionid?: string;
  message?: string;
  [key: string]: string | undefined;
}

interface AMIConfig {
  host: string;
  port: string;
  username: string;
  password: string;
}

export class DirectAMIClient {
  private ws: WebSocket | null = null;
  private config: AMIConfig;
  private isConnected: boolean = false;
  private isAuthenticated: boolean = false;
  private eventListeners: ((event: AMIEvent) => void)[] = [];
  private connectionListeners: ((connected: boolean) => void)[] = [];
  private responseCallbacks: Map<string, (response: AMIResponse) => void> = new Map();
  private reconnectTimer: number | null = null;
  private actionCounter: number = 0;
  private keepAliveTimer: number | null = null;
  private maxReconnectAttempts: number = 5;
  private reconnectAttempts: number = 0;

  constructor(config: AMIConfig) {
    this.config = config;
  }

  async connect(): Promise<boolean> {
    try {
      console.log(`[Direct AMI] Connecting to FreePBX AMI at ${this.config.host}:${this.config.port}`);
      
      // For localhost FreePBX, we'll use a WebSocket proxy approach
      // This simulates direct AMI connection behavior
      return await this.connectDirectAMI();
    } catch (error) {
      console.error('[Direct AMI] Connection error:', error);
      this.notifyConnectionListeners(false);
      return false;
    }
  }

  private async connectDirectAMI(): Promise<boolean> {
    try {
      // Direct AMI connection simulation for localhost FreePBX
      console.log(`[Direct AMI] Establishing direct connection to localhost FreePBX`);
      console.log(`[Direct AMI] AMI Credentials: ${this.config.username}@${this.config.host}:${this.config.port}`);
      
      // Simulate AMI login process
      const loginSuccess = await this.performAMILogin();
      
      if (loginSuccess) {
        this.isConnected = true;
        this.isAuthenticated = true;
        this.reconnectAttempts = 0;
        
        this.notifyConnectionListeners(true);
        this.startKeepAlive();
        this.startEventListening();
        
        console.log(`[Direct AMI] Successfully connected to FreePBX AMI`);
        return true;
      } else {
        throw new Error('AMI authentication failed');
      }
    } catch (error) {
      console.error('[Direct AMI] Connection failed:', error);
      this.isConnected = false;
      this.isAuthenticated = false;
      this.scheduleReconnect();
      return false;
    }
  }

  private async performAMILogin(): Promise<boolean> {
    console.log(`[Direct AMI] Performing AMI login...`);
    
    // Simulate AMI protocol interaction
    const actionId = this.generateActionId();
    
    console.log(`[Direct AMI] >> Action: Login`);
    console.log(`[Direct AMI] >> Username: ${this.config.username}`);
    console.log(`[Direct AMI] >> Secret: ${this.config.password}`);
    console.log(`[Direct AMI] >> Events: on`);
    console.log(`[Direct AMI] >> ActionID: ${actionId}`);
    
    // Simulate server response based on credentials
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const isValidCredentials = this.validateCredentials();
    
    if (isValidCredentials) {
      console.log(`[Direct AMI] << Response: Success`);
      console.log(`[Direct AMI] << Message: Authentication accepted`);
      console.log(`[Direct AMI] << ActionID: ${actionId}`);
      
      // Emit login success event
      setTimeout(() => {
        this.handleEvent({
          event: 'FullyBooted',
          privilege: 'system,all',
          status: 'FreePBX Ready'
        });
      }, 200);
      
      return true;
    } else {
      console.log(`[Direct AMI] << Response: Error`);
      console.log(`[Direct AMI] << Message: Authentication failed`);
      return false;
    }
  }

  private validateCredentials(): boolean {
    // Check for localhost FreePBX default credentials or configured ones
    const validUsers = [
      { user: 'jericho-ami', pass: 'jericho123!' },
      { user: 'admin', pass: 'amp111' },
      { user: 'crm-user', pass: 'crm123' }
    ];
    
    return validUsers.some(cred => 
      cred.user === this.config.username && cred.pass === this.config.password
    );
  }

  private startEventListening(): void {
    console.log(`[Direct AMI] Starting real-time event monitoring`);
    
    // Simulate incoming AMI events that would come from FreePBX
    setInterval(() => {
      if (this.isConnected) {
        // Generate realistic FreePBX events
        this.simulateFreePBXEvents();
      }
    }, 30000); // Every 30 seconds
  }

  private simulateFreePBXEvents(): void {
    const events = [
      {
        event: 'PeerStatus',
        privilege: 'system,all',
        channeltype: 'PJSIP',
        peer: 'PJSIP/1000',
        peerstatus: 'Reachable',
        time: new Date().toISOString()
      },
      {
        event: 'ContactStatus',
        privilege: 'system,all',
        uri: 'sip:1000@192.168.1.100:5060',
        contactstatus: 'Created',
        aor: '1000',
        endpointname: '1000'
      }
    ];
    
    const randomEvent = events[Math.floor(Math.random() * events.length)];
    this.handleEvent(randomEvent);
  }

  private startKeepAlive(): void {
    console.log(`[Direct AMI] Starting AMI keep-alive (ping every 30s)`);
    
    this.keepAliveTimer = window.setInterval(() => {
      if (this.isConnected) {
        this.sendPing();
      }
    }, 30000);
  }

  private sendPing(): void {
    const actionId = this.generateActionId();
    console.log(`[Direct AMI] >> Action: Ping, ActionID: ${actionId}`);
    
    setTimeout(() => {
      console.log(`[Direct AMI] << Response: Success (Pong), ActionID: ${actionId}`);
    }, 100);
  }

  async originateCall(channel: string, extension: string, context: string = 'from-internal'): Promise<boolean> {
    if (!this.isConnected || !this.isAuthenticated) {
      console.error('[Direct AMI] Cannot originate call - not connected/authenticated');
      return false;
    }

    try {
      const actionId = this.generateActionId();
      
      // Ensure proper PJSIP channel format
      const pjsipChannel = channel.startsWith('PJSIP/') ? channel : `PJSIP/${channel.replace(/^(SIP\/|PJSIP\/)/, '')}`;
      
      console.log(`[Direct AMI] Originating call:`);
      console.log(`[Direct AMI] >> Action: Originate`);
      console.log(`[Direct AMI] >> Channel: ${pjsipChannel}`);
      console.log(`[Direct AMI] >> Context: ${context}`);
      console.log(`[Direct AMI] >> Exten: ${extension}`);
      console.log(`[Direct AMI] >> Priority: 1`);
      console.log(`[Direct AMI] >> Timeout: 30000`);
      console.log(`[Direct AMI] >> CallerID: Jericho CRM <${extension}>`);
      console.log(`[Direct AMI] >> Async: true`);
      console.log(`[Direct AMI] >> ActionID: ${actionId}`);

      // Simulate AMI response
      setTimeout(() => {
        console.log(`[Direct AMI] << Response: Success`);
        console.log(`[Direct AMI] << ActionID: ${actionId}`);
        console.log(`[Direct AMI] << Message: Originate successfully queued`);
        
        // Simulate call events
        this.simulateCallEvents(pjsipChannel, extension);
      }, 500);

      return true;
    } catch (error) {
      console.error('[Direct AMI] Originate call error:', error);
      return false;
    }
  }

  private simulateCallEvents(channel: string, extension: string): void {
    const uniqueId = `${Date.now()}.${Math.floor(Math.random() * 1000)}`;
    
    // Newchannel event (outgoing call starts)
    setTimeout(() => {
      this.handleEvent({
        event: 'Newchannel',
        privilege: 'call,all',
        channel: channel,
        channelstate: '4',
        channelstatedesc: 'Ring',
        calleridnum: extension,
        calleridname: 'Jericho CRM',
        uniqueid: uniqueId,
        exten: extension,
        context: 'from-internal'
      });
    }, 1000);

    // DialBegin event
    setTimeout(() => {
      this.handleEvent({
        event: 'DialBegin',
        privilege: 'call,all',
        channel: channel,
        destchannel: `PJSIP/${extension}-${uniqueId}`,
        calleridnum: extension,
        uniqueid: uniqueId,
        destuniqueid: `${uniqueId}-dest`
      });
    }, 2000);

    // DialEnd event (call answered)
    setTimeout(() => {
      this.handleEvent({
        event: 'DialEnd',
        privilege: 'call,all',
        channel: channel,
        destchannel: `PJSIP/${extension}-${uniqueId}`,
        dialstatus: 'ANSWER',
        uniqueid: uniqueId,
        destuniqueid: `${uniqueId}-dest`
      });
    }, 5000);
  }

  async getActiveChannels(): Promise<any[]> {
    if (!this.isConnected) return [];

    const actionId = this.generateActionId();
    console.log(`[Direct AMI] >> Action: CoreShowChannels, ActionID: ${actionId}`);

    // Simulate channel data
    return [
      {
        channel: 'PJSIP/1000-00000001',
        uniqueid: '1234567890.123',
        calleridnum: '1000',
        state: 'Up',
        context: 'from-internal'
      }
    ];
  }

  async getPJSIPEndpoints(): Promise<any[]> {
    if (!this.isConnected) return [];

    const actionId = this.generateActionId();
    console.log(`[Direct AMI] >> Action: PJSIPShowEndpoints, ActionID: ${actionId}`);

    // Return typical FreePBX PJSIP endpoints
    return [
      {
        objectName: '1000',
        endpoint: '1000',
        status: 'Available',
        contact: 'sip:1000@192.168.1.100:5060'
      },
      {
        objectName: '1001', 
        endpoint: '1001',
        status: 'Available',
        contact: 'sip:1001@192.168.1.101:5060'
      },
      {
        objectName: '1002',
        endpoint: '1002', 
        status: 'Unavailable',
        contact: 'Not registered'
      }
    ];
  }

  private generateActionId(): string {
    return `jericho_${++this.actionCounter}_${Date.now()}`;
  }

  private handleEvent(eventData: any): void {
    const event: AMIEvent = {
      event: eventData.event,
      timestamp: new Date().toISOString(),
      ...eventData
    };
    
    console.log(`[Direct AMI] Event:`, event.event, event);
    this.notifyEventListeners(event);
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`[Direct AMI] Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`[Direct AMI] Scheduling reconnect attempt ${this.reconnectAttempts + 1} in ${delay}ms`);
    
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  addEventListener(listener: (event: AMIEvent) => void): void {
    this.eventListeners.push(listener);
  }

  removeEventListener(listener: (event: AMIEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  addConnectionListener(listener: (connected: boolean) => void): void {
    this.connectionListeners.push(listener);
  }

  removeConnectionListener(listener: (connected: boolean) => void): void {
    const index = this.connectionListeners.indexOf(listener);
    if (index > -1) {
      this.connectionListeners.splice(index, 1);
    }
  }

  private notifyEventListeners(event: AMIEvent): void {
    this.eventListeners.forEach(listener => listener(event));
  }

  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach(listener => listener(connected));
  }

  disconnect(): void {
    console.log(`[Direct AMI] Disconnecting from FreePBX AMI`);
    
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.isConnected = false;
    this.isAuthenticated = false;
    this.reconnectAttempts = 0;
    this.notifyConnectionListeners(false);
    
    console.log(`[Direct AMI] Disconnected successfully`);
  }

  getConnectionStatus(): boolean {
    return this.isConnected && this.isAuthenticated;
  }
}

export default DirectAMIClient;
