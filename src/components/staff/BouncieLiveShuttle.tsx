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
  const [connected, setConnected] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    try {
      const [vehRes, tripsRes] = await Promise.all([
        fetch(`/api/bouncie/vehicles?hotelId=${encodeURIComponent(hotelId)}`).then(r => r.json()),
        fetch(`/api/bouncie/trips?hotelId=${encodeURIComponent(hotelId)}`).then(r => r.json()),
      ]);
      setDevices(vehRes.devices || []);
      setTrips(tripsRes.trips || []);
      setConnected((vehRes.devices ?? []).length > 0);
      setError('');
    } catch {
      setError('Failed to load shuttle location');
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    if (!hotelId) return;
    load();
    const id = setInterval(load, 30000);
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
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-2 text-gray-700 mb-2">
          <Bus size={18} className="text-teal-600" />
          <span className="font-bold text-[14px]">Live Shuttle</span>
        </div>
        <p className="text-[12px] text-gray-500">Not connected to Bouncie.</p>
        <a
          href={`/api/bouncie-auth?hotelId=${encodeURIComponent(hotelId)}`}
          className="inline-flex items-center gap-1 mt-2 text-[12px] font-bold text-teal-600 hover:text-teal-800"
        >
          Connect Bouncie <ExternalLink size={12} />
        </a>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-2xl border border-red-100 p-4 mb-4">
        <p className="text-[12px] text-red-600">{error}</p>
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
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${currentTrip ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
          <span className="text-[10px] font-bold text-gray-600">{currentTrip ? 'On Trip' : 'Idle'}</span>
        </div>
      </div>

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
        <a
          href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-teal-50 text-[12px] font-bold text-teal-700 hover:bg-teal-100 transition-colors"
        >
          <MapPin size={13} /> Track on Google Maps <ExternalLink size={11} />
        </a>
      )}
    </div>
  );
}
