'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Bus, ExternalLink, CheckCircle, RefreshCw } from 'lucide-react';

interface BouncieLocation {
  lat: number;
  lng: number;
  speed_mph: number;
  heading: number;
  recorded_at: string;
}

interface ETAResult { distanceMiles: number; etaMinutes: number }

interface BouncieDevice {
  id: string;
  device_id: string;
  vehicle_name: string;
  is_shuttle: boolean;
  bouncie_locations?: BouncieLocation[];
  etaToHotel?: ETAResult | null;
  etaToDest?: ETAResult | null;
  shuttleDirection?: string | null;
}

interface BouncieTrip {
  id: string;
  trip_id: string;
  start_at: string;
  end_at: string | null;
  distance_miles: number;
  duration_seconds: number;
}

function formatTime(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds: number) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function formatTimeAgo(iso?: string) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function LiveDuration({ startAt }: { startAt: string }) {
  const [secs, setSecs] = useState(Math.floor((Date.now() - new Date(startAt).getTime()) / 1000));
  useEffect(() => {
    const id = setInterval(() => setSecs(Math.floor((Date.now() - new Date(startAt).getTime()) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startAt]);
  const m = Math.floor(secs / 60);
  return <span>{m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`}</span>;
}

interface Coords { lat: number; lng: number }

// Poll every 30s while moving, every 5 min while idle
const POLL_MOVING_MS = 30_000;
const POLL_IDLE_MS   = 5 * 60_000;

export default function BouncieLiveShuttle({ hotelId, isAdmin }: { hotelId: string; isAdmin?: boolean }) {
  const [devices, setDevices] = useState<BouncieDevice[]>([]);
  const [trips, setTrips] = useState<BouncieTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [hotelCoords, setHotelCoords] = useState<Coords | null>(null);
  const [destCoords, setDestCoords] = useState<Coords | null>(null);
  const [destName, setDestName] = useState<string | null>(null);
  const [showDestSettings, setShowDestSettings] = useState(false);
  const [destForm, setDestForm] = useState({ name: '', address: '' });
  const [destSaving, setDestSaving] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [vehRes, tripsRes] = await Promise.all([
        fetch(`/api/bouncie/vehicles?hotelId=${encodeURIComponent(hotelId)}`).then(r => r.json()),
        fetch(`/api/bouncie/trips?hotelId=${encodeURIComponent(hotelId)}`).then(r => r.json()),
      ]);
      const devs: BouncieDevice[] = vehRes.devices || [];
      setDevices(devs);
      setTrips(tripsRes.trips || []);
      setConnected(vehRes.connected === true);
      setNeedsReauth(vehRes.needsReauth === true);
      setHotelCoords(vehRes.hotelCoords || null);
      setDestCoords(vehRes.destCoords || null);
      setDestName(vehRes.destName || null);
      if (!isManual && vehRes.destName !== undefined) {
        setDestForm({ name: vehRes.destName || '', address: '' });
      }

      // Schedule next poll based on whether any vehicle is moving
      if (timerRef.current) clearTimeout(timerRef.current);
      const shuttle = devs.find(d => d.is_shuttle) || devs[0];
      const speed = shuttle?.bouncie_locations?.[0]?.speed_mph ?? 0;
      const delay = speed > 2 ? POLL_MOVING_MS : POLL_IDLE_MS;
      timerRef.current = setTimeout(() => load(false), delay);
    } catch {
      // on error, retry in 2 min
      timerRef.current = setTimeout(() => load(false), 2 * 60_000);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hotelId]);

  useEffect(() => {
    if (!hotelId) return;
    load(false);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [hotelId, load]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 flex items-center gap-2 text-gray-400 text-[12px]">
        <Bus size={14} className="animate-pulse" /> Loading shuttle GPS…
      </div>
    );
  }

  // Not connected or needs re-auth
  if (connected === false) {
    return (
      <div className="bg-gradient-to-br from-teal-50 to-white rounded-2xl border border-teal-100 p-5 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
            <Bus size={20} className="text-teal-600" />
          </div>
          <div>
            <p className="font-extrabold text-[15px] text-gray-900">Live Shuttle GPS</p>
            {needsReauth
              ? <p className="text-[11px] text-amber-600 font-semibold">Authorization expired — re-connect to restore live tracking</p>
              : <p className="text-[11px] text-gray-500">Powered by Bouncie</p>
            }
          </div>
        </div>
        {!needsReauth && (
          <ul className="text-[12px] text-gray-500 mb-4 space-y-0.5 ml-1">
            <li>📍 Live shuttle location & direction</li>
            <li>⏱ ETA to airport and back</li>
            <li>📋 Today&apos;s trip log</li>
          </ul>
        )}
        <a
          href={`/api/bouncie-auth?hotelId=${encodeURIComponent(hotelId)}`}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-teal-600 text-white text-[13px] font-bold hover:bg-teal-700 transition-colors"
        >
          {needsReauth ? 'Re-connect Bouncie GPS' : 'Connect Bouncie GPS'} <ExternalLink size={13} />
        </a>
      </div>
    );
  }

  const shuttle = devices.find(d => d.is_shuttle) || devices[0];
  const loc = shuttle?.bouncie_locations?.[0];
  const etaToHotel = shuttle?.etaToHotel ?? null;
  const etaToDest = shuttle?.etaToDest ?? null;
  const shuttleDirection = shuttle?.shuttleDirection ?? null;
  const activeTrip = trips.find(t => !t.end_at) ?? null;
  const completedTrips = trips.filter(t => !!t.end_at);
  const isMoving = (loc?.speed_mph ?? 0) > 2;

  // Direction banner config
  const directionConfig = (() => {
    if (!shuttleDirection) return null;
    if (shuttleDirection === 'at_hotel') return { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-700', icon: '🏨', label: `Parked at hotel` };
    if (shuttleDirection === 'at_dest')  return { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', icon: '✈️', label: `At ${destName || 'airport'} — picking up` };
    if (shuttleDirection === 'to_dest')  return { bg: 'bg-sky-50 border-sky-200', text: 'text-sky-800', icon: '→', label: `En route to ${destName || 'airport'}` };
    return { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-800', icon: '←', label: `Returning to hotel` };
  })();

  // Inline map
  const mapIframe = loc ? (() => {
    const lats = [loc.lat, hotelCoords?.lat, destCoords?.lat].filter((v): v is number => v != null);
    const lngs = [loc.lng, hotelCoords?.lng, destCoords?.lng].filter((v): v is number => v != null);
    const minLat = Math.min(...lats) - 0.006;
    const maxLat = Math.max(...lats) + 0.006;
    const minLng = Math.min(...lngs) - 0.01;
    const maxLng = Math.max(...lngs) + 0.01;
    const bbox = `${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}`;
    return (
      <div className="rounded-xl overflow-hidden border border-gray-200">
        <iframe
          title="Live shuttle location"
          className="w-full h-48 block"
          loading="lazy"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${loc.lat}%2C${loc.lng}`}
        />
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 text-[11px]">
          <span className="text-gray-400">📍 {formatTimeAgo(loc.recorded_at)}{hotelCoords ? ' · 🏨 Hotel' : ''}{destCoords ? ` · ✈️ ${destName || 'Airport'}` : ''}</span>
          <a href={`https://www.openstreetmap.org/?mlat=${loc.lat}&mlon=${loc.lng}#map=14/${loc.lat}/${loc.lng}`}
             target="_blank" rel="noreferrer" className="font-bold text-teal-700 flex items-center gap-1">
            Open map <ExternalLink size={10} />
          </a>
        </div>
      </div>
    );
  })() : null;

  if (!shuttle) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bus size={16} className="text-teal-600" />
            <span className="font-bold text-[14px] text-gray-900">Live Shuttle</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">✓ Connected</span>
          </div>
          <button onClick={() => load(true)} disabled={refreshing} className="text-teal-600 disabled:opacity-40">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
        <p className="text-[12px] text-gray-400">Waiting for GPS device to come online.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center">
            <Bus size={16} className="text-teal-600" />
          </div>
          <div>
            <h3 className="font-extrabold text-[14px] text-gray-900">Live Shuttle</h3>
            <p className="text-[10px] text-gray-400">{shuttle.vehicle_name || 'Shuttle'} · Bouncie GPS</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${isMoving ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
            <span className="text-[10px] font-bold text-gray-600">{isMoving ? 'Moving' : 'Idle'}</span>
          </div>
          <button onClick={() => load(true)} disabled={refreshing} className="text-gray-400 hover:text-teal-600 disabled:opacity-40">
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Direction banner */}
      {directionConfig && (
        <div className={`rounded-xl border px-3 py-2.5 flex items-center gap-2 text-[13px] font-bold ${directionConfig.bg} ${directionConfig.text}`}>
          <span className="text-[16px]">{directionConfig.icon}</span>
          {directionConfig.label}
        </div>
      )}

      {/* ETA chips — direction-aware:
            to_dest   → show ETA to airport
            at_dest   → show ETA back to hotel (idle at airport, waiting to depart)
            to_hotel  → show ETA to hotel
            at_hotel  → hide both
      */}
      {loc && shuttleDirection !== 'at_hotel' && (etaToDest || etaToHotel) && (() => {
        const showDest  = shuttleDirection === 'to_dest'  && etaToDest;
        const showHotel = (shuttleDirection === 'at_dest' || shuttleDirection === 'to_hotel') && etaToHotel;
        if (!showDest && !showHotel) return null;
        return (
        <div className={`grid gap-2 ${showDest && showHotel ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {showDest && etaToDest && (
            <div className={`rounded-xl px-3 py-3 text-center border ${etaToDest.distanceMiles <= 0.5 ? 'bg-emerald-50 border-emerald-200' : 'bg-sky-50 border-sky-100'}`}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">ETA to {destName || 'Airport'}</p>
              <p className={`text-[22px] font-black leading-tight ${etaToDest.distanceMiles <= 0.5 ? 'text-emerald-700' : 'text-sky-700'}`}>
                {etaToDest.distanceMiles <= 0.5 ? 'Arriving' : `${etaToDest.etaMinutes} min`}
              </p>
              <p className="text-[10px] text-gray-400">{etaToDest.distanceMiles.toFixed(1)} mi away</p>
            </div>
          )}
          {showHotel && etaToHotel && (
            <div className={`rounded-xl px-3 py-3 text-center border ${etaToHotel.distanceMiles <= 0.5 ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-100'}`}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">ETA back to Hotel</p>
              <p className={`text-[22px] font-black leading-tight ${etaToHotel.distanceMiles <= 0.5 ? 'text-emerald-700' : 'text-orange-700'}`}>
                {etaToHotel.distanceMiles <= 0.5 ? 'Arriving' : `${etaToHotel.etaMinutes} min`}
              </p>
              <p className="text-[10px] text-gray-400">{etaToHotel.distanceMiles.toFixed(1)} mi away</p>
            </div>
          )}
        </div>
        );
      })()}



      {/* No GPS yet */}
      {!loc && <p className="text-[12px] text-gray-400 italic">No GPS signal yet.</p>}

      {/* Active trip */}
      {activeTrip && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 mb-1.5">🟢 Active Trip</p>
          <div className="flex justify-between text-[12px]">
            <span className="text-emerald-700">Departed</span>
            <span className="font-bold text-gray-900">{formatTime(activeTrip.start_at)}</span>
          </div>
          <div className="flex justify-between text-[12px] mt-1">
            <span className="text-emerald-700">Running</span>
            <span className="font-bold text-gray-900"><LiveDuration startAt={activeTrip.start_at} /></span>
          </div>
        </div>
      )}

      {/* Map */}
      {/* Map toggle */}
      {loc && (
        <div>
          <button
            onClick={() => setShowMap(v => !v)}
            className="text-[12px] text-teal-600 font-semibold flex items-center gap-1"
          >
            {showMap ? '▾ Hide map' : '▸ Show map'}
          </button>
          {showMap && <div className="mt-2">{mapIframe}</div>}
        </div>
      )}

      {/* Trip history */}
      {completedTrips.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Today&apos;s Trips</p>
          <div className="space-y-1">
            {completedTrips.slice(-5).reverse().map(trip => (
              <div key={trip.id} className="flex items-center justify-between text-[12px] bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-1.5 text-gray-600">
                  <CheckCircle size={11} className="text-teal-500 shrink-0" />
                  <span>{formatTime(trip.start_at)} → {formatTime(trip.end_at)}</span>
                </div>
                <div className="text-gray-500 font-semibold">
                  {trip.distance_miles > 0 ? `${trip.distance_miles.toFixed(1)} mi` : ''}{trip.distance_miles > 0 && trip.duration_seconds > 0 ? ' · ' : ''}{trip.duration_seconds > 0 ? formatDuration(trip.duration_seconds) : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Destination config — admin only */}
      {isAdmin && (
        <div className="border-t border-gray-100 pt-2">
          <button
            onClick={() => setShowDestSettings(v => !v)}
            className="text-[11px] font-semibold text-gray-400 hover:text-teal-600 w-full text-left"
          >
            {showDestSettings ? '▾' : '▸'} {destName ? `Destination: ${destName}` : 'Set shuttle destination (airport, etc.)'}
          </button>
          {showDestSettings && (
            <div className="mt-2 space-y-2">
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px] placeholder-gray-400"
                placeholder="Destination name (e.g. FLL Airport)"
                value={destForm.name}
                onChange={e => setDestForm(f => ({ ...f, name: e.target.value }))}
              />
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px] placeholder-gray-400"
                placeholder="Address (e.g. 100 Terminal Dr, Fort Lauderdale FL)"
                value={destForm.address}
                onChange={e => setDestForm(f => ({ ...f, address: e.target.value }))}
              />
              <button
                disabled={destSaving || !destForm.address.trim()}
                onClick={async () => {
                  setDestSaving(true);
                  try {
                    await fetch(`/api/hotel-settings?hotelId=${encodeURIComponent(hotelId)}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ shuttle_dest_name: destForm.name, shuttle_dest_address: destForm.address }),
                    });
                    setShowDestSettings(false);
                    load(true);
                  } finally {
                    setDestSaving(false);
                  }
                }}
                className="w-full py-2 rounded-lg bg-teal-600 text-white text-[12px] font-bold disabled:opacity-40"
              >
                {destSaving ? 'Saving…' : 'Save destination'}
              </button>
              {destName && (
                <button
                  className="w-full py-1.5 rounded-lg text-[11px] text-red-500 border border-red-100"
                  onClick={async () => {
                    await fetch(`/api/hotel-settings?hotelId=${encodeURIComponent(hotelId)}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ shuttle_dest_name: null, shuttle_dest_address: null }),
                    });
                    setShowDestSettings(false);
                    load(true);
                  }}
                >
                  Remove destination
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
