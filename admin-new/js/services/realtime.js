/**
 * Real-time Service - WebSocket/SSE with Presence, Channels & Events
 * Handles live updates, collaborative features, and server-push notifications
 */

import { envConfig } from '../utils/env-config.js';
import { errorBoundary } from './error-boundary.js';
import { performanceMonitor } from './performance.js';
import { io } from 'socket.io-client';

class RealtimeService {
  constructor(options = {}) {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.options = {
      url: options.url || envConfig.get('VITE_WS_URL') || 'ws://localhost:3001',
      autoConnect: options.autoConnect !== false,
      reconnect: options.reconnect !== false,
      reconnectInterval: options.reconnectInterval || 2000,
      maxReconnectAttempts: options.maxReconnectAttempts || 10,
      heartbeatInterval: options.heartbeatInterval || 30000,
      transport: options.transport || 'auto',
    };

    this.ws = null;
    this.eventSource = null;
    this.channels = new Map();
    this.eventListeners = new Map();
    this.presenceListeners = new Set();
    this.connectionState = 'disconnected';
    this.reconnectAttempts = 0;
    this.heartbeatTimer = null;
    this.reconnectTimer = null;
    this.messageQueue = [];
    this.user = null;

    if (this.options.autoConnect) {
      this.connect();
    }
  }

