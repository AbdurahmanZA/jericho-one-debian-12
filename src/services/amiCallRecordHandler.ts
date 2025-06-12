
import { callRecordsService } from './callRecordsService';
import { amiBridgeClient } from './amiBridgeClient';

interface AMIEvent {
  event: string;
  [key: string]: string | undefined;
}

interface ActiveCall {
  uniqueId: string;
  channel: string;
  startTime: Date;
  callerIdNum?: string;
  callerIdName?: string;
  extension?: string;
  context?: string;
}

class AMICallRecordHandler {
  private activeCalls: Map<string, ActiveCall> = new Map();
  private initialized: boolean = false;

  initialize() {
    if (this.initialized) return;

    // Listen for AMI events
    amiBridgeClient.onEvent(this.handleAMIEvent.bind(this));
    this.initialized = true;

    console.log('[AMI Call Record Handler] Initialized - listening for call events');
  }

  private handleAMIEvent(event: AMIEvent) {
    switch (event.event) {
      case 'Newchannel':
        this.handleNewChannel(event);
        break;
      case 'Hangup':
        this.handleHangup(event);
        break;
      case 'DialBegin':
        this.handleDialBegin(event);
        break;
      case 'DialEnd':
        this.handleDialEnd(event);
        break;
    }
  }

  private handleNewChannel(event: AMIEvent) {
    if (!event.uniqueid || !event.channel) return;

    const call: ActiveCall = {
      uniqueId: event.uniqueid,
      channel: event.channel,
      startTime: new Date(),
      callerIdNum: event.calleridnum,
      callerIdName: event.calleridname,
      extension: event.exten,
      context: event.context
    };

    this.activeCalls.set(event.uniqueid, call);
    console.log('[AMI Call Handler] New channel:', call);
  }

  private handleDialBegin(event: AMIEvent) {
    if (!event.uniqueid) return;

    const call = this.activeCalls.get(event.uniqueid);
    if (call) {
      call.callerIdNum = event.calleridnum || call.callerIdNum;
      call.callerIdName = event.calleridname || call.callerIdName;
      console.log('[AMI Call Handler] Dial begin for:', call);
    }
  }

  private handleDialEnd(event: AMIEvent) {
    if (!event.uniqueid) return;

    const call = this.activeCalls.get(event.uniqueid);
    if (call && event.dialstatus) {
      // Create a call record based on dial status
      this.createCallRecord(call, event.dialstatus, event);
    }
  }

  private handleHangup(event: AMIEvent) {
    if (!event.uniqueid) return;

    const call = this.activeCalls.get(event.uniqueid);
    if (call) {
      const cause = event.cause || 'Unknown';
      const causeTxt = event.causetxt || cause;
      
      // Only create record if we haven't already created one for this call
      if (!call.extension || !this.isInternalCall(call)) {
        this.createCallRecord(call, causeTxt, event);
      }

      this.activeCalls.delete(event.uniqueid);
      console.log('[AMI Call Handler] Call hangup:', call);
    }
  }

  private isInternalCall(call: ActiveCall): boolean {
    // Check if this is an internal call between extensions
    return call.context === 'from-internal' && 
           call.callerIdNum && 
           /^\d{3,4}$/.test(call.callerIdNum);
  }

  private createCallRecord(call: ActiveCall, outcome: string, event: AMIEvent) {
    const duration = this.calculateDuration(call.startTime, new Date());
    const callType = this.determineCallType(call, event);
    
    const phone = call.callerIdNum || 'Unknown';
    const leadName = call.callerIdName || `Contact ${phone}`;
    
    // Get current user info from localStorage
    const userStr = localStorage.getItem('crm_user');
    let agent = 'System';
    
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        agent = user.name || 'Unknown Agent';
      } catch (error) {
        console.error('Failed to parse user info:', error);
      }
    }

    const callRecord = {
      leadName,
      phone,
      duration,
      outcome: this.mapOutcomeToStatus(outcome),
      timestamp: call.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: call.startTime.toISOString().split('T')[0],
      hasRecording: false, // Could be enhanced to check for recording files
      notes: `Automatic record from AMI event. Channel: ${call.channel}`,
      agent,
      callType,
      leadId: undefined
    };

    callRecordsService.addRecord(callRecord);
    console.log('[AMI Call Handler] Created call record:', callRecord);

    // Send Discord notification if enabled
    if (typeof (window as any).sendDiscordNotification === 'function') {
      (window as any).sendDiscordNotification(
        leadName,
        'called',
        `${callType} call - ${callRecord.outcome} (${duration})`
      );
    }
  }

  private calculateDuration(start: Date, end: Date): string {
    const seconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private determineCallType(call: ActiveCall, event: AMIEvent): 'incoming' | 'outgoing' {
    // If the call was originated through our system, it's outgoing
    if (call.context === 'from-internal' || event.channel?.includes('Local/')) {
      return 'outgoing';
    }
    return 'incoming';
  }

  private mapOutcomeToStatus(outcome: string): string {
    const lowerOutcome = outcome.toLowerCase();
    
    if (lowerOutcome.includes('answer')) return 'Answered';
    if (lowerOutcome.includes('busy')) return 'Busy';
    if (lowerOutcome.includes('noanswer') || lowerOutcome.includes('no answer')) return 'No Answer';
    if (lowerOutcome.includes('congestion')) return 'Network Busy';
    if (lowerOutcome.includes('cancel')) return 'Cancelled';
    if (lowerOutcome.includes('chanunavail')) return 'Unavailable';
    
    return 'Unknown';
  }

  cleanup() {
    this.activeCalls.clear();
    this.initialized = false;
  }
}

// Create singleton instance
export const amiCallRecordHandler = new AMICallRecordHandler();
