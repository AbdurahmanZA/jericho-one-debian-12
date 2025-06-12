
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
  [key: string]: string | undefined;
}

interface AMIAction {
  action: string;
  actionid: string;
  [key: string]: string | undefined;
}

interface AMIResponse {
  response: string;
  actionid?: string;
  message?: string;
  [key: string]: string | undefined;
}

export class FreePBXAMIClient {
  private ws: WebSocket | null = null;
  private host: string;
  private port: string;
  private username: string;
  private password: string;
  private isConnected: boolean = false;
  private isAuthenticated: boolean = false;
  private eventListeners: ((event: AMIEvent) => void)[] = [];
  private connectionListeners: ((connected: boolean) => void)[] = [];
  private responseCallbacks: Map<string, (response: AMIResponse) => void> = new Map();
  private reconnectTimer: number | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private keepAliveTimer: number | null = null;

  constructor(host: string, port: string, username: string, password: string) {
    this.host = host;
    this.port = port;
    this.username = username;
    this.password = password;
  }

  async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        console.log(`🔗 [AMI] ⚠️  SIMULATION MODE - NO REAL TCP CONNECTION`);
        console.log(`🔗 [AMI] Simulating connection to ${this.host}:${this.port}`);
        console.log(`👤 [AMI] Username: ${this.username}`);
        console.log(`🔑 [AMI] Password: ${this.password.substring(0, 8)}...`);
        console.log(`⚠️  [AMI] NOTE: This is browser simulation - real FreePBX would use TCP sockets`);
        
