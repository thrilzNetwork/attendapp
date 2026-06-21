'use client';

import { useEffect, useRef } from 'react';

interface Props {
  shuttleLat: number;
  shuttleLng: number;
  hotelLat?: number | null;
  hotelLng?: number | null;
  destLat?: number | null;
  destLng?: number | null;
  destName?: string | null;
  hotelName?: string | null;
}

export default function ShuttleMap({ shuttleLat, shuttleLng, hotelLat, hotelLng, destLat, destLng, destName, hotelName }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Dynamic import — Leaflet requires window
    import('leaflet').then(L => {
      // Fix default icon paths broken by webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current!, { zoomControl: true, attributionControl: true });
      mapRef.current = map;

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const points: [number, number][] = [[shuttleLat, shuttleLng]];

      // Shuttle marker — teal bus icon via DivIcon
      const shuttleIcon = L.divIcon({
        html: `<div style="background:#0D9488;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);font-size:14px;">🚐</div>`,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      L.marker([shuttleLat, shuttleLng], { icon: shuttleIcon }).addTo(map).bindPopup('🚐 Shuttle');

      // Hotel marker
      if (hotelLat != null && hotelLng != null) {
        points.push([hotelLat, hotelLng]);
        const hotelIcon = L.divIcon({
          html: `<div style="background:#1E40AF;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:13px;">🏨</div>`,
          className: '',
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });
        L.marker([hotelLat, hotelLng], { icon: hotelIcon }).addTo(map).bindPopup(`🏨 ${hotelName || 'Hotel'}`);
      }

      // Destination marker
      if (destLat != null && destLng != null) {
        points.push([destLat, destLng]);
        const destIcon = L.divIcon({
          html: `<div style="background:#7C3AED;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:13px;">✈️</div>`,
          className: '',
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });
        L.marker([destLat, destLng], { icon: destIcon }).addTo(map).bindPopup(`✈️ ${destName || 'Destination'}`);
      }

      // Fit map to show all markers with padding
      if (points.length > 1) {
        map.fitBounds(L.latLngBounds(points), { padding: [32, 32] });
      } else {
        map.setView([shuttleLat, shuttleLng], 14);
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // Run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update shuttle marker position on subsequent renders
  useEffect(() => {
    if (!mapRef.current) return;
    import('leaflet').then(L => {
      // Find and remove old shuttle layer, re-add updated one
      mapRef.current.eachLayer((layer: any) => {
        if (layer._popup && layer._popup.getContent() === '🚐 Shuttle') {
          mapRef.current.removeLayer(layer);
        }
      });
      const shuttleIcon = L.divIcon({
        html: `<div style="background:#0D9488;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);font-size:14px;">🚐</div>`,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      L.marker([shuttleLat, shuttleLng], { icon: shuttleIcon }).addTo(mapRef.current).bindPopup('🚐 Shuttle');
    });
  }, [shuttleLat, shuttleLng]);

  return (
    <>
      {/* Leaflet CSS — loaded once globally via link tag */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={containerRef} className="w-full rounded-xl overflow-hidden border border-gray-200" style={{ height: 220 }} />
    </>
  );
}
