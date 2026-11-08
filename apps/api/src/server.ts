import http from 'http';
import crypto from 'crypto';
import { createApp } from './app.js';
import { config } from './config/env.js';
import { trackingEngine } from './lib/trackingEngine.js';

const app = createApp();
const server = http.createServer(app);

// RFC 6455 Real-time WebSocket Protocol Upgrade Server
server.on('upgrade', (req, socket, _head) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/v1/tracking/ws') || url.pathname.startsWith('/ws')) {
      const key = req.headers['sec-websocket-key'];
      if (!key) {
        socket.destroy();
        return;
      }

      const bookingId = url.searchParams.get('bookingId') || '';

      // Compute WebSocket Handshake Accept Key
      const acceptKey = crypto
        .createHash('sha1')
        .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
        .digest('base64');

      const headers = [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${acceptKey}`,
        '\r\n',
      ];
      socket.write(headers.join('\r\n'));

      const subId = crypto.randomUUID();
      let unsubscribe: (() => void) | null = null;

      if (bookingId) {
        unsubscribe = trackingEngine.joinRoom(bookingId, {
          id: subId,
          role: 'CUSTOMER',
          userId: 'ws-subscriber',
          wsSocket: socket as any,
        });

        // Send initial live tracking state snapshot
        trackingEngine.getLiveTrackingState(bookingId, 'CUSTOMER').then((snapshot) => {
          if (snapshot) {
            trackingEngine.sendWsFrame(socket as any, JSON.stringify({ event: 'initial_state', data: snapshot }));
          }
        }).catch(() => {});
      }

      socket.on('data', async (buffer) => {
        try {
          if (buffer.length < 2) return;
          const opcode = buffer[0] & 0x0f;
          if (opcode === 0x8) {
            socket.destroy();
            return;
          }
          if (opcode === 0x9) {
            socket.write(Buffer.from([0x8a, 0x00])); // Pong response
            return;
          }

          const isMasked = (buffer[1] & 0x80) === 0x80;
          let payloadLen = buffer[1] & 0x7f;
          let offset = 2;
          if (payloadLen === 126) {
            payloadLen = buffer.readUInt16BE(2);
            offset = 4;
          } else if (payloadLen === 127) {
            payloadLen = Number(buffer.readBigUInt64BE(2));
            offset = 10;
          }

          let maskingKey: Buffer | null = null;
          if (isMasked) {
            maskingKey = buffer.subarray(offset, offset + 4);
            offset += 4;
          }

          const payload = buffer.subarray(offset, offset + payloadLen);
          const mKey = maskingKey;
          if (isMasked && mKey) {
            for (let i = 0; i < payload.length; i++) {
              const byte = payload[i];
              const maskByte = mKey[i % 4];
              if (byte !== undefined && maskByte !== undefined) {
                payload[i] = byte ^ maskByte;
              }
            }
          }

          const messageStr = payload.toString('utf8');
          const parsed = JSON.parse(messageStr);

          // Handle incoming provider:emit_location
          if (parsed.event === 'provider:emit_location' && parsed.data) {
            const { bookingId: bId, providerId, latitude, longitude, heading, speed } = parsed.data;
            await trackingEngine.handleLocationPing({
              bookingId: bId || bookingId,
              providerId: providerId || 'pro-ramesh-1',
              latitude: Number(latitude),
              longitude: Number(longitude),
              heading: heading !== undefined ? Number(heading) : undefined,
              speed: speed !== undefined ? Number(speed) : undefined,
            });
          } else if (parsed.event === 'join' && parsed.data?.bookingId) {
            if (unsubscribe) unsubscribe();
            unsubscribe = trackingEngine.joinRoom(parsed.data.bookingId, {
              id: subId,
              role: 'CUSTOMER',
              userId: 'ws-subscriber',
              wsSocket: socket as any,
            });
          }
        } catch (err) {
          console.warn('[WS] Frame error:', err);
        }
      });

      socket.on('close', () => {
        if (unsubscribe) unsubscribe();
      });
      socket.on('error', () => {
        if (unsubscribe) unsubscribe();
      });
    } else {
      socket.destroy();
    }
  } catch (err) {
    socket.destroy();
  }
});

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[HomeServeX API] Port ${config.port} is already in use. Please terminate existing process or verify active listeners.`);
    process.exit(1);
  } else {
    console.error('[HomeServeX API] Server error:', err);
  }
});

import { ensureDbColumns } from './lib/prisma.js';
import { enterpriseService } from './modules/enterprise/enterprise.service.js';

Promise.all([
  ensureDbColumns(),
  enterpriseService.initEnterpriseTables(),
]).then(() => {
  server.listen(config.port, '0.0.0.0', () => {
    console.log(`[HomeServeX API] Server running on port ${config.port} (0.0.0.0 - ${config.env}) - Real-Time Geolocation Tracking Engine Active`);
    console.log(`[HomeServeX API] Health check available at http://localhost:${config.port}/health`);
    console.log(`[HomeServeX API] Live tracking endpoints active at /api/v1/bookings/:id/live-tracking-state`);
    console.log(`[HomeServeX API] Enterprise 2.0 Ecosystem Active: Warranties, Memberships, Checklists, & AI Assistant`);
  });
}).catch((err) => {
  console.error('[HomeServeX API] DB Migration error:', err);
  server.listen(config.port, '0.0.0.0');
});