  setConnectionState(state) {
    const prevState = this.connectionState;
    this.connectionState = state;
    if (prevState !== state) {
      this.emit('connection:state', { state, prevState });
    }
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (this.connectionState === 'connected') {
        resolve();
        return;
      }

      this.setConnectionState('connecting');

      // Use Socket.io for realtime backend
      try {
        this.socket = io(this.options.url, {
          transports: ['websocket', 'polling'],
          autoConnect: true,
          withCredentials: true,
          reconnection: this.options.reconnect,
          reconnectionAttempts: this.options.maxReconnectAttempts,
          reconnectionDelay: this.options.reconnectInterval,
        });

        this.socket.on('connect', () => {
          this.onOpen();
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          this.setConnectionState('disconnected');
          this.emit('disconnect', { reason });
        });

        this.socket.on('connect_error', (err) => {
          this.handleError(err);
          reject(err);
        });

        this.socket.on('message', (data) => {
          this.handleMessage(data);
        });

        // Listen for all custom events
        this.socket.onAny((event, ...args) => {
          this.emit(event, ...args);
        });

      } catch (err) {
        reject(err);
      }
    });
  }

  connectSSE() {
    return new Promise((resolve, reject) => {
      if (typeof EventSource === 'undefined') {
        resolve(false);
        return;
      }
      const url = this.options.url.replace('ws://', 'http://').replace('wss://', 'https://') + '/sse';
      this.eventSource = new EventSource(url, { withCredentials: true });

      this.eventSource.onopen = () => {
        this.onOpen();
        resolve();
      };

      this.eventSource.onerror = (err) => {
        this.handleError(err);
        reject(err);
      };

      this.eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (e) {
          console.warn('[Realtime] Failed to parse SSE message:', e);
        }
      };
    });
  }

  setupWebSocket() {
    if (!this.ws) return;

    this.ws.onclose = (event) => this.onClose(event);
    this.ws.onerror = (event) => this.handleError(event);
    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (e) {
        console.warn('[Realtime] Failed to parse WS message:', e);
      }
    };
  }

  onOpen() {
    this.connectionState = 'connected';
    this.reconnectAttempts = 0;
    this.startHeartbeat();
    this.flushMessageQueue();
    this.emit('connection:open', { sessionId: this.sessionId });

    // Rejoin channels
    for (const [name, channel] of this.channels) {
      if (channel.joined) {
        this.send('channel:join', { channel: name, user: this.user });
      }
    }
  }

  onClose(event) {
    this.connectionState = 'disconnected';
    this.stopHeartbeat();
    this.emit('connection:close', { code: event.code, reason: event.reason, sessionId: this.sessionId });

    if (this.options.reconnect && this.reconnectAttempts < this.options.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  handleError(error) {
    this.connectionState = 'error';
    errorBoundary.handleError(new Error(`Realtime error: ${error?.message || 'Unknown'}`), 'realtime');
    this.emit('connection:error', { error, sessionId: this.sessionId });
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;

    const delay = Math.min(
      this.options.reconnectInterval * Math.pow(1.5, this.reconnectAttempts),
      30000
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;
      this.connect().catch(() => {});
    }, delay);
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.connectionState === 'connected') {
        this.send('ping', { timestamp: Date.now() });
      }
    }, this.options.heartbeatInterval);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift();
      this.send(msg.event, msg.data);
    }
  }

  send(event, data) {
    const message = JSON.stringify({ event, data, sessionId: this.sessionId, timestamp: Date.now() });

    if (this.connectionState !== 'connected') {
      this.messageQueue.push({ event, data });
      return false;
    }

    try {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(message);
        return true;
      }
      return false;
    } catch (e) {
      console.warn('[Realtime] Send failed:', e);
      return false;
    }
  }

  handleMessage(message) {
    const { event, data } = message;

    switch (event) {
      case 'pong':
        this.emit('pong', data);
        break;
      case 'channel:joined':
        this.handleChannelJoined(data);
        break;
      case 'channel:left':
        this.handleChannelLeft(data);
        break;
      case 'presence:join':
        this.handlePresenceJoin(data);
        break;
      case 'presence:leave':
        this.handlePresenceLeave(data);
        break;
      case 'presence:update':
        this.handlePresenceUpdate(data);
        break;
      case 'presence:list':
        this.handlePresenceList(data);
        break;
      default:
        this.emit(event, data);
    }
  }

  handleChannelJoined(data) {
    const channel = this.channels.get(data.channel) || { name: data.channel, users: new Map(), joined: true };
    channel.joined = true;
    channel.users.clear();
    data.users.forEach(u => channel.users.set(u.id, u));
    this.channels.set(data.channel, channel);
    this.emit(`channel:${data.channel}:joined`, data);
  }

  handleChannelLeft(data) {
    const channel = this.channels.get(data.channel);
    if (channel) {
      channel.joined = false;
      channel.users.clear();
    }
    this.emit(`channel:${data.channel}:left`, data);
  }

  handlePresenceJoin(data) {
    const channel = this.channels.get(data.channel);
    if (channel) {
      channel.users.set(data.user.id, data.user);
    }
    this.presenceListeners.forEach(cb => cb(data.user, 'join'));
    this.emit(`presence:join`, data);
  }

  handlePresenceLeave(data) {
    const channel = this.channels.get(data.channel);
    const user = channel?.users.get(data.userId);
    if (channel) {
      channel.users.delete(data.userId);
    }
    if (user) {
      this.presenceListeners.forEach(cb => cb(user, 'leave'));
      this.emit(`presence:leave`, { ...data, user });
    }
  }

  handlePresenceUpdate(data) {
    const channel = this.channels.get(data.channel);
    if (channel) {
      channel.users.set(data.user.id, data.user);
    }
    this.presenceListeners.forEach(cb => cb(data.user, 'update'));
    this.emit(`presence:update`, data);
  }

  handlePresenceList(data) {
    const channel = this.channels.get(data.channel) || { name: data.channel, users: new Map(), joined: true };
    channel.joined = true;
    channel.users.clear();
    data.users.forEach(u => channel.users.set(u.id, u));
    this.channels.set(data.channel, channel);
    this.emit(`presence:list`, data);
  }

  // Public API
  joinChannel(channel, user) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Join timeout')), 5000);
      const handler = (d) => {
        if (d.channel === channel) {
          clearTimeout(timeout);
          this.off(`channel:${channel}:joined`, handler);
          resolve();
        }
      };
      this.on(`channel:${channel}:joined`, handler);
      this.send('channel:join', { channel, user: user || this.user });
    });
  }

  leaveChannel(channel) {
    const ch = this.channels.get(channel);
    if (ch) {
      ch.joined = false;
      ch.users.clear();
    }
    this.send('channel:leave', { channel });
  }

  getChannelUsers(channel) {
    return Array.from(this.channels.get(channel)?.users.values() || []);
  }

  isInChannel(channel) {
    return this.channels.get(channel)?.joined ?? false;
  }

  updatePresence(metadata) {
    if (this.user) {
      this.user = { ...this.user, metadata, lastSeen: Date.now() };
      this.send('presence:update', { user: this.user });
    }
  }

  setUser(user) {
    this.user = { ...user, lastSeen: Date.now() };
    if (this.connectionState === 'connected') {
      this.send('presence:update', { user: this.user });
    }
  }

  getUser() {
    return this.user;
  }

  getConnectionState() {
    return this.connectionState;
  }

  // Event system
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    this.eventListeners.get(event)?.delete(callback);
  }

  emit(event, data) {
    this.eventListeners.get(event)?.forEach(cb => {
      try {
        cb(data);
      } catch (e) {
        console.warn(`[Realtime] Event handler error for ${event}:`, e);
      }
    });
  }

  onPresence(callback) {
    this.presenceListeners.add(callback);
    return () => this.presenceListeners.delete(callback);
  }

  // Channel-specific events
  onChannel(channel, event, callback) {
    return this.on(`channel:${channel}:${event}`, callback);
  }

  // Cleanup
  disconnect() {
    this.options.reconnect = false;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.channels.clear();
    this.eventListeners.clear();
    this.presenceListeners.clear();
    this.connectionState = 'disconnected';
  }

  destroy() {
    this.disconnect();
  }
}

const realtimeService = new RealtimeService();

export { RealtimeService, realtimeService };
export default realtimeService;