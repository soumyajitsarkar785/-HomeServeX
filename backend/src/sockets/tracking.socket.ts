/// <reference path="../types/shims.d.ts" />
import { Server, Socket } from 'socket.io';
import { Pool } from 'pg';

export interface ProviderLocationPayload {
  bookingId: string;
  providerId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  distanceKm?: number;
  etaMinutes?: number;
}

export class TrackingSocketGateway {
  // In-Memory Database Write-Throttling Map (providerId -> lastDatabaseWriteTimestamp)
  // Ensures we NEVER bottleneck PostgreSQL on high-frequency 3-second socket pings
  private static lastDbWriteMap = new Map<string, number>();

  // In-Memory cache of latest coordinates for instant room joins
  private static latestPositions = new Map<string, ProviderLocationPayload>();

  constructor(private io: Server, private pool: Pool) {}

  public initialize(): void {
    this.io.on('connection', (socket: Socket) => {
      // 1. Join Booking Room
      socket.on('join_booking_room', ({ bookingId, role }: { bookingId: string; role: string }) => {
        if (!bookingId) return;

        const room = `room:booking_${bookingId}`;
        socket.join(room);

        // If joining late, immediately push the latest cached telemetry snapshot to this socket
        const cached = TrackingSocketGateway.latestPositions.get(bookingId);
        if (cached) {
          socket.emit('live_location_stream', cached);
        }
      });

      // 2. High-Frequency Provider Location Update (3-5s interval)
      socket.on('provider_location_update', async (data: ProviderLocationPayload) => {
        const { bookingId, providerId, latitude, longitude, heading = 0, speed = 0 } = data;

        // Basic bounds validation
        if (
          latitude === undefined ||
          longitude === undefined ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          return;
        }

        const now = Date.now();
        const payload: ProviderLocationPayload = {
          bookingId,
          providerId,
          latitude: Number(latitude.toFixed(6)),
          longitude: Number(longitude.toFixed(6)),
          heading: Math.round(heading),
          speed: Math.round(speed),
          distanceKm: data.distanceKm,
          etaMinutes: data.etaMinutes,
        };

        // Cache in-memory for instant lookups
        TrackingSocketGateway.latestPositions.set(bookingId, payload);

        // A. ZERO-LATENCY BROADCAST: Immediately stream to user via WebSocket room
        socket.to(`room:booking_${bookingId}`).emit('live_location_stream', payload);

        // B. DATABASE WRITE-OFFLOADING: Throttle PostgreSQL write to once every 30 seconds
        const lastWrite = TrackingSocketGateway.lastDbWriteMap.get(providerId) || 0;
        if (now - lastWrite >= 30000) {
          TrackingSocketGateway.lastDbWriteMap.set(providerId, now);

          // Asynchronously persist to PostGIS without blocking the socket event loop
          this.persistProviderLocation(providerId, latitude, longitude, heading, speed).catch(() => {});
        }
      });

      // 3. Status Transition Event (ARRIVED, COMPLETED, etc.)
      socket.on('order_status_update', async ({ bookingId, status, providerId }: { bookingId: string; status: string; providerId?: string }) => {
        try {
          if (!bookingId || !status) return;

          // Update status in PostgreSQL
          if (status === 'ARRIVED') {
            await this.pool.query(`UPDATE bookings SET status = 'ARRIVED', arrived_at = NOW() WHERE id = $1;`, [bookingId]);
          } else if (status === 'COMPLETED') {
            await this.pool.query(`UPDATE bookings SET status = 'COMPLETED', completed_at = NOW() WHERE id = $1;`, [bookingId]);

            // Unlock provider for next dispatch
            if (providerId) {
              await this.pool.query(`UPDATE providers SET is_available = true WHERE id = $1;`, [providerId]);
            }
          }

          // Broadcast to all devices in the room
          this.io.to(`room:booking_${bookingId}`).emit('status_changed', {
            bookingId,
            status,
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          console.error('[SocketGateway] order_status_update error:', err);
        }
      });

      socket.on('disconnect', () => {
        // Socket cleanup handled automatically by Socket.io
      });
    });
  }

  /**
   * Persists provider location to PostgreSQL with PostGIS ST_MakePoint (Longitude, Latitude)
   */
  private async persistProviderLocation(
    providerId: string,
    lat: number,
    lng: number,
    heading: number,
    speed: number
  ): Promise<void> {
    try {
      // PostGIS ST_MakePoint strictly expects Longitude FIRST, Latitude SECOND ($1 = lng, $2 = lat)
      const query = `
        UPDATE providers 
        SET 
          current_location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          current_heading = $3,
          current_speed = $4,
          last_ping_at = NOW()
        WHERE id = $5 OR user_id = $5;
      `;
      await this.pool.query(query, [lng, lat, heading, speed, providerId]);
    } catch (err) {
      console.warn('[SocketGateway] Error persisting throttled provider location:', err);
    }
  }
}
