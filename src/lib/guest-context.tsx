'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  getHotelConfig as getSupabaseHotelConfig,
  updateHotelConfig as updateHotelConfigSupabase,
  insertRequest as insertRequestSupabase,
  getAllRequests as getAllRequestsSupabase,
} from './supabase';

export type ValidationStatus = 'pending' | 'confirmed';

interface GuestSession {
  name: string;
  room: string;
  checkout: string;
  checkedIn: string;
  validationStatus?: ValidationStatus;
  validatedAt?: string;
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
}

const DEFAULT_CONFIG: HotelConfig = {
  name: 'Best Western - Attenda Hotel',
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
  login: (name: string, room: string, checkout: string) => void;
  logout: () => void;
  addRequest: (type: string, details: string) => Promise<void>;
  updateRequestStatus: (id: string, status: RequestStatus) => Promise<void>;
  clearCompletedRequests: () => void;
  requests: RequestItem[];
  config: HotelConfig;
  updateConfig: (c: Partial<HotelConfig>) => Promise<void>;
  loadConfig: () => Promise<void>;
  confirmValidation: () => void;
  resetValidationOnCheckout: () => void;
}

const GuestContext = createContext<GuestContextType | null>(null);

export function GuestProvider({ children }: { children: ReactNode }) {
  const [guest, setGuest] = useState<GuestSession | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [config, setConfig] = useState<HotelConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    const raw = localStorage.getItem('guestSession');
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as GuestSession;
        const checkout = new Date(parsed.checkout);
        const now = new Date();
        if (checkout >= now) {
          // Check if we need to reset validation (new day after checkout)
          const checkoutDate = new Date(parsed.checkout);
          checkoutDate.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // If checkout date has passed (past midnight), reset validation
          if (checkoutDate < today) {
            localStorage.removeItem('guestSession');
          } else {
            // Ensure validationStatus exists (backward compatibility)
            if (!parsed.validationStatus) {
              parsed.validationStatus = 'pending';
            }
            setGuest(parsed);
          }
        } else {
          localStorage.removeItem('guestSession');
        }
      } catch { /* ignore */ }
    }
    loadConfig(); // eslint-disable-line react-hooks/exhaustive-deps
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

  const login = (name: string, room: string, checkout: string) => {
    const session: GuestSession = {
      name,
      room,
      checkout,
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
      validationStatus: 'confirmed' as const,
      validatedAt: new Date().toISOString()
    };
    setGuest(updated);
    localStorage.setItem('guestSession', JSON.stringify(updated));
  };

  const resetValidationOnCheckout = () => {
    if (!guest) return;
    const checkout = new Date(guest.checkout);
    const now = new Date();
    if (checkout < now) {
      logout();
    }
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

  const isAuthenticated = !!guest;
  const isValidated = guest?.validationStatus === 'confirmed';

  return (
    <GuestContext.Provider value={{
      guest, isAuthenticated, isValidated, login, logout,
      addRequest, updateRequestStatus, clearCompletedRequests, requests,
      config, updateConfig, loadConfig,
      confirmValidation, resetValidationOnCheckout,
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

// Staff-only helpers
export async function getAllRequests(): Promise<RequestItem[]> {
  const data = await getAllRequestsSupabase();
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
