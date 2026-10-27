/**
 * HomeServeX Real-Time Tracking Socket & SSE Client
 * Inspired by Uber & Rapido real-time telemetry streaming.
 */

export interface ProviderMovedEvent {
  bookingId: string;
  providerId: string;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  distanceKm: number;
  etaMinutes: number;
  status: string;
  timestamp: number;
}

export interface EtaUpdatedEvent {
  bookingId: string;
  etaMinutes: number;
  distanceKm: number;
  formattedEta: string;
}

export interface BookingArrivedEvent {
  bookingId: string;
  status: string;
  arrivedAt: string;
  message: string;
}

export interface DisconnectWarningEvent {
  bookingId: string;
  message: string;
  timeSinceLastPingSeconds: number;
}

export interface TrackingSocketCallbacks {
  onProviderMoved?: (data: ProviderMovedEvent) => void;
  onEtaUpdated?: (data: EtaUpdatedEvent) => void;
  onBookingArrived?: (data: BookingArrivedEvent) => void;
  onDisconnectWarning?: (data: DisconnectWarningEvent) => void;
  onInitialState?: (data: any) => void;
  onStatusChange?: (status: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING') => void;
}

export class TrackingSocketClient {
  private bookingId: string;
  private apiBase: string;
  private token?: string;
  private eventSource: EventSource | null = null;
  private ws: WebSocket | null = null;
  private callbacks: TrackingSocketCallbacks;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isDestroyed = false;

  constructor(bookingId: string, apiBase: string, callbacks: TrackingSocketCallbacks, token?: string) {
    this.bookingId = bookingId;
    this.apiBase = apiBase;
    this.callbacks = callbacks;
    this.token = token;
    this.connect();
  }

  private connect() {
    if (this.isDestroyed) return;
    this.callbacks.onStatusChange?.('CONNECTING');

    // 1. Try SSE Stream (Works universally with HTTP/2 and standard proxies)
    const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const streamEndpoint = `${this.apiBase || ''}/api/v1/bookings/${this.bookingId}/tracking/stream`;
    const url = new URL(streamEndpoint, baseOrigin);
    if (this.token) {
      url.searchParams.set('token', this.token);
    }

    try {
      this.eventSource = new EventSource(url.toString());

      this.eventSource.addEventListener('connected', () => {
        this.callbacks.onStatusChange?.('CONNECTED');
      });

      this.eventSource.addEventListener('initial_state', (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data);
          this.callbacks.onInitialState?.(parsed);
        } catch {}
      });

      this.eventSource.addEventListener('customer:provider_moved', (e: MessageEvent) => {
        try {
          const wrapper = JSON.parse(e.data);
          this.callbacks.onProviderMoved?.(wrapper.data || wrapper);
        } catch {}
      });

      this.eventSource.addEventListener('booking:eta_updated', (e: MessageEvent) => {
        try {
          const wrapper = JSON.parse(e.data);
          this.callbacks.onEtaUpdated?.(wrapper.data || wrapper);
        } catch {}
      });

      this.eventSource.addEventListener('booking:arrived', (e: MessageEvent) => {
        try {
          const wrapper = JSON.parse(e.data);
          this.callbacks.onBookingArrived?.(wrapper.data || wrapper);
        } catch {}
      });

      this.eventSource.addEventListener('provider:disconnect_warning', (e: MessageEvent) => {
        try {
          const wrapper = JSON.parse(e.data);
          this.callbacks.onDisconnectWarning?.(wrapper.data || wrapper);
        } catch {}
      });

      this.eventSource.onerror = () => {
        if (this.isDestroyed) return;
        this.callbacks.onStatusChange?.('RECONNECTING');
        this.eventSource?.close();
        this.eventSource = null;

        // Fallback sync with REST API while reconnecting
        this.fetchSyncState();

        this.scheduleReconnect();
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  public async fetchSyncState() {
    try {
      const res = await fetch(`${this.apiBase}/api/v1/bookings/${this.bookingId}/live-tracking-state`, {
        headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          this.callbacks.onInitialState?.(data.data);
        }
      }
    } catch {
      // Fallback network error handled gracefully
    }
  }

  private scheduleReconnect() {
    if (this.isDestroyed || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 4000);
  }

  public disconnect() {
    this.isDestroyed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.callbacks.onStatusChange?.('DISCONNECTED');
  }
}
