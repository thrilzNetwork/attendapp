'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  getHotelConfig as getSupabaseHotelConfig,
  updateHotelConfig as updateHotelConfigSupabase,
  insertRequest as insertRequestSupabase,
  getAllRequests as getAllRequestsSupabase,
} from './supabase';

export type ValidationStatus = 'pending' | 'confirmed';

/* Guest session — ROLLING 24H OF ACTIVITY, no checkout date.
   The property prints ONE main QR (/?hotel=<slug>). Guest scans, enters
   first name + room, staff validates. Any guest activity (request, message,
   booking) refreshes lastActive; 24h of silence expires the session. */
export const ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface GuestSession {
  name: string;
  room: string;
  lastActive: string; // ISO timestamp — refreshed on every guest activity
  checkedIn: string;
  validationStatus?: ValidationStatus;
  validatedAt?: string;
  checkout?: string; // legacy sessions only — kept for their grace window
}

/** Single source of truth for "is this session alive": <24h since lastActive,
    with a legacy fallback to the old checkout date so pre-rebuild sessions
    (and any printed per-room QR era sessions) don't all die at once. */
export function isSessionActive(s: { lastActive?: string; checkout?: string } | null | undefined): boolean {
  if (!s) return false;
  if (s.lastActive) {
    const last = new Date(s.lastActive).getTime();
    if (!Number.isNaN(last)) return Date.now() - last < ACTIVE_WINDOW_MS;
  }
  if (s.checkout) return new Date(s.checkout) > new Date();
  return false;
}

/** Touch the STORED session (activity happened). Direct localStorage write —
    expiry is re-checked from storage at every gate, so no React re-render churn. */
export function touchStoredSession() {
  try {
    const stored = localStorage.getItem('guestSession');
    if (!stored) return;
    const s = JSON.parse(stored);
    if (!isSessionActive(s)) return;
    s.lastActive = new Date().toISOString();
    localStorage.setItem('guestSession', JSON.stringify(s));
  } catch { /* ignore */ }
}

export type RequestStatus = 'pending' | 'in-progress' | 'completed';

export interface RequestItem {
  id: string;
  guestName: string;
  room: string;
  type: string;
  details: string;
  status: RequestStatus;
  createdAt: string;
}

export interface HotelConfig {
  name: string;
  wifiName: string;
  wifiPassword: string;
  frontDeskPhone: string;
  managerName: string;
  welcomeLetter: string;
  teamPhotoUrl: string;
  brandColor?: string;
}

const DEFAULT_CONFIG: HotelConfig = {
  name: 'Attenda Hotel',
  wifiName: 'Attenda-Guest',
  wifiPassword: 'welcome2026',
  frontDeskPhone: '(305) 555-0100',
  managerName: 'Hotel Manager',
  welcomeLetter: 'Thank you for choosing our hotel. We hope you have a wonderful stay.',
  teamPhotoUrl: '',
};

interface GuestContextType {
  guest: GuestSession | null;
  isAuthenticated: boolean;
  isValidated: boolean;
  login: (name: string, room: string) => void;
  touch: () => void;
  logout: () => void;
  addRequest: (type: string, details: string) => Promise<void>;
  updateRequestStatus: (id: string, status: RequestStatus) => Promise<void>;
  clearCompletedRequests: () => void;
  requests: RequestItem[];
  config: HotelConfig;
  updateConfig: (c: Partial<HotelConfig>) => Promise<void>;
  loadConfig: () => Promise<void>;
  confirmValidation: () => void;
}

const GuestContext = createContext<GuestContextType | null>(null);

