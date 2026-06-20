'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bus, MapPin, Navigation, Clock, Activity, ExternalLink, Timer, Route, CheckCircle } from 'lucide-react';

interface BouncieLocation {
  lat: number;
  lng: number;
  speed_mph: number;
  heading: number;
  recorded_at: string;
}

interface BouncieDevice {
  id: string;
  device_id: string;
  vehicle_name: string;
  is_shuttle: boolean;
  bouncie_locations?: BouncieLocation[];
  eta?: { distanceMiles: number; etaMinutes: number } | null;
}

interface BouncieTrip {
  id: string;
  trip_id: string;
  start_at: string;
  end_at: string | null;
  distance_miles: number;
  duration_seconds: number;
  start_lat?: number;
  start_lng?: number;
  end_lat?: number;
  end_lng?: number;
}

function formatTimeAgo(iso?: string) {
  if (!iso) return 'Unknown';
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function formatDuration(seconds: number) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function formatTime(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function LiveDuration({ startAt }: { startAt: string }) {
  const [secs, setSecs] = useState(Math.floor((Date.now() - new Date(startAt).getTime()) / 1000));
  useEffect(() => {
    const id = setInterval(() => setSecs(Math.floor((Date.now() - new Date(startAt).getTime()) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startAt]);
  return <span>{formatDuration(secs)}</span>;
}

export default function BouncieLiveShuttle({ hotelId }: { hotelId: string }) {
  const [devices, setDevices] = useState<BouncieDevice[]>([]);
  const [trips, setTrips] = useState<BouncieTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncError, setSyncError] = useState('');
  const [connected, setConnected] = useState<boolean | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [vehRes, tripsRes] = await Promise.all([
        fetch(`/api/bouncie/vehicles?hotelId=${encodeURIComponent(hotelId)}`).then(r => r.json()),
        fetch(`/api/bouncie/trips?hotelId=${encodeURIComponent(hotelId)}`).then(r => r.json()),
      ]);
      setDevices(vehRes.devices || []);
      setTrips(tripsRes.trips || []);
      setConnected(vehRes.connected === true);
      setSyncError(vehRes.syncError || '');
      setError('');
    } catch {
      setError('Failed to load shuttle location. Check your network connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hotelId]);

  useEffect(() => {
    if (!hotelId) return;
    load(false);
    const id = setInterval(() => load(false), 30000);
    return () => clearInterval(id);
  }, [hotelId, load]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-2 text-gray-500 text-[12px]">
          <Activity size={14} className="animate-pulse" />
          Loading shuttle GPS...
        </div>
      </div>
    );
  }

  if (connected === false) {
    return (
      <div className="bg-gradient-to-br from-teal-50 to-white rounded-2xl border border-teal-100 p-5 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
            <Bus size={20} className="text-teal-600" />
          </div>
          <div>
            <p className="font-extrabold text-[15px] text-gray-900">Live Shuttle GPS</p>
            <p className="text-[11px] text-gray-500">Powered by Bouncie</p>
          </div>
        </div>
        <p className="text-[13px] text-gray-600 mb-1">Connect your Bouncie GPS tracker to see:</p>
        <ul className="text-[12px] text-gray-500 mb-4 space-y-0.5 ml-2">
          <li>📍 Real-time shuttle location</li>
          <li>⏱ Live trip timer & distance</li>
          <li>🏨 ETA back to hotel</li>
          <li>📋 Today&apos;s trip log</li>
        </ul>
        <a
          href={`/api/bouncie-auth?hotelId=${encodeURIComponent(hotelId)}`}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-teal-600 text-white text-[13px] font-bold hover:bg-teal-700 transition-colors"
        >
          Connect Bouncie GPS <ExternalLink size={13} />
        </a>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-2xl border border-red-100 p-4 mb-4 space-y-2">
        <p className="text-[12px] text-red-600 font-semibold">{error}</p>
        <button onClick={() => load(true)} className="text-[12px] text-red-500 underline">Retry</button>
      </div>
    );
  }

  // Connected but no devices discovered yet — show waiting state with sync error if any
  if (devices.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bus size={16} className="text-teal-600" />
            <span className="font-bold text-[14px] text-gray-900">Live Shuttle</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">✓ Bouncie Connected</span>
          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="text-[11px] font-bold text-teal-600 bg-teal-50 px-3 py-1 rounded-full disabled:opacity-50"
          >
            {refreshing ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>
        {syncError ? (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
            <p className="text-[11px] font-bold text-amber-700 mb-0.5">GPS sync error</p>
            <p className="text-[11px] text-amber-600 font-mono break-all">{syncError}</p>
            <p className="text-[11px] text-amber-500 mt-1">Check that your Bouncie account is active and the device has signal.</p>
          </div>
        ) : (
          <p className="text-[12px] text-gray-500">Waiting for GPS tracker to come online. Start a trip and it will appear here automatically.</p>
        )}
      </div>
    );
  }

  const shuttle = devices.find(d => d.is_shuttle) || devices[0];
  const loc = shuttle?.bouncie_locations?.[0];
  const eta = shuttle?.eta ?? null;
  const activeTrips = trips.filter(t => !t.end_at);
  const completedTrips = trips.filter(t => t.end_at);
  const currentTrip = activeTrips[0] ?? null;
  const totalDistanceToday = trips.reduce((s, t) => s + (t.distance_miles || 0), 0);

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
            <p className="text-[11px] text-gray-500">{shuttle?.vehicle_name || shuttle?.device_id || 'Shuttle'} · Bouncie GPS</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(true)} disabled={refreshing} className="text-[10px] text-teal-600 font-bold disabled:opacity-40">
            {refreshing ? '…' : '↻'}
          </button>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${currentTrip ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
            <span className="text-[10px] font-bold text-gray-600">{currentTrip ? 'On Trip' : 'Idle'}</span>
          </div>
        </div>
      </div>

      {syncError && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          <p className="text-[11px] text-amber-700 font-semibold">GPS sync issue: <span className="font-normal font-mono">{syncError}</span></p>
        </div>
      )}

      {/* Live location */}
      {loc ? (
        <div className="bg-gray-50 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-1.5 text-gray-500"><MapPin size={12} /> GPS</div>
            <span className="font-mono text-gray-800 text-[11px]">{loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}</span>
          </div>
          <div className="flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-1.5 text-gray-500"><Navigation size={12} /> Speed</div>
            <span className="font-semibold text-gray-900">{loc.speed_mph.toFixed(0)} mph · {loc.heading.toFixed(0)}°</span>
          </div>
          <div className="flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-1.5 text-gray-500"><Clock size={12} /> Updated</div>
            <span className="text-gray-700">{formatTimeAgo(loc.recorded_at)}</span>
          </div>
          {eta && (
            <div className={`flex items-center justify-between text-[12px] pt-1 border-t border-gray-200 ${eta.distanceMiles <= 0.5 ? 'text-emerald-700' : ''}`}>
              <div className="flex items-center gap-1.5 font-semibold">
                <Timer size={12} />
                {eta.distanceMiles <= 0.5 ? 'Arriving at hotel' : 'ETA to hotel'}
              </div>
              <span className="font-bold">
                {eta.distanceMiles <= 0.5 ? 'NOW 🟢' : `~${eta.etaMinutes} min · ${eta.distanceMiles.toFixed(1)} mi`}
              </span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-[12px] text-gray-400 italic">No GPS signal yet.</p>
      )}

      {/* Active trip A→B */}
      {currentTrip && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Route size={12} className="text-emerald-600" />
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Active Trip</span>
          </div>
          <div className="space-y-1.5 text-[12px]">
            <div className="flex justify-between">
              <span className="text-emerald-600">Departed</span>
              <span className="font-semibold text-gray-900">{formatTime(currentTrip.start_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-600">Duration</span>
              <span className="font-bold text-gray-900"><LiveDuration startAt={currentTrip.start_at} /></span>
            </div>
            {currentTrip.distance_miles > 0 && (
              <div className="flex justify-between">
                <span className="text-emerald-600">Distance</span>
                <span className="font-semibold text-gray-900">{currentTrip.distance_miles.toFixed(1)} mi</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Today's trip log */}
      {completedTrips.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Today&apos;s Trips</p>
          <div className="space-y-1.5">
            {completedTrips.slice(-4).reverse().map(trip => (
              <div key={trip.id} className="flex items-center justify-between text-[12px] bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <CheckCircle size={11} className="text-teal-500" />
                  <span>{formatTime(trip.start_at)} → {formatTime(trip.end_at)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700 font-semibold">
                  <span>{trip.distance_miles > 0 ? `${trip.distance_miles.toFixed(1)} mi` : ''}</span>
                  <span className="text-gray-400">·</span>
                  <span>{trip.duration_seconds > 0 ? formatDuration(trip.duration_seconds) : '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer stats */}
      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
        <span>Trips today: <strong className="text-gray-900">{trips.length}</strong></span>
        <span>Total distance: <strong className="text-gray-900">{totalDistanceToday.toFixed(1)} mi</strong></span>
      </div>

      {loc && (
        <div className="rounded-xl overflow-hidden border border-gray-200">
          <iframe
            title="Live shuttle location"
            className="w-full h-44 block"
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${loc.lng - 0.008}%2C${loc.lat - 0.005}%2C${loc.lng + 0.008}%2C${loc.lat + 0.005}&layer=mapnik&marker=${loc.lat}%2C${loc.lng}`}
          />
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 text-[11px]">
            <span className="text-gray-500 flex items-center gap-1"><MapPin size={11} className="text-teal-600" /> Live · updated {formatTimeAgo(loc.recorded_at)}</span>
            <a
              href={`https://www.openstreetmap.org/?mlat=${loc.lat}&mlon=${loc.lng}#map=16/${loc.lat}/${loc.lng}`}
              target="_blank"
              rel="noreferrer"
              className="font-bold text-teal-700 flex items-center gap-1"
            >
              Open full map <ExternalLink size={10} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
