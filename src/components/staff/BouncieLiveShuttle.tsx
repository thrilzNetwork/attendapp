'use client';

import { useEffect, useState } from 'react';
import { Bus, MapPin, Navigation, Clock, Activity, ExternalLink } from 'lucide-react';

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
}

interface BouncieTrip {
  id: string;
  trip_id: string;
  start_at: string;
  end_at: string | null;
  distance_miles: number;
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

export default function BouncieLiveShuttle({ hotelId }: { hotelId: string }) {
  const [devices, setDevices] = useState<BouncieDevice[]>([]);
  const [trips, setTrips] = useState<BouncieTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState<boolean | null>(null);

  const load = async () => {
    try {
      const [vehRes, tripsRes] = await Promise.all([
        fetch(`/api/bouncie/vehicles?hotelId=${encodeURIComponent(hotelId)}`).then(r => r.json()),
        fetch(`/api/bouncie/trips?hotelId=${encodeURIComponent(hotelId)}`).then(r => r.json()),
      ]);
      setDevices(vehRes.devices || []);
      setTrips(tripsRes.trips || []);
      setConnected(vehRes.devices && vehRes.devices.length > 0);
      setError('');
    } catch {
      setError('Failed to load shuttle location');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hotelId) return;
    load();
    const id = setInterval(() => load(), 30000); // refresh every 30s
    return () => clearInterval(id);
  }, [hotelId]);

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-700">
            <Bus size={18} className="text-teal-600" />
            <span className="font-bold text-[14px]">Live Shuttle</span>
          </div>
        </div>
        <p className="text-[12px] text-gray-500 mt-2">Not connected to Bouncie.</p>
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
  const activeTrips = trips.filter(t => !t.end_at).length;
  const completedTrips = trips.filter(t => t.end_at).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center">
            <Bus size={16} className="text-teal-600" />
          </div>
          <div>
            <h3 className="font-extrabold text-[14px] text-gray-900">Live Shuttle</h3>
            <p className="text-[11px] text-gray-500">{shuttle?.vehicle_name || shuttle?.device_id || 'Shuttle'}</p>
          </div>
        </div>
        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
          {activeTrips > 0 ? 'On trip' : 'Idle'}
        </span>
      </div>

      {loc ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-1.5 text-gray-600">
              <MapPin size={13} />
              Location
            </div>
            <div className="font-mono text-gray-900">
              {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
            </div>
          </div>
          <div className="flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-1.5 text-gray-600">
              <Navigation size={13} />
              Speed / Heading
            </div>
            <div className="font-medium text-gray-900">
              {loc.speed_mph.toFixed(0)} mph / {loc.heading.toFixed(0)}°
            </div>
          </div>
          <div className="flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-1.5 text-gray-600">
              <Clock size={13} />
              Updated
            </div>
            <div className="text-gray-900">{formatTimeAgo(loc.recorded_at)}</div>
          </div>
        </div>
      ) : (
        <p className="text-[12px] text-gray-500">No recent location data.</p>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
        <span>Today&apos;s trips: <strong className="text-gray-900">{completedTrips + activeTrips}</strong></span>
        <span>Distance: <strong className="text-gray-900">{trips.reduce((s, t) => s + (t.distance_miles || 0), 0).toFixed(1)} mi</strong></span>
      </div>

      {loc && (
        <a
          href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex items-center justify-center gap-1 w-full py-2 rounded-xl bg-gray-50 text-[12px] font-bold text-teal-600 hover:bg-teal-50"
        >
          Open in Maps <ExternalLink size={12} />
        </a>
      )}
    </div>
  );
}
