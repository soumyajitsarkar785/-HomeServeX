import React, { useEffect, useRef, useState, useCallback } from 'react';

export interface MapCoordinates {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
}

interface LiveTrackingMapProps {
  destination: {
    latitude: number;
    longitude: number;
    address: string;
    landmark?: string | null;
  };
  providerLocation: MapCoordinates;
  polylineRoute?: Array<[number, number]>;
  etaMinutes?: number;
  distanceKm?: number;
  providerName?: string;
  vehicleName?: string;
  isWeakConnection?: boolean;
  onRecenter?: () => void;
}

// Calculate shortest angular distance between angles (in degrees) to avoid full spin
function lerpAngle(start: number, end: number, t: number): number {
  const diff = ((end - start + 180) % 360) - 180;
  return (start + diff * t + 360) % 360;
}

export const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({
  destination,
  providerLocation,
  polylineRoute = [],
  etaMinutes = 14,
  distanceKm = 2.4,
  vehicleName = 'Hero Electric (MH 02 CD 4821)',
  isWeakConnection = false,
  onRecenter,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Smooth LERP state
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: providerLocation.latitude,
    lng: providerLocation.longitude,
  });
  const [currentHeading, setCurrentHeading] = useState<number>(providerLocation.heading || 0);

  // Target and Previous coordinates for 3-second LERP interpolation
  const prevCoordsRef = useRef<{ lat: number; lng: number }>({
    lat: providerLocation.latitude,
    lng: providerLocation.longitude,
  });
  const prevHeadingRef = useRef<number>(providerLocation.heading || 0);
  const targetCoordsRef = useRef<{ lat: number; lng: number }>({
    lat: providerLocation.latitude,
    lng: providerLocation.longitude,
  });
  const targetHeadingRef = useRef<number>(providerLocation.heading || 0);

  const animStartRef = useRef<number>(Date.now());
  const animFrameRef = useRef<number | null>(null);

  // Map viewport bounds & zoom
  const [zoom, setZoom] = useState<number>(15);
  const [centerOffset, setCenterOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Update target when new providerLocation arrives
  useEffect(() => {
    prevCoordsRef.current = { ...currentCoords };
    prevHeadingRef.current = currentHeading;

    targetCoordsRef.current = {
      lat: providerLocation.latitude,
      lng: providerLocation.longitude,
    };
    targetHeadingRef.current = providerLocation.heading || 0;

    animStartRef.current = Date.now();
  }, [providerLocation.latitude, providerLocation.longitude, providerLocation.heading]);

  // 60FPS Linear Interpolation (LERP) loop over 3000ms duration
  useEffect(() => {
    const DURATION = 3000; // 3-second smooth transition matching GPS ping interval

    const animate = () => {
      const elapsed = Date.now() - animStartRef.current;
      const t = Math.min(1, elapsed / DURATION);

      // Smooth ease-out cubic for realistic vehicle inertia
      const ease = 1 - Math.pow(1 - t, 3);

      const lat = prevCoordsRef.current.lat + (targetCoordsRef.current.lat - prevCoordsRef.current.lat) * ease;
      const lng = prevCoordsRef.current.lng + (targetCoordsRef.current.lng - prevCoordsRef.current.lng) * ease;
      const heading = lerpAngle(prevHeadingRef.current, targetHeadingRef.current, ease);

      setCurrentCoords({ lat, lng });
      setCurrentHeading(heading);

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [providerLocation.latitude, providerLocation.longitude]);

  // Recenter map view
  const handleRecenter = useCallback(() => {
    setCenterOffset({ x: 0, y: 0 });
    setZoom(15);
    onRecenter?.();
  }, [onRecenter]);

  // Coordinate projection helper: converts Lat/Lng to Canvas pixels relative to center
  const project = useCallback(
    (lat: number, lng: number, centerLat: number, centerLng: number, width: number, height: number, z: number) => {
      // Scale factor based on zoom
      const scale = Math.pow(2, z) * 1200;
      const cosLat = Math.cos((centerLat * Math.PI) / 180);

      const x = width / 2 + (lng - centerLng) * scale * cosLat + centerOffset.x;
      const y = height / 2 - (lat - centerLat) * scale + centerOffset.y;
      return { x, y };
    },
    [centerOffset]
  );

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Center point between provider and destination
    const midLat = (currentCoords.lat + destination.latitude) / 2;
    const midLng = (currentCoords.lng + destination.longitude) / 2;

    // Clear background: Soft modern map tile styling (#F2F4F2)
    ctx.fillStyle = '#E8ECE9';
    ctx.fillRect(0, 0, width, height);

    // Draw realistic city block grids
    ctx.strokeStyle = '#DDE2DE';
    ctx.lineWidth = 1;
    const gridSize = 40 * (zoom / 15);
    const offsetX = (centerOffset.x % gridSize);
    const offsetY = (centerOffset.y % gridSize);

    for (let x = offsetX; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = offsetY; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw secondary road networks (arterials)
    ctx.strokeStyle = '#F7F9F7';
    ctx.lineWidth = 8 * (zoom / 15);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw route polyline if available
    const routePoints = polylineRoute.length > 0 ? polylineRoute : [
      [currentCoords.lat, currentCoords.lng],
      [(currentCoords.lat + destination.latitude) / 2 + 0.002, (currentCoords.lng + destination.longitude) / 2 - 0.001],
      [destination.latitude, destination.longitude],
    ];

    if (routePoints.length > 1 && routePoints[0]?.[0] !== undefined && routePoints[0]?.[1] !== undefined) {
      // 1. Route outer casing (dark green shadow)
      ctx.beginPath();
      const firstProjected = project(routePoints[0][0], routePoints[0][1], midLat, midLng, width, height, zoom);
      ctx.moveTo(firstProjected.x, firstProjected.y);

      for (let i = 1; i < routePoints.length; i++) {
        const ptPoint = routePoints[i];
        if (ptPoint && ptPoint[0] !== undefined && ptPoint[1] !== undefined) {
          const pt = project(ptPoint[0], ptPoint[1], midLat, midLng, width, height, zoom);
          ctx.lineTo(pt.x, pt.y);
        }
      }
      ctx.strokeStyle = '#0F4432';
      ctx.lineWidth = 8;
      ctx.stroke();

      // 2. Route active line: Rapido/Uber Forest Green (#16865D)
      ctx.strokeStyle = '#16865D';
      ctx.lineWidth = 5;
      ctx.stroke();

      // 3. Traveled dotted pulse
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = '#6EE7B7';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash
    }

    // Destination Pin (Customer Doorstep)
    const destPt = project(destination.latitude, destination.longitude, midLat, midLng, width, height, zoom);

    // Destination Pulsating Ripple Ring
    const pulseRadius = 18 + Math.sin(Date.now() / 300) * 4;
    ctx.beginPath();
    ctx.arc(destPt.x, destPt.y, pulseRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20, 92, 67, 0.15)';
    ctx.fill();

    // Destination Base Marker
    ctx.beginPath();
    ctx.arc(destPt.x, destPt.y, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#145C43';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    // Destination Pin Center (House icon dot)
    ctx.beginPath();
    ctx.arc(destPt.x, destPt.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // Destination Address Label Tag
    ctx.font = 'bold 11px Inter, sans-serif';
    const labelText = 'Your Location';
    const textWidth = ctx.measureText(labelText).width;
    ctx.fillStyle = '#17211C';
    ctx.fillRect(destPt.x - textWidth / 2 - 8, destPt.y - 36, textWidth + 16, 20);
    ctx.strokeStyle = '#CBE5D7';
    ctx.lineWidth = 1;
    ctx.strokeRect(destPt.x - textWidth / 2 - 8, destPt.y - 36, textWidth + 16, 20);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(labelText, destPt.x - textWidth / 2, destPt.y - 22);

    // Provider Live Vehicle Marker
    const provPt = project(currentCoords.lat, currentCoords.lng, midLat, midLng, width, height, zoom);

    // Save context for smooth vehicle rotation by heading angle
    ctx.save();
    ctx.translate(provPt.x, provPt.y);
    ctx.rotate((currentHeading * Math.PI) / 180);

    // Vehicle Radar Ping Halo
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(22, 134, 93, 0.22)';
    ctx.fill();

    // Vehicle Disc Badge
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#145C43';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    // Heading Arrow Tip (pointing in direction of movement)
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(6, -11);
    ctx.lineTo(-6, -11);
    ctx.closePath();
    ctx.fillStyle = '#10B981';
    ctx.fill();

    // Motorcycle / Vehicle icon inside circle
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }, [currentCoords, currentHeading, destination, polylineRoute, zoom, centerOffset, project]);

  // Resize canvas to match container
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Pan / Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - centerOffset.x, y: e.clientY - centerOffset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setCenterOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '380px',
        borderRadius: '24px',
        overflow: 'hidden',
        border: '1.5px solid #D1EADE',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.06)',
        backgroundColor: '#E8ECE9',
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Underlying Interactive Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      />

      {/* ── TOP-LEFT: LIVE SERVICE ETA PILL (EMERALD #145C43) ── */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          backgroundColor: 'rgba(20, 92, 67, 0.94)',
          backdropFilter: 'blur(8px)',
          color: '#FFFFFF',
          padding: '8px 14px',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 16px rgba(20, 92, 67, 0.35)',
          zIndex: 10,
        }}
      >
        {/* Pulsating green radar indicator */}
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#10B981',
            boxShadow: '0 0 10px #10B981',
            animation: 'pulse 1.5s infinite',
            display: 'inline-block',
          }}
        />
        <div style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '0.02em' }}>
          {etaMinutes > 0 ? `Arriving in ${etaMinutes} mins • ${distanceKm} km` : 'Technician Arrived!'}
        </div>
      </div>

      {/* ── TOP-RIGHT: FLOATING CONTROLS (RECENTER + ZOOM) ── */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 10,
        }}
      >
        {/* Recenter Button */}
        <button
          onClick={handleRecenter}
          title="Recenter Map View"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #D1EADE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#145C43',
            fontSize: '18px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            transition: 'all 0.15s ease',
          }}
        >
          🎯
        </button>

        {/* Zoom In */}
        <button
          onClick={() => setZoom(z => Math.min(z + 1, 18))}
          title="Zoom In"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #D1EADE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#17211C',
            fontSize: '18px',
            fontWeight: 900,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        >
          +
        </button>

        {/* Zoom Out */}
        <button
          onClick={() => setZoom(z => Math.max(z - 1, 12))}
          title="Zoom Out"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #D1EADE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#17211C',
            fontSize: '18px',
            fontWeight: 900,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        >
          −
        </button>
      </div>

      {/* ── WEAK CONNECTION WARNING BANNER ── */}
      {isWeakConnection && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#FEF3E2',
            color: '#D97706',
            border: '1px solid #FDE68A',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '11.5px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(217, 119, 6, 0.15)',
            zIndex: 10,
          }}
        >
          <span>⚠️</span>
          <span>Provider GPS connection weak. Reconnecting...</span>
        </div>
      )}

      {/* ── BOTTOM VEHICLE INFO STRIP ── */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '16px',
          right: '16px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          padding: '8px 14px',
          borderRadius: '14px',
          border: '1px solid #E4EAE5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11.5px',
          zIndex: 9,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#17211C', fontWeight: 800 }}>
          <span>🛵</span>
          <span>{vehicleName}</span>
        </div>
        <div style={{ color: '#16865D', fontWeight: 800 }}>
          Live Heading: {Math.round(currentHeading)}° • {providerLocation.speed ? `${Math.round(providerLocation.speed)} km/h` : '24 km/h'}
        </div>
      </div>
    </div>
  );
};