        this.simulateRealAMIProtocol().then(resolve).catch(() => resolve(false));
      } catch (error) {
        console.error('❌ [AMI] Connection error:', error);
        resolve(false);
      }
    });
  }

  private async simulateRealAMIProtocol(): Promise<boolean> {
    try {
      console.log(`📡 [AMI] ⚠️  SIMULATED: Opening TCP connection to ${this.host}:${this.port}`);
      console.log(`⏱️  [AMI] Connection attempt started at ${new Date().toISOString()}`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log(`📨 [AMI] ⚠️  SIMULATED << Asterisk Call Manager/7.0.3`);
      console.log(`📨 [AMI] ⚠️  SIMULATED << Call Manager greeting received`);
      
      console.log(`📤 [AMI] ⚠️  SIMULATED >> Action: Login`);
      console.log(`📤 [AMI] ⚠️  SIMULATED >> Username: ${this.username}`);
      console.log(`📤 [AMI] ⚠️  SIMULATED >> Secret: ${this.password}`);
      console.log(`📤 [AMI] ⚠️  SIMULATED >> Events: on`);
      console.log(`📤 [AMI] ⚠️  SIMULATED >> ActionID: login_${Date.now()}`);
      console.log(`📤 [AMI] ⚠️  SIMULATED >> [CRLF][CRLF]`);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const isValidCredentials = this.validateCredentials();
      
      if (isValidCredentials) {
        console.log(`📨 [AMI] ⚠️  SIMULATED << Response: Success`);
        console.log(`📨 [AMI] ⚠️  SIMULATED << Message: Authentication accepted`);
        console.log(`📨 [AMI] ⚠️  SIMULATED << ActionID: login_${Date.now()}`);
        console.log(`📨 [AMI] ⚠️  SIMULATED << [CRLF][CRLF]`);
        
        this.isConnected = true;
        this.isAuthenticated = true;
        this.notifyConnectionListeners(true);
        
        setTimeout(() => {
          console.log(`📨 [AMI] ⚠️  SIMULATED << Event: FullyBooted`);
          console.log(`📨 [AMI] ⚠️  SIMULATED << Privilege: system,all`);
          console.log(`📨 [AMI] ⚠️  SIMULATED << Status: Asterisk Ready for PJSIP calls`);
          console.log(`📨 [AMI] ⚠️  SIMULATED << [CRLF][CRLF]`);
          
          this.handleEvent({
            event: 'FullyBooted',
            privilege: 'system,all',
            status: 'Asterisk Ready for PJSIP calls'
          });
        }, 500);

        this.startKeepAlive();
        
        console.log(`✅ [AMI] ⚠️  SIMULATED CONNECTION: Authentication successful - ready for PJSIP calls`);
        console.log(`🚨 [AMI] IMPORTANT: This is browser simulation only! Real calls require actual FreePBX AMI connection.`);
        return true;
      } else {
        console.log(`📨 [AMI] ⚠️  SIMULATED << Response: Error`);
        console.log(`📨 [AMI] ⚠️  SIMULATED << Message: Authentication failed`);
        console.log(`❌ [AMI] Simulated authentication failed with credentials:`);
        console.log(`❌ [AMI] - Username: '${this.username}'`);
        console.log(`❌ [AMI] - Password: '${this.password.substring(0, 8)}...'`);
        
        this.isConnected = false;
        this.notifyConnectionListeners(false);
        return false;
      }
    } catch (error) {
      console.error('❌ [AMI] Protocol simulation error:', error);
      this.isConnected = false;
      this.notifyConnectionListeners(false);
      return false;
    }
  }

  private validateCredentials(): boolean {
    const expectedUsername = 'crm-user';
    const expectedPassword = '70159b4d49108ee8a6d1527edee2d8b50310358f';
    
    console.log(`🔍 [AMI] Validating credentials...`);
    console.log(`🔍 [AMI] Username match: ${this.username === expectedUsername}`);
    console.log(`🔍 [AMI] Password match: ${this.password === expectedPassword}`);
    
    return this.username === expectedUsername && this.password === expectedPassword;
  }

  async getSIPPeers(): Promise<void> {
    if (!this.isConnected) return;

    try {
      const actionId = `pjsipendpoints_${Date.now()}`;
      console.log(`👥 [AMI] ⚠️  SIMULATED >> Action: PJSIPShowEndpoints`);
      console.log(`👥 [AMI] ⚠️  SIMULATED >> ActionID: ${actionId}`);
      console.log(`👥 [AMI] ⚠️  SIMULATED >> [CRLF][CRLF]`);
      
      setTimeout(() => {
        console.log(`👥 [AMI] ⚠️  SIMULATED << Event: EndpointDetail`);
        console.log(`👥 [AMI] ⚠️  SIMULATED << ObjectType: endpoint`);
        console.log(`👥 [AMI] ⚠️  SIMULATED << ObjectName: 1000`);
        console.log(`👥 [AMI] ⚠️  SIMULATED << Transport: transport-udp`);
        console.log(`👥 [AMI] ⚠️  SIMULATED << Aor: 1000`);
        console.log(`👥 [AMI] ⚠️  SIMULATED << Auths: 1000`);
        console.log(`👥 [AMI] ⚠️  SIMULATED << DeviceState: NOT_INUSE`);
        console.log(`👥 [AMI] ⚠️  SIMULATED << ActionID: ${actionId}`);
        console.log(`👥 [AMI] ⚠️  SIMULATED << [CRLF][CRLF]`);
        
        this.handleEvent({
          event: 'EndpointDetail',
          objecttype: 'endpoint',
          objectname: '1000',
          transport: 'transport-udp',
          aor: '1000',
          auths: '1000',
          devicestate: 'NOT_INUSE'
        });

        setTimeout(() => {
          console.log(`👥 [AMI] ⚠️  SIMULATED << Event: EndpointDetail`);
          console.log(`👥 [AMI] ⚠️  SIMULATED << ObjectType: endpoint`);
          console.log(`👥 [AMI] ⚠️  SIMULATED << ObjectName: 101`);
          console.log(`👥 [AMI] ⚠️  SIMULATED << Transport: transport-udp`);
          console.log(`👥 [AMI] ⚠️  SIMULATED << Aor: 101`);
          console.log(`👥 [AMI] ⚠️  SIMULATED << Auths: 101`);
          console.log(`👥 [AMI] ⚠️  SIMULATED << DeviceState: NOT_INUSE`);
          console.log(`👥 [AMI] ⚠️  SIMULATED << ActionID: ${actionId}`);
          console.log(`👥 [AMI] ⚠️  SIMULATED << [CRLF][CRLF]`);
          
          this.handleEvent({
            event: 'EndpointDetail',
            objecttype: 'endpoint',
            objectname: '101',
            transport: 'transport-udp',
            aor: '101',
            auths: '101',
            devicestate: 'NOT_INUSE'
          });
        }, 200);
        
      }, 400);
      
    } catch (error) {
      console.error('❌ [AMI] Error getting PJSIP endpoints:', error);
    }
  }

  private startKeepAlive(): void {
    console.log(`💓 [AMI] Starting keep-alive mechanism (30s interval) - SIMULATED`);
    
    this.keepAliveTimer = window.setInterval(() => {
      if (this.isConnected) {
        console.log(`💓 [AMI] ⚠️  SIMULATED >> Action: Ping`);
        console.log(`💓 [AMI] ⚠️  SIMULATED >> ActionID: ping_${Date.now()}`);
        
        setTimeout(() => {
          console.log(`💓 [AMI] ⚠️  SIMULATED << Response: Success - Pong`);
        }, 100);
        
        this.handleEvent({
          event: 'ContactStatus',
          privilege: 'system,all',
          uri: 'sip:1000@192.168.0.100:5060',
          contactstatus: 'Created',
          aor: '1000',
          endpointname: '1000'
        });
      }
    }, 30000);
  }

  private handleEvent(eventData: any): void {
    const event: AMIEvent = {
      event: eventData.event,
      timestamp: new Date().toISOString(),
      ...eventData
    };
    
    console.log(`📊 [AMI] ⚠️  SIMULATED Event received:`, event);
    this.notifyEventListeners(event);
  }

  addEventListener(listener: (event: AMIEvent) => void): void {
    this.eventListeners.push(listener);
    console.log(`👂 [AMI] Event listener added (total: ${this.eventListeners.length})`);
  }

  removeEventListener(listener: (event: AMIEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
      console.log(`👂 [AMI] Event listener removed (total: ${this.eventListeners.length})`);
    }
  }

  addConnectionListener(listener: (connected: boolean) => void): void {
    this.connectionListeners.push(listener);
    console.log(`🔗 [AMI] Connection listener added (total: ${this.connectionListeners.length})`);
  }

  private notifyEventListeners(event: AMIEvent): void {
    this.eventListeners.forEach(listener => listener(event));
  }

  private notifyConnectionListeners(connected: boolean): void {
    console.log(`🔗 [AMI] Notifying ${this.connectionListeners.length} connection listeners: ${connected ? 'SIMULATED CONNECTED' : 'DISCONNECTED'}`);
    this.connectionListeners.forEach(listener => listener(connected));
  }

  disconnect(): void {
    console.log(`🔌 [AMI] Initiating disconnect... (SIMULATED)`);
    
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
      console.log(`💓 [AMI] Keep-alive timer cleared`);
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
      console.log(`🔄 [AMI] Reconnect timer cleared`);
    }
    
    console.log(`📤 [AMI] ⚠️  SIMULATED >> Action: Logoff`);
    console.log(`📤 [AMI] ⚠️  SIMULATED >> ActionID: logoff_${Date.now()}`);
    
    this.isConnected = false;
    this.isAuthenticated = false;
    this.notifyConnectionListeners(false);
    
    console.log(`🔌 [AMI] Connection ended gracefully (SIMULATED)`);
  }

  getConnectionStatus(): boolean {
    const status = this.isConnected && this.isAuthenticated;
    console.log(`❓ [AMI] Connection status check: ${status ? 'SIMULATED CONNECTED' : 'DISCONNECTED'}`);
    return status;
  }

  async originateCall(channel: string, extension: string, context: string = 'from-internal'): Promise<boolean> {
    if (!this.isConnected) {
      console.error('❌ [AMI] Cannot originate call - AMI not connected');
      return false;
    }

    try {
      const actionId = `originate_${Date.now()}`;
      
      // FORCE PROPER PJSIP FORMAT
      const pjsipChannel = channel.startsWith('PJSIP/') ? channel : `PJSIP/${channel.replace('SIP/', '').replace('PJSIP/', '')}`;
      
      console.log(`🚨🚨🚨 [AMI] CRITICAL VISIBILITY 🚨🚨🚨`);
      console.log(`📞 [AMI] ⚠️  THIS IS BROWSER SIMULATION - NOT REAL FREEPBX CALL!`);
      console.log(`📞 [AMI] Real FreePBX AMI command would be:`);
      console.log(`📞 [AMI] >> Action: Originate`);
      console.log(`📞 [AMI] >> Channel: ${pjsipChannel}`);
      console.log(`📞 [AMI] >> Context: ${context}`);
      console.log(`📞 [AMI] >> Exten: ${extension}`);
      console.log(`📞 [AMI] >> Priority: 1`);
      console.log(`📞 [AMI] >> Timeout: 30000`);
      console.log(`📞 [AMI] >> CallerID: CRM Call <${pjsipChannel.replace('PJSIP/', '')}>`);
      console.log(`📞 [AMI] >> Async: true`);
      console.log(`📞 [AMI] >> ActionID: ${actionId}`);
      console.log(`📞 [AMI] >> [CRLF][CRLF]`);
      console.log(`🚨 [AMI] EXPECTED BEHAVIOR:`);
      console.log(`🚨 [AMI] 1. FreePBX would dial PJSIP/${pjsipChannel.replace('PJSIP/', '')} (YOUR extension) first`);
      console.log(`🚨 [AMI] 2. When you answer, FreePBX dials ${extension} (target number)`);
      console.log(`🚨 [AMI] 3. When target answers, you're connected`);
      console.log(`🚨🚨🚨 END CRITICAL VISIBILITY 🚨🚨🚨`);
      
      // Simulate the exact FreePBX AMI response that would happen
      setTimeout(() => {
        console.log(`📞 [AMI] ⚠️  SIMULATED << Response: Success`);
        console.log(`📞 [AMI] ⚠️  SIMULATED << ActionID: ${actionId}`);
        console.log(`📞 [AMI] ⚠️  SIMULATED << Message: Originate successfully queued`);
        console.log(`📞 [AMI] ⚠️  SIMULATED << [CRLF][CRLF]`);
        
        // Generate simulated call events
        setTimeout(() => {
          const uniqueId = `asterisk.${Date.now()}`;
          
          console.log(`📞 [AMI] ⚠️  SIMULATED << Event: Newchannel`);
          console.log(`📞 [AMI] ⚠️  SIMULATED << Channel: PJSIP/1000-${Date.now().toString().slice(-8)}`);
          console.log(`📞 [AMI] ⚠️  SIMULATED << ChannelState: 4`);
          console.log(`📞 [AMI] ⚠️  SIMULATED << ChannelStateDesc: Ring`);
          console.log(`📞 [AMI] ⚠️  SIMULATED << CallerIDNum: 1000`);
          console.log(`📞 [AMI] ⚠️  SIMULATED << CallerIDName: CRM Call`);
          console.log(`📞 [AMI] ⚠️  SIMULATED << Context: ${context}`);
          console.log(`📞 [AMI] ⚠️  SIMULATED << Exten: ${extension}`);
          console.log(`📞 [AMI] ⚠️  SIMULATED << Priority: 1`);
          console.log(`📞 [AMI] ⚠️  SIMULATED << UniqueID: ${uniqueId}`);
          console.log(`📞 [AMI] ⚠️  SIMULATED << [CRLF][CRLF]`);
          
          this.handleEvent({
            event: 'Newchannel',
            channel: `PJSIP/1000-${Date.now().toString().slice(-8)}`,
            channelstate: '4',
            channelstatedesc: 'Ring',
            calleridnum: '1000',
            calleridname: 'CRM Call',
            context: context,
            exten: extension,
            priority: '1',
            uniqueid: uniqueId
          });
          
          setTimeout(() => {
            console.log(`📞 [AMI] ⚠️  SIMULATED << Event: DialBegin`);
            console.log(`📞 [AMI] ⚠️  SIMULATED << Channel: PJSIP/1000-${Date.now().toString().slice(-8)}`);
            console.log(`📞 [AMI] ⚠️  SIMULATED << Destination: PJSIP/${extension}-${Date.now().toString().slice(-8)}`);
            console.log(`📞 [AMI] ⚠️  SIMULATED << CallerIDNum: 1000`);
            console.log(`📞 [AMI] ⚠️  SIMULATED << DestCallerIDNum: ${extension}`);
            console.log(`📞 [AMI] ⚠️  SIMULATED << UniqueID: ${uniqueId}`);
            console.log(`📞 [AMI] ⚠️  SIMULATED << DialString: ${extension}`);
            console.log(`📞 [AMI] ⚠️  SIMULATED << [CRLF][CRLF]`);
            
            this.handleEvent({
              event: 'DialBegin',
              channel: `PJSIP/1000-${Date.now().toString().slice(-8)}`,
              destination: `PJSIP/${extension}-${Date.now().toString().slice(-8)}`,
              calleridnum: '1000',
              destcalleridnum: extension,
              uniqueid: uniqueId,
              dialstring: extension
            });
          }, 1500);
        }, 1000);
        
        this.handleEvent({
          event: 'OriginateResponse',
          response: 'Success',
          channel: pjsipChannel,
          context: context,
          exten: extension,
          reason: '4',
          uniqueid: `asterisk.${Date.now()}`,
          calleridnum: pjsipChannel.replace('PJSIP/', ''),
          actionid: actionId
        });
      }, 500);
      
      return true;
    } catch (error) {
      console.error('❌ [AMI] Call origination error:', error);
      return false;
    }
  }

  async getActiveChannels(): Promise<void> {
    if (!this.isConnected) return;

    try {
      const actionId = `channels_${Date.now()}`;
      console.log(`📋 [AMI] ⚠️  SIMULATED >> Action: CoreShowChannels`);
      console.log(`📋 [AMI] ⚠️  SIMULATED >> ActionID: ${actionId}`);
      console.log(`📋 [AMI] ⚠️  SIMULATED >> [CRLF][CRLF]`);
      
      setTimeout(() => {
        console.log(`📋 [AMI] ⚠️  SIMULATED << Event: CoreShowChannelsComplete`);
        console.log(`📋 [AMI] ⚠️  SIMULATED << EventList: Complete`);
        console.log(`📋 [AMI] ⚠️  SIMULATED << ListItems: 0`);
        console.log(`📋 [AMI] ⚠️  SIMULATED << ActionID: ${actionId}`);
        console.log(`📋 [AMI] ⚠️  SIMULATED << [CRLF][CRLF]`);
        
        this.handleEvent({
          event: 'CoreShowChannelsComplete',
          eventlist: 'Complete',
          listitems: '0'
        });
      }, 300);
      
    } catch (error) {
      console.error('❌ [AMI] Error getting active channels:', error);
    }
  }
}

export default FreePBXAMIClient;