export function GuestProvider({ children }: { children: ReactNode }) {
  const [guest, setGuest] = useState<GuestSession | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [config, setConfig] = useState<HotelConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    const stored = localStorage.getItem('guestSession');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Rolling 24h window (legacy sessions: old checkout date still honored)
        if (isSessionActive(parsed)) {
          // Ensure validationStatus exists (backward compatibility)
          if (!parsed.validationStatus) {
            parsed.validationStatus = 'pending';
          }
          setGuest(parsed);
        } else {
          localStorage.removeItem('guestSession');
        }
      } catch { /* ignore */ }
    }
    loadConfig(); // eslint-disable-line react-hooks/exhaustive-deps

    // Listen for storage changes (triggered by staff confirming via another tab)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'guestSession') {
        if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            if (isSessionActive(parsed)) {
              setGuest(parsed);
            }
          } catch { /* ignore */ }
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadConfig = async () => {
    const remote = await getSupabaseHotelConfig();
    if (remote) {
      setConfig(remote);
    } else {
      const cfgRaw = localStorage.getItem('hotelConfig');
      if (cfgRaw) {
        try { setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(cfgRaw) }); } catch { /* ignore */ }
      }
    }
  };

  const touch = () => {
    setGuest(prev => {
      if (!prev || !isSessionActive(prev)) return prev;
      const next = { ...prev, lastActive: new Date().toISOString() };
      localStorage.setItem('guestSession', JSON.stringify(next));
      return next;
    });
  };

  const login = (name: string, room: string) => {
    const session: GuestSession = {
      name,
      room,
      lastActive: new Date().toISOString(),
      checkedIn: new Date().toISOString(),
      validationStatus: 'pending',
      validatedAt: undefined
    };
    setGuest(session);
    localStorage.setItem('guestSession', JSON.stringify(session));
  };

  const confirmValidation = () => {
    if (!guest) return;
    const updated = {
      ...guest,
      lastActive: new Date().toISOString(),
      validationStatus: 'confirmed' as const,
      validatedAt: new Date().toISOString()
    };
    setGuest(updated);
    localStorage.setItem('guestSession', JSON.stringify(updated));
  };

  const logout = () => {
    setGuest(null);
    localStorage.removeItem('guestSession');
    localStorage.removeItem('guestRequests');
    localStorage.removeItem('attenda_qr_room');
  };

  const addRequest = async (type: string, details: string) => {
    if (!guest) return;
    await insertRequestSupabase({
      type,
      guestName: guest.name,
      room: guest.room,
      details,
    });
    touch(); // activity refreshes the rolling 24h window
    const req: RequestItem = {
      id: Math.random().toString(36).slice(2),
      guestName: guest.name,
      room: guest.room,
      type,
      details,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const updated = [req, ...requests];
    setRequests(updated);
    localStorage.setItem('guestRequests', JSON.stringify(updated));
  };

  const updateRequestStatus = async (id: string, status: RequestStatus) => {
    const updated = requests.map(r => r.id === id ? { ...r, status } : r);
    setRequests(updated);
    localStorage.setItem('guestRequests', JSON.stringify(updated));
  };

  const clearCompletedRequests = () => {
    const updated = requests.filter(r => r.status !== 'completed');
    setRequests(updated);
    localStorage.setItem('guestRequests', JSON.stringify(updated));
  };

  const updateConfig = async (partial: Partial<HotelConfig>) => {
    const next = { ...config, ...partial };
    setConfig(next);
    localStorage.setItem('hotelConfig', JSON.stringify(next));
    await updateHotelConfigSupabase(partial);
  };

  const isAuthenticated = !!guest && isSessionActive(guest);
  const isValidated = guest?.validationStatus === 'confirmed';

  return (
    <GuestContext.Provider value={{
      guest, isAuthenticated, isValidated, login, touch, logout,
      addRequest, updateRequestStatus, clearCompletedRequests, requests,
      config, updateConfig, loadConfig,
      confirmValidation,
    }}>
      {children}
    </GuestContext.Provider>
  );
}

export function useGuest() {
  const ctx = useContext(GuestContext);
  if (!ctx) throw new Error('useGuest must be inside GuestProvider');
  return ctx;
}

// Back navigation helper — preserves hotel tenant context
export function goBackToHotel(router: ReturnType<typeof import('next/navigation').useRouter>) {
  const slug = localStorage.getItem('attenda_hotel_slug');
  if (slug) {
    router.push(`/?hotel=${encodeURIComponent(slug)}`);
  } else {
    router.push('/');
  }
}

// Staff-only helpers
export async function getAllRequests(): Promise<RequestItem[]> {
  const config = await getSupabaseHotelConfig();
  const hotelId = config?.id || '';
  const data = await getAllRequestsSupabase(hotelId);
  return data.map(r => ({
    id: r.id,
    guestName: r.guestName,
    room: r.room,
    type: r.type,
    details: r.details,
    status: (r.status === 'pending' || r.status === 'in-progress' || r.status === 'completed') ? r.status as RequestStatus : 'pending',
    createdAt: r.createdAt,
  }));
}

export async function getHotelConfig(): Promise<HotelConfig> {
  const remote = await getSupabaseHotelConfig();
  return remote || DEFAULT_CONFIG;
}
