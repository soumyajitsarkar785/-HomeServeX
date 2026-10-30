import React, { useEffect, useRef, useState } from 'react';

export interface RealMapCoordinates {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
}

export interface RealStreetMapProps {
  destination: {
    latitude: number;
    longitude: number;
    address: string;
    landmark?: string | null;
  };
  providerLocation: RealMapCoordinates;
  polylineRoute?: Array<[number, number]>;
  etaMinutes?: number;
  distanceKm?: number;
  providerName?: string;
  vehicleName?: string;
  height?: string;
  status?: string;
  onRecenter?: () => void;
  onDetectGps?: () => void;
  gpsLoading?: boolean;
}

export const RealStreetMap: React.FC<RealStreetMapProps> = ({
  destination,
  providerLocation,
  polylineRoute = [],
  etaMinutes = 12,
  distanceKm = 2.4,
  providerName = 'Ramesh Kumar',
  vehicleName = 'Hero Electric (MH 02 CD 4821)',
  height = '240px',
  status = 'ARRIVED',
  onRecenter,
  onDetectGps,
  gpsLoading = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const providerMarkerRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const [loadError, setLoadError] = useState(false);

  // Initialize or re-center Leaflet Map
  useEffect(() => {
    let isMounted = true;

    const initMap = () => {
      const L = (window as any).L;
      if (!L || !containerRef.current) return false;

      // Prevent re-initialization if already active
      if (mapInstanceRef.current) {
        return true;
      }

      try {
        const destLat = destination.latitude || 22.5800;
        const destLng = destination.longitude || 88.4326;

        let safeProvLat = providerLocation.latitude || destLat + 0.0095;
        let safeProvLng = providerLocation.longitude || destLng - 0.0085;
        const coordDist = Math.hypot(destLat - safeProvLat, destLng - safeProvLng);
        if (coordDist > 0.25) {
          safeProvLat = destLat + 0.0095;
          safeProvLng = destLng - 0.0085;
        }

        // Initialize Map centered on local neighborhood
        const map = L.map(containerRef.current, {
          zoomControl: false,
          attributionControl: false,
          fadeAnimation: true,
          zoomAnimation: true,
          minZoom: 13,
          maxZoom: 19,
        }).setView([(safeProvLat + destLat) / 2, (safeProvLng + destLng) / 2], 15);

        // OpenStreetMap Real Street Tile Layer
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          subdomains: ['a', 'b', 'c'],
        }).addTo(map);

        // Custom Destination Marker (Customer Home)
        const destIcon = L.divIcon({
          className: 'hsx-dest-marker',
          html: `
            <div style="position:relative; width:34px; height:34px; display:flex; align-items:center; justify-content:center;">
              <div style="width:30px; height:30px; border-radius:50%; background:#0E3E2F; border:2.5px solid #FFFFFF; box-shadow:0 3px 10px rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center; font-size:15px; color:#FFFFFF;">
                🏠
              </div>
              <div style="position:absolute; bottom:-5px; width:0; height:0; border-left:5px solid transparent; border-right:5px solid transparent; border-top:6px solid #0E3E2F;"></div>
            </div>
          `,
          iconSize: [34, 38],
          iconAnchor: [17, 38],
          popupAnchor: [0, -38],
        });

        const destMarker = L.marker([destLat, destLng], { icon: destIcon }).addTo(map);
        destMarker.bindPopup(`
          <div style="font-family:'Inter',sans-serif; padding:4px;">
            <div style="font-size:10px; font-weight:700; color:#16A34A; text-transform:uppercase;">Delivery Destination</div>
            <div style="font-size:12px; font-weight:800; color:#0F172A; margin-top:2px;">${destination.address}</div>
          </div>
        `);
        destMarkerRef.current = destMarker;

        // Custom Provider Marker (Moving Technician)
        const provIcon = L.divIcon({
          className: 'hsx-prov-marker',
          html: `
            <div style="position:relative; width:40px; height:40px; display:flex; align-items:center; justify-content:center;">
              <div style="position:absolute; width:40px; height:40px; border-radius:50%; background:rgba(22, 163, 74, 0.28); animation:pulse 1.8s infinite;"></div>
              <div style="width:32px; height:32px; border-radius:50%; background:#16A34A; border:2.5px solid #FFFFFF; box-shadow:0 4px 12px rgba(22,163,74,0.45); display:flex; align-items:center; justify-content:center; font-size:16px;">
                🛵
              </div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
          popupAnchor: [0, -20],
        });

        const provMarker = L.marker([safeProvLat, safeProvLng], { icon: provIcon }).addTo(map);
        provMarker.bindPopup(`
          <div style="font-family:'Inter',sans-serif; padding:4px;">
            <div style="font-size:10px; font-weight:700; color:#16A34A; text-transform:uppercase;">Technician En Route</div>
            <div style="font-size:12px; font-weight:800; color:#0F172A; margin-top:2px;">${providerName}</div>
            <div style="font-size:11px; color:#64748B;">${vehicleName}</div>
          </div>
        `);
        providerMarkerRef.current = provMarker;

        // Route Polyline
        let points: Array<[number, number]> = [];
        if (polylineRoute && polylineRoute.length > 0 && coordDist <= 0.25) {
          points = polylineRoute;
        } else {
          // Fallback realistic points
          points = [
            [safeProvLat, safeProvLng],
            [safeProvLat + (destLat - safeProvLat) * 0.35, safeProvLng + (destLng - safeProvLng) * 0.25],
            [safeProvLat + (destLat - safeProvLat) * 0.65, safeProvLng + (destLng - safeProvLng) * 0.75],
            [destLat, destLng],
          ];
        }

        const polyline = L.polyline(points, {
          color: '#16A34A',
          weight: 4.5,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
          dashArray: '6, 6',
        }).addTo(map);
        polylineRef.current = polyline;

        // View center / bounds based on status with tight neighborhood street framing
        if (etaMinutes === 0 || status === 'ARRIVED' || status === 'IN_PROGRESS' || distanceKm === 0) {
          map.setView([destLat, destLng], 16);
        } else {
          try {
            map.fitBounds(polyline.getBounds(), { padding: [32, 32], maxZoom: 16 });
          } catch {
            map.setView([destLat, destLng], 15);
          }
        }

        mapInstanceRef.current = map;
        return true;
      } catch (err) {
        console.warn('Leaflet init error:', err);
        if (isMounted) setLoadError(true);
        return false;
      }
    };

    // Attempt init, retry if Leaflet script is still fetching
    if (!initMap()) {
      const interval = setInterval(() => {
        if (initMap()) {
          clearInterval(interval);
        }
      }, 250);

      const timeout = setTimeout(() => {
        clearInterval(interval);
        if (!mapInstanceRef.current && isMounted) {
          setLoadError(true);
        }
      }, 4000);

      return () => {
        isMounted = false;
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Smoothly update provider and destination markers when telemetry changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const destLat = destination.latitude || 22.5800;
    const destLng = destination.longitude || 88.4326;

    let provLat = providerLocation.latitude || destLat + 0.0095;
    let provLng = providerLocation.longitude || destLng - 0.0085;
    if (Math.hypot(destLat - provLat, destLng - provLng) > 0.25) {
      provLat = destLat + 0.0095;
      provLng = destLng - 0.0085;
    }

    if (provLat && provLng && providerMarkerRef.current) {
      providerMarkerRef.current.setLatLng([provLat, provLng]);
    }

    if (destLat && destLng && destMarkerRef.current) {
      destMarkerRef.current.setLatLng([destLat, destLng]);
    }

    if (polylineRef.current) {
      if (polylineRoute && polylineRoute.length > 0 && Math.hypot(destLat - provLat, destLng - provLng) <= 0.25) {
        polylineRef.current.setLatLngs(polylineRoute);
      } else if (provLat && provLng && destLat && destLng) {
        polylineRef.current.setLatLngs([[provLat, provLng], [destLat, destLng]]);
      }
    }
  }, [providerLocation.latitude, providerLocation.longitude, destination.latitude, destination.longitude, polylineRoute]);

  const handleRecenter = () => {
    if (mapInstanceRef.current && polylineRef.current) {
      try {
        mapInstanceRef.current.fitBounds(polylineRef.current.getBounds(), { padding: [32, 32], maxZoom: 16 });
      } catch {
        mapInstanceRef.current.setView([destination.latitude, destination.longitude], 15);
      }
    }
    if (onRecenter) onRecenter();
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height,
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1.5px solid #CBD5E1',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.06)',
        backgroundColor: '#E2E8F0',
      }}
    >
      {/* Real Leaflet Map Container */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          display: loadError ? 'none' : 'block',
        }}
      />

      {/* Fallback Vector Map in case of offline network */}
      {loadError && (
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#F1F5F9',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg viewBox="0 0 340 210" style={{ width: '100%', height: '100%' }}>
            <path d="M 0 50 L 340 50" stroke="#E2E8F0" strokeWidth="8" />
            <path d="M 0 140 L 340 140" stroke="#E2E8F0" strokeWidth="10" />
            <path d="M 90 0 L 90 210" stroke="#E2E8F0" strokeWidth="8" />
            <path d="M 230 0 L 230 210" stroke="#E2E8F0" strokeWidth="8" />
            <path
              d="M 60 170 Q 140 160 180 110 T 260 60"
              fill="none"
              stroke="#16A34A"
              strokeWidth="4"
              strokeDasharray="6,4"
            />
            <circle cx="260" cy="60" r="10" fill="#0E3E2F" />
            <circle cx="150" cy="125" r="12" fill="#16A34A" />
          </svg>
        </div>
      )}

      {/* Floating Compact Live ETA Badge (Top Left) */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          backgroundColor: 'rgba(14, 62, 47, 0.94)',
          backdropFilter: 'blur(8px)',
          color: '#FFFFFF',
          padding: '6px 12px',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 14px rgba(14, 62, 47, 0.3)',
          zIndex: 400,
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: status === 'ARRIVED' ? '#FBBF24' : status === 'IN_PROGRESS' ? '#38BDF8' : '#86EFAC',
            boxShadow: `0 0 8px ${status === 'ARRIVED' ? '#FBBF24' : status === 'IN_PROGRESS' ? '#38BDF8' : '#86EFAC'}`,
            display: 'inline-block',
          }}
        />
        <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.01em' }}>
          {status === 'ARRIVED'
            ? '📍 Specialist Arrived at Doorstep!'
            : status === 'IN_PROGRESS'
            ? '⚡ Service In Progress (AC Jet Wash)'
            : status === 'COMPLETED'
            ? '✓ Service Completed'
            : etaMinutes > 0
            ? `Arriving in ${etaMinutes} mins (${distanceKm} km)`
            : 'Technician Arrived!'}
        </span>
      </div>

      {/* Floating Controls (Top Right: Recenter + Zoom) */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          zIndex: 400,
        }}
      >
        {onDetectGps && (
          <button
            onClick={onDetectGps}
            disabled={gpsLoading}
            title="Use My Real Device GPS"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              backgroundColor: gpsLoading ? '#FEF3C7' : '#FFFFFF',
              border: '1.5px solid #16A34A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '15px',
              cursor: gpsLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(22,163,74,0.2)',
            }}
          >
            {gpsLoading ? '⏳' : '📍'}
          </button>
        )}
        <button
          onClick={handleRecenter}
          title="Recenter Map"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #CBD5E1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '15px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          🎯
        </button>
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #CBD5E1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '15px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #CBD5E1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '15px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          −
        </button>
      </div>

      {/* Street Map Watermark Credit (Bottom Right) */}
      <div
        style={{
          position: 'absolute',
          bottom: '6px',
          right: '8px',
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '9px',
          color: '#64748B',
          fontWeight: 600,
          zIndex: 400,
          pointerEvents: 'none',
        }}
      >
        © OpenStreetMap
      </div>
    </div>
  );
};
