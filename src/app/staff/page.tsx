/* eslint-disable */
// deploy-2026-06-05-001 - force chunk hash change
'use client';

import React, { useState, useEffect, useCallback, useRef, Fragment, Component, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

class ErrorBoundary extends Component<{children: React.ReactNode, fallback?: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode, fallback?: React.ReactNode}) {
    super(props);
    this.state = {hasError: false, error: null};
  }
  static getDerivedStateFromError(error: Error) {
    return {hasError: true, error};
  }
  componentDidCatch(error: Error, info: any) {
    console.error('ERROR BOUNDARY CAUGHT:', error.message, error.stack);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div className="p-8 text-red-600"><p className="font-bold text-[14px]">Something went wrong</p><pre className="text-[11px] mt-2 bg-red-50 p-3 rounded-xl overflow-auto">{this.state.error?.message}</pre></div>;
    }
    return this.props.children;
  }
}
import Image from 'next/image';
import AgentDashboard from '@/components/agent/AgentDashboard';
import {
  Bell, MessageSquare, Bus, Settings, Users,
  LogOut, RefreshCw, Plus, Trash2, Eye, EyeOff, Save,
  Hotel as HotelIcon, ExternalLink, type LucideIcon,
  Store, QrCode as QrCodeIcon, Building2, Copy, Check, ChevronDown, ChevronUp,
  UtensilsCrossed, UserPlus, BookOpen, Pencil, X as XIcon, DoorOpen, Upload,
  FileSpreadsheet, FileText, Lock, Mail, ClipboardList, CalendarDays, SendHorizontal,
  BarChart3, BarChart2, GraduationCap, Briefcase, ClipboardCheck, Clock, Wifi, ImageIcon, TrendingUp, Inbox, Search, Ship, DollarSign, ShieldCheck, MapPin, PhoneCall, Trophy, Heart, Truck, Bot, Webhook, Wrench,
} from 'lucide-react';
import {
  supabase, subscribeToRequests, subscribeToMessages, updateRequestStatus, deleteRequest,
  getHotelConfig, updateHotelConfig, HotelConfig,
  getStaffAccounts, getStaffAccountsForHotel, createStaffAccountWithDetails, getStaffAccountByEmail,
  deleteStaffAccount, updateStaffDetails, updateStaffPermissions, setStaffPassword, resetAllStaffPasswords, StaffAccount,
  getPartners, createPartner, updatePartner, deletePartner, Partner,
  getPartnerMenuItems, createPartnerMenuItem, deletePartnerMenuItem, PartnerMenuItem,
  getQrCodes, createQrCode, deleteQrCode, QrCode as QrCodeRow,
  getAllHotels, createHotel,
  getShuttleRoutes, createShuttleRoute, deleteShuttleRoute,
  getAllShuttleSlotsForHotel, createShuttleSlot, deleteShuttleSlot,
  getAllShuttleBookingsForHotel, cancelShuttleBooking, bookShuttleSlot,
  getShuttleRequests, updateShuttleRequest, ShuttleRoute, ShuttleSlot, ShuttleBooking, ShuttleRequest,
  getCruiseSchedulesAll, createCruiseSchedule, deleteCruiseSchedule, CruiseSchedule,
  getAllKnowledgeBase, createKnowledgeEntry, updateKnowledgeEntry, deleteKnowledgeEntry, KnowledgeEntry,
  getAllHotelRooms, bulkInsertRooms, deleteRoom, createRoom, updateRoomType, updateRoomTypeBatch, HotelRoom,
  upsertGuestValidation, getGuestValidations,
  getChecklists, createChecklist, deleteChecklist, Checklist,
  getChecklistInstances, createChecklistInstance, updateChecklistInstance, ChecklistInstance,
  getStaffSchedules, getStaffSchedulesRange, createStaffSchedule, deleteStaffSchedule, StaffSchedule,
  getDailyRecap,
  getHotelOpsTools, getAllOpsTools,
  getWeeklyForecasts, upsertWeeklyForecast, WeeklyForecast,
  getLearningDocs, getHrDocs, authedApiHeaders,
} from '@/lib/supabase';
import type { OpsTool } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import CallAroundView from '@/components/ops-tools/CallAroundView';
const PartnersView = dynamic(() => import('@/components/staff/PartnersView'), { ssr: false });
import DailyLogsView from '@/components/ops-tools/DailyLogsView';
import NoShowsView from '@/components/ops-tools/NoShowsView';
import RoomMovesView from '@/components/ops-tools/RoomMovesView';
import BankCountView from '@/components/ops-tools/BankCountView';

const RoomsView = dynamic(() => import('@/components/staff/RoomsView'), { ssr: false });
const SchedulesView = dynamic(() => import('@/components/staff/SchedulesView'), { ssr: false });
const ForecastView = dynamic(() => import('@/components/staff/ForecastView'), { ssr: false });
const FrontDeskView = dynamic(() => import('@/components/staff/FrontDeskView'), { ssr: false });
const PositionTodosView = dynamic(() => import('@/components/staff/PositionTodosView'), { ssr: false });
const ShuttleViewComponent = dynamic(() => import('@/components/staff/ShuttleView'), { ssr: false });
const LearningHRView = dynamic(() => import('@/components/staff/LearningHRView'), { ssr: false });
const KpisView = dynamic(() => import('@/components/staff/KpisView'), { ssr: false });
const DailyBriefView = dynamic(() => import('@/components/staff/DailyBriefView'), { ssr: false });
const V2Dashboard = dynamic(() => import('@/components/v2/V2Dashboard'), { ssr: false });
const V2MyDay = dynamic(() => import('@/components/v2/V2MyDay'), { ssr: false });
const CompsetView = dynamic(() => import('@/components/staff/CompsetView'), { ssr: false });
const LeaderboardView = dynamic(() => import('@/components/staff/LeaderboardView'), { ssr: false });
const CultureView = dynamic(() => import('@/components/staff/CultureView'), { ssr: false });
const SuperAdminView = dynamic(() => import('@/components/staff/SuperAdminView'), { ssr: false });
const MarketplaceView = dynamic(() => import('@/components/staff/MarketplaceView'), { ssr: false });
const CalloutsView = dynamic(() => import('@/components/staff/CalloutsView'), { ssr: false });
const QrCodesView = dynamic(() => import('@/components/staff/QrCodesView'), { ssr: false });
const V2Vendors = dynamic(() => import('@/components/v2/V2Vendors'), { ssr: false });
const V2PropertySettings = dynamic(() => import('@/components/v2/V2PropertySettings'), { ssr: false });
const V2StaffManagement = dynamic(() => import('@/components/v2/V2StaffManagement'), { ssr: false });
const V2Revenue = dynamic(() => import('@/components/v2/V2Revenue'), { ssr: false });
const V2ScheduleForecast = dynamic(() => import('@/components/v2/V2ScheduleForecast'), { ssr: false });
const V2RightAnswers = dynamic(() => import('@/components/v2/V2RightAnswers'), { ssr: false });
const V2FnB = dynamic(() => import('@/components/v2/V2FnB'), { ssr: false });
const V2Reports = dynamic(() => import('@/components/v2/V2Reports'), { ssr: false });
const V2ComingSoon = dynamic(() => import('@/components/v2/V2ComingSoon'), { ssr: false });
import {
  listOps, createOps, updateOps, deleteOps,
  listKpiDefinitions, createKpiDefinition, deleteKpiDefinition,
  listKpiSubmissions, createKpiSubmission,
  listChecklistTemplates, createChecklistTemplate, deleteChecklistTemplate,
  listChecklistCompletions, createChecklistCompletion, updateChecklistCompletion,
  listForecasts, createForecast as createForecastRecord,
  listShifts, createGeneratedShift, updateShift, deleteShift,
  listLearningContent, createLearningContent, deleteLearningContent,
  listHrDocuments, createHrDocument, deleteHrDocument,
  listScheduleChangeRequests, createScheduleChangeRequest,
  listShuttleSlots, listKbSuggestions, createKbSuggestion, deleteKbSuggestion, listKbSuggestionsByStatus, createKbSuggestionPending, approveKbSuggestion, rejectKbSuggestion,
  suggestResponse,
  generateShiftsFromForecast, today,
  listCourses, createCourse, deleteCourse,
  listModules, createModule, deleteModule,
  listQuizQuestions, createQuizQuestion, deleteQuizQuestion,
  listModuleCompletions, recordModuleCompletion,
  listQuizAttempts, recordQuizAttempt,
  type Course, type CourseModule, type QuizQuestion, type ModuleCompletion, type QuizAttempt,
  type KpiDefinition, type KpiSubmission,
  type ChecklistTemplate, type ChecklistCompletion,
  type Forecast, type GeneratedShift, type CoverageRule,
  type LearningContent, type HrDocument,
  type ScheduleChangeRequest,
  type OpRecord,
  type ShuttleSlot as OpsShuttleSlot,
} from '@/lib/opsStore';

import '@/components/v2/tokens.css';

/* ── Types ─────────────────────────────────────────────── */
type Role = 'admin' | 'staff' | 'superadmin' | 'vendor' | 'manager' | 'supervisor';
type NavTab =
  | 'orders' | 'messages' | 'shuttle'
  | 'hotel' | 'staff_mgmt'
  | 'partners' | 'qrcodes' | 'properties'
  | 'vendor_manifest' | 'knowledge' | 'guests' | 'rooms'
  | 'dailybrief' | 'property_info'
  | 'schedules' | 'compset' | 'checklists_tab' | 'kpis' | 'learning_hr'
  | 'shuttle_schedule' | 'forecast' | 'schedule_forecast' | 'callouts' | 'todos' | 'marketplace' | 'leaderboard' | 'culture'
  | 'revenue' | 'reports' | 'vendors' | 'agent' | 'myday'
  | 'inspections' | 'maintenance' | 'housekeeping' | 'fnb';

interface Request {
  id: string;
  guest_name: string;
  room: string;
  type: string;
  details: string;
  status: 'pending' | 'in-progress' | 'completed' | 'closed';
  created_at: string;
  assigned_to?: string;
  guest_verified?: boolean;
}

interface Message {
  id: string;
  guest_name: string;
  room: string;
  sender: string;
  body: string;
  created_at: string;
}

interface Session {
  name: string;
  role: Role;
  vendorType?: string;
  department?: string;
  positions?: string[];
  permissions?: string[];
}

/* ── Constants ─────────────────────────────────────────── */
const TEAL = '#158A7C';
const BUILD_TS = Date.now();

const DEPARTMENTS = [
  { key: 'management',   label: 'Management',   icon: '👔' },
  { key: 'front_desk',   label: 'Front Desk',   icon: '🛎️' },
  { key: 'housekeeping', label: 'Housekeeping', icon: '🧹' },
  { key: 'maintenance',  label: 'Maintenance',  icon: '🔧' },
  { key: 'security',     label: 'Security',     icon: '🛡️' },
  { key: 'drivers',      label: 'Drivers',      icon: '🚐' },
] as const;
type DepartmentKey = typeof DEPARTMENTS[number]['key'];

// Tabs that require a specific permission for staff/supervisor (admin always bypasses)
const TAB_PERMS: Partial<Record<NavTab, string>> = {
  orders:      'orders',
  messages:    'messages',
  shuttle:     'shuttle',
  knowledge:   'knowledge',
  compset:     'compset',
  marketplace: 'marketplace',
};

const NAV: { tab: NavTab; label: string; icon: LucideIcon; roles: Role[]; section?: string }[] = [
  // ── TODAY ──
  { tab: 'dailybrief',      label: 'Dashboard',          icon: BarChart3,       roles: ['admin', 'staff', 'supervisor', 'superadmin', 'manager'], section: 'Today' },
  { tab: 'myday',           label: 'My Day',             icon: ClipboardList,   roles: ['admin', 'staff', 'supervisor', 'superadmin', 'manager'], section: 'Today' },

  // ── OPERATE ──
  { tab: 'knowledge',       label: 'Right Answers',       icon: BookOpen,        roles: ['admin', 'staff', 'supervisor', 'superadmin', 'manager'], section: 'Operate' },
  { tab: 'inspections',     label: 'Inspections',         icon: ClipboardCheck,  roles: ['admin', 'staff', 'supervisor', 'superadmin', 'manager'], section: 'Operate' },
  { tab: 'maintenance',     label: 'Maintenance',         icon: Wrench,          roles: ['admin', 'staff', 'supervisor', 'superadmin', 'manager'], section: 'Operate' },
  { tab: 'housekeeping',    label: 'Housekeeping',        icon: DoorOpen,        roles: ['admin', 'staff', 'supervisor', 'superadmin', 'manager'], section: 'Operate' },
  { tab: 'fnb',             label: 'F&B',                 icon: UtensilsCrossed, roles: ['admin', 'staff', 'supervisor', 'superadmin', 'manager'], section: 'Operate' },
  { tab: 'shuttle',         label: 'Transportation',      icon: Bus,             roles: ['admin', 'staff', 'supervisor', 'superadmin', 'manager'], section: 'Operate' },
  { tab: 'schedule_forecast', label: 'Schedule & Forecast', icon: CalendarDays,  roles: ['admin', 'staff', 'supervisor', 'superadmin', 'manager'], section: 'Operate' },
  { tab: 'compset',         label: 'Compset',             icon: PhoneCall,       roles: ['admin', 'staff', 'supervisor', 'superadmin', 'manager'], section: 'Operate' },

  // ── MANAGE ──
  { tab: 'revenue',         label: 'Revenue (Attenda)',   icon: DollarSign,      roles: ['admin', 'supervisor', 'superadmin', 'manager'], section: 'Manage' },
  { tab: 'hotel',           label: 'Property Settings',   icon: Settings,        roles: ['admin', 'superadmin'], section: 'Manage' },
  { tab: 'staff_mgmt',      label: 'Staff Management',    icon: Users,           roles: ['admin', 'superadmin'], section: 'Manage' },
  { tab: 'vendors',         label: 'Vendors',             icon: Truck,           roles: ['admin', 'superadmin', 'manager'], section: 'Manage' },
  { tab: 'reports',         label: 'Reports',             icon: BarChart2,       roles: ['admin', 'supervisor', 'superadmin', 'manager'], section: 'Manage' },

  // ── PLATFORM — superadmin only ──
  { tab: 'properties',      label: 'All Properties',      icon: Building2,       roles: ['superadmin'], section: 'Platform' },

  // ── VENDOR ──
  { tab: 'vendor_manifest', label: 'Vendor Dashboard',    icon: Users,           roles: ['vendor'], section: '' },
];

/* ── Main Component ───────────────────────────────────── */
function DashboardInner() {
  const searchParams = useSearchParams();
  const [session, setSession] = useState<Session | null>(null);
  const [tab, setTab] = useState<NavTab>('dailybrief');
  const [showWelcome, setShowWelcome] = useState(false);
  const [showForcePasswordChange, setShowForcePasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [passwordChanging, setPasswordChanging] = useState(false);
  // Auth state
  const [authMode, setAuthMode] = useState<'email' | 'authenticated'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [allHotels, setAllHotels] = useState<{ id: string; slug: string; name: string }[]>([]);
  const [showHotelPicker, setShowHotelPicker] = useState(false);
  const [requests, setRequests] = useState<Request[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [config, setConfig] = useState<HotelConfig | null>(null);
  const [staff, setStaff] = useState<StaffAccount[]>([]);
  // Impersonation
  const [impersonatingUser, setImpersonatingUser] = useState<{ name: string; role: Role } | null>(null);
  const [showImpersonatePicker, setShowImpersonatePicker] = useState(false);
  // Tracks which tabs have been visited — once mounted, kept alive with display:none
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set());
  // ── Alert bar state (must be before early returns — React hooks rule) ──
  const [dismissedAlert, setDismissedAlert] = useState(false);
  const [lastRequestCount, setLastRequestCount] = useState(0);

  // pendingCount must be computed before early returns for the alert bar effect
  const pendingCount = requests.filter(r => r.status === 'pending' && r.type !== 'Shuttle Booking').length;

  // Reset alert bar when new pending tickets appear
  useEffect(() => {
    if (pendingCount > lastRequestCount) {
      setDismissedAlert(false);
    }
    setLastRequestCount(pendingCount);
  }, [pendingCount]);

  // Track visited tabs — must be before early returns (Rules of Hooks)
  const effectiveTabForVisit = session
    ? ((session.role === 'vendor' && tab === 'orders') ? 'vendor_manifest' : tab)
    : tab;
  useEffect(() => {
    if (!session) return;
    setVisitedTabs(prev => { if (prev.has(effectiveTabForVisit)) return prev; const n = new Set(prev); n.add(effectiveTabForVisit); return n; });
  }, [effectiveTabForVisit, session]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hotel = params.get('hotel');
    if (hotel) localStorage.setItem('attenda_hotel_slug', hotel);
  }, []);

  /* ── One-tab enforcement (BroadcastChannel) ──────────── */
  const [multiTabBlocked, setMultiTabBlocked] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const bc = new BroadcastChannel('attenda_staff_tab');
    const KEY = 'attenda_staff_tab_id';
    const tabId = crypto.randomUUID();
    // Ping every 10s to claim we're still alive
    const ping = () => { localStorage.setItem(KEY, tabId); };
    const handleMsg = (e: MessageEvent) => {
      if (e.data.type === 'ping' && e.data.tabId !== tabId) {
        // Another tab is alive — was it *us* or someone else?
        const current = localStorage.getItem(KEY);
        if (current && current !== tabId) {
          // Another tab holds the lock and we're the new one — block
          setMultiTabBlocked(true);
        }
      }
      if (e.data.type === 'i-won') {
        // This tab won the race — unblock
        setMultiTabBlocked(false);
      }
    };
    bc.addEventListener('message', handleMsg);
    // Announce our arrival — the first tab to respond claims the lock
    bc.postMessage({ type: 'ping', tabId });
    // Give others a moment to respond
    const claimTimeout = setTimeout(() => {
      const current = localStorage.getItem(KEY);
      if (!current || current === tabId) {
        // No one else claimed — we win
        localStorage.setItem(KEY, tabId);
        bc.postMessage({ type: 'i-won', tabId });
      }
    }, 300);
    ping();
    const interval = setInterval(ping, 10000);
    // Release lock on unload
    const cleanup = () => {
      clearInterval(interval);
      clearTimeout(claimTimeout);
      bc.removeEventListener('message', handleMsg);
      bc.close();
      if (localStorage.getItem(KEY) === tabId) {
        localStorage.removeItem(KEY);
      }
    };
    window.addEventListener('beforeunload', cleanup);
    return () => {
      cleanup();
      window.removeEventListener('beforeunload', cleanup);
    };
  }, []);

  // Check if already logged in (e.g., redirected from setup page)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (existingSession?.user) {
        const email = existingSession.user.email || '';
        const meta = existingSession.user.user_metadata || {};
        if (meta.role === 'superadmin') {
          setSession({ name: email, role: 'superadmin' });
          setAuthMode('authenticated');
          getAllHotels().then(h => setAllHotels(h as { id: string; slug: string; name: string }[]));
          return;
        }
        getStaffAccountByEmail(email).then(staff => {
          if (staff) {
            const role: Role = staff.role === 'manager' || staff.role === 'admin' ? 'admin' : staff.role === 'supervisor' ? 'supervisor' : staff.role === 'vendor' ? 'vendor' : 'staff';
            setSession({ name: staff.name, role, vendorType: staff.vendor_type || undefined, permissions: staff.permissions ?? [], department: staff.department, positions: staff.positions || [] });
            setAuthMode('authenticated');
            // Save hotel slug to localStorage so config queries work
            if (staff.hotel_id) {
              supabase.from('hotels').select('slug').eq('id', staff.hotel_id).single().then(
                ({ data }) => { if (data?.slug) localStorage.setItem('attenda_hotel_slug', data.slug); }
              );
            }
          }
        });
      }
    });
  }, []);

  const handleEmailLogin = async () => {
    setAuthError('');
    if (!email || !password) { setAuthError('Email and password required.'); return; }
    setAuthLoading(true);
    try {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) throw signInErr;

      // Superadmin check — look at JWT metadata, not staff_accounts table
      if (data.user?.user_metadata?.role === 'superadmin') {
        setSession({ name: data.user.email || 'Super Admin', role: 'superadmin' });
        setAuthMode('authenticated');
        // Load all hotels for property picker
        getAllHotels().then(h => setAllHotels(h as { id: string; slug: string; name: string }[]));
        return;
      }

      // Look up staff account by email
      const staff = await getStaffAccountByEmail(email);
      if (!staff) {
        await supabase.auth.signOut();
        setAuthError('No staff account found for this email. Contact your admin.');
        setAuthLoading(false);
        return;
      }

      // Log in directly — no PIN 2FA needed
      const role: Role = staff.role === 'manager' || staff.role === 'admin' ? 'admin' : staff.role === 'vendor' ? 'vendor' : 'staff';

      // Auto-populate JWT metadata with hotel_id if missing
      // This ensures RLS policies (which check get_user_hotel_id() from JWT) work
      const meta = data.user?.user_metadata || {};
      if (!meta.hotel_id && staff.hotel_id) {
        await supabase.auth.updateUser({
          data: { hotel_id: staff.hotel_id, role: staff.role },
        });
        // Force session refresh so the JWT gets the new hotel_id
        await supabase.auth.refreshSession();
      }

      setSession({ name: staff.name, role, vendorType: staff.vendor_type || undefined, permissions: staff.permissions ?? [], department: staff.department, positions: staff.positions || [] });
      setAuthMode('authenticated');

      // Force password change if using default password
      if (password === 'Attenda2026!') {
        setShowForcePasswordChange(true);
      }

      // Show welcome modal for first-time logins (redirected from setup with ?welcome=1)
      if (searchParams.get('welcome') === '1' && !localStorage.getItem('attenda_welcomed')) {
        setShowWelcome(true);
        localStorage.setItem('attenda_welcomed', '1');
      }
      // Save hotel slug to localStorage so config queries work
      if (staff.hotel_id) {
        const { data: hotelData } = await supabase.from('hotels').select('slug').eq('id', staff.hotel_id).single();
        if (hotelData?.slug) localStorage.setItem('attenda_hotel_slug', hotelData.slug);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Login failed.';
      if (msg.includes('Invalid login credentials')) {
        setAuthError('Invalid email or password.');
      } else {
        setAuthError(msg);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // PIN login removed — email+password only

  const pickHotel = async (slug: string) => {
    localStorage.setItem('attenda_hotel_slug', slug);
    const c = await getHotelConfig(slug);
    if (c) setConfig(c);
    setShowHotelPicker(false);
    setAuthMode('authenticated');
  };

  const switchHotel = async (slug: string) => {
    localStorage.setItem('attenda_hotel_slug', slug);
    const c = await getHotelConfig(slug);
    if (c) { setConfig(c); setTab('orders'); }
    await supabase.auth.refreshSession();
    if (session) await reload(session.role);
  };

  const reload = useCallback(async (role: Role) => {
    // Always load config first so we can filter by hotel
    let cfg = await getHotelConfig();

    // If no hotel found in localStorage (first login / cleared storage), auto-pick for admins
    if (!cfg && (role === 'admin' || role === 'superadmin' || role === 'manager')) {
      const hotels = await getAllHotels() as { id: string; slug: string; name: string }[];
      setAllHotels(hotels);
      if (hotels.length === 1) {
        // Only one property — select it automatically
        localStorage.setItem('attenda_hotel_slug', hotels[0].slug);
        cfg = await getHotelConfig(hotels[0].slug);
      } else if (hotels.length > 1) {
        setShowHotelPicker(true);
        return;
      }
    }

    if (cfg) {
      // Only swap state when the hotel actually changes. reload() used to setConfig()
      // with a fresh object every call, which retriggered the [session, reload, config]
      // effect at ~10/sec (effect -> reload -> new config object -> effect).
      const nextCfg = cfg;
      setConfig(prev => (prev && prev.id === nextCfg.id ? prev : nextCfg));
    }
    const hotelId = cfg?.id;

    if (!hotelId) {
      setRequests([]);
      setMessages([]);
      setStaff([]);
      return;
    }

    const isManager = role === 'admin' || role === 'superadmin' || role === 'manager';
    const [req, msg, staffRows] = await Promise.all([
      supabase.from('requests').select('*').eq('hotel_id', hotelId).neq('room', 'STAFF').order('created_at', { ascending: false }),
      supabase.from('messages').select('*').eq('hotel_id', hotelId).order('created_at', { ascending: false }),
      isManager ? getStaffAccountsForHotel(hotelId!) : Promise.resolve(null),
    ]);
    if (req.data) setRequests(req.data);
    if (msg.data) setMessages(msg.data);
    if (staffRows) setStaff(staffRows);
  }, []);

  // Load data when the session role changes. config is intentionally NOT a dep here:
  // it used to be, and since reload() replaced the config object each call, the effect
  // re-ran itself at ~10/sec. Realtime subscriptions live in a separate effect keyed
  // on the hotel-id STRING so channel resubscribes only happen on actual hotel change.
  const configId = config?.id || null;
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    if (!session) return;
    reload(session.role);
    // Load hotels list for sidebar switcher
    if (session.role === 'admin' || session.role === 'superadmin') {
      getAllHotels().then(data => setAllHotels(data as { id: string; slug: string; name: string }[]));
    }
  }, [session, reload]);

  useEffect(() => {
    if (!session) return;
    const hotelId = configId;
    const ch1 = subscribeToRequests(hotelId, (payload: any) => {
      // Email alert on new request
      if (payload?.eventType === 'INSERT' && payload?.new) {
        const r = payload.new;
        // Append to requests state directly instead of reloading
        setRequests(prev => [r, ...prev]);
        if (configRef.current?.notificationEmail && r.guest_name && r.room && r.type) {
          fetch('/api/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
            body: JSON.stringify({
              type: 'new_request',
              data: {
                notificationEmail: configRef.current.notificationEmail,
                hotelName: configRef.current.name || 'Hotel',
                guestName: r.guest_name,
                room: r.room,
                requestType: r.type,
                details: r.details || '',
              },
            }),
          }).catch(() => {});
        }
      } else if (payload?.eventType === 'UPDATE' && payload?.new) {
        // Update in-place instead of reloading
        setRequests(prev => prev.map(r => r.id === payload.new.id ? { ...r, ...payload.new } : r));
      } else if (payload?.eventType === 'DELETE' && payload?.old) {
        setRequests(prev => prev.filter(r => r.id !== payload.old.id));
      }
    });
    const ch2 = subscribeToMessages(hotelId, (payload: any) => {
      // Email alert on new guest message
      if (payload?.eventType === 'INSERT' && payload?.new) {
        const m = payload.new;
        // Append to messages state directly instead of reloading
        setMessages(prev => [m, ...prev]);
        if (configRef.current?.notificationEmail && m.guest_name && m.body) {
          fetch('/api/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
            body: JSON.stringify({
              type: 'guest_message',
              data: {
                notificationEmail: configRef.current.notificationEmail,
                hotelName: configRef.current.name || 'Hotel',
                guestName: m.guest_name,
                room: m.room || '',
                message: m.body,
              },
            }),
          }).catch(() => {});
        }
      } else {
        // Unknown message events (non-INSERT): ignore — no reload.
      }
    });
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [session, configId]);

  /* ── Login screen ─────────────────────────────────── */
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
        <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${TEAL}18` }}>
            <Mail size={24} style={{ color: TEAL }} />
          </div>
          <h1 className="text-xl font-bold text-center mb-1">Staff Dashboard</h1>
          <p className="text-sm text-gray-400 text-center mb-6">Sign in with your email and password</p>
          <div className="space-y-3">
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setAuthError(''); }} placeholder="Email address" onKeyDown={e => e.key === 'Enter' && handleEmailLogin()} autoComplete="email" className="w-full bg-gray-50 rounded-xl px-4 py-3.5 text-[14px] border border-gray-100 focus:outline-none focus:border-teal-400" />
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setAuthError(''); }} placeholder="Password" onKeyDown={e => e.key === 'Enter' && handleEmailLogin()} autoComplete="current-password" className="w-full bg-gray-50 rounded-xl px-4 py-3.5 text-[14px] border border-gray-100 focus:outline-none focus:border-teal-400 pr-11" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">{showPass ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            </div>
            {authError && <p className="text-red-500 text-[12px] text-center bg-red-50 py-2 rounded-lg">{authError}</p>}
            <button onClick={handleEmailLogin} disabled={authLoading} className="w-full py-3.5 rounded-xl text-white font-semibold text-[14px] flex items-center justify-center gap-2 disabled:opacity-60" style={{ backgroundColor: TEAL }}>
              {authLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Lock size={16} />}
              {authLoading ? 'Signing in...' : 'SIGN IN'}
            </button>
            <div className="text-center mt-3">
              <a href="/staff/reset-password" className="text-[12px] text-gray-400 hover:text-gray-600 underline">Forgot your password?</a>
            </div>
          </div>
          <p className="text-center mt-4 text-[12px] text-gray-400">Platform admin? <a href="/superadmin" className="font-semibold underline" style={{ color: TEAL }}>Super Admin →</a></p>
        </div>
      </div>
    );
  }

  /* ── Hotel Picker (for PIN 2025 admins with multiple properties) ─── */
  if (showHotelPicker) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
        <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${TEAL}18` }}>
            <Building2 size={24} style={{ color: TEAL }} />
          </div>
          <h1 className="text-xl font-bold text-center mb-1">Select Property</h1>
          <p className="text-sm text-gray-400 text-center mb-6">Choose which property to manage</p>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {allHotels.map(h => (
              <button key={h.id} onClick={() => pickHotel(h.slug)}
                className="w-full text-left bg-gray-50 hover:bg-gray-100 rounded-xl px-4 py-3.5 transition-colors border border-gray-100 hover:border-gray-200">
                <p className="text-[14px] font-semibold text-gray-900">{h.name}</p>
                <p className="text-[11px] text-gray-400 font-mono">@{h.slug}</p>
              </button>
            ))}
          </div>
          <button onClick={() => { setShowHotelPicker(false); setSession(null); }}
            className="w-full mt-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold text-[12px] hover:bg-gray-200">
            ← Back to login
          </button>
        </div>
      </div>
    );
  }

  /* ── Impersonation Picker (superadmin only) ─────── */
  if (showImpersonatePicker) {
    const nonSuper = staff.filter(s => s.role !== 'superadmin' && s.role !== 'vendor');
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl">
          <h2 className="text-[15px] font-bold mb-1">View as Staff Member</h2>
          <p className="text-[12px] text-gray-400 mb-4">Pick a staff member to see exactly what they see</p>
          {nonSuper.length === 0 ? (
            <p className="text-[13px] text-gray-400 text-center py-6">No staff accounts found. Add some in Staff Management first.</p>
          ) : (
            <div className="space-y-1 max-h-[350px] overflow-y-auto">
              {nonSuper.map(st => (
                <button key={st.id || st.name}
                  onClick={() => {
                    setImpersonatingUser({ name: st.name, role: st.role === 'admin' || st.role === 'manager' ? 'admin' : 'staff' });
                    setShowImpersonatePicker(false);
                    setTab('dailybrief');
                  }}
                  className="w-full text-left flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-xl px-4 py-3 transition-colors"
                >
                  <div>
                    <p className="text-[14px] font-semibold text-gray-900">{st.name}</p>
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                      st.role === 'admin' || st.role === 'manager' ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {st.role === 'admin' || st.role === 'manager' ? 'Admin' : st.role === 'supervisor' ? 'Supervisor' : 'Staff'}
                    </span>
                  </div>
                  <Eye size={16} className="text-gray-400" />
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setShowImpersonatePicker(false)}
            className="w-full mt-3 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold text-[12px] hover:bg-gray-200">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  /* ── Dashboard ────────────────────────────────────── */
  const s = session!;
  // Impersonation override — superadmin can view as staff
  const effectiveRole: Role = impersonatingUser?.role || s.role;
  const sessionPerms = s.permissions ?? [];
  const visibleNav = NAV.filter(n => {
    if (!n.roles.includes(effectiveRole)) return false;
    // For staff and supervisor, also check per-tab permission if one exists
    if (effectiveRole === 'staff' || effectiveRole === 'supervisor') {
      const requiredPerm = TAB_PERMS[n.tab];
      if (requiredPerm && !sessionPerms.includes(requiredPerm)) return false;
    }
    // Check hotel feature flags — if a feature is explicitly disabled, hide the tab
    if (config?.features && config.features[n.tab] === false) return false;
    return true;
  });
  const isAdmin = s.role === 'admin' || s.role === 'superadmin';
  const canManageTodos = true; // All tenants can manage to-dos
  const isSupervisor = s.role === 'supervisor';
  // Vendors land on their manifest tab
  const effectiveTab = (effectiveRole === 'vendor' && tab === 'orders') ? 'vendor_manifest' : tab;


  // Helper: render a tab panel — mounts on first visit, hidden (not destroyed) when inactive
  function tabPanel(tabId: string, condition: boolean, children: React.ReactNode) {
    if (!visitedTabs.has(tabId) || !condition) return null;
    return <div style={{ display: effectiveTab === tabId ? 'block' : 'none' }}>{children}</div>;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row">

      {/* ── Multi-tab blocker ── */}
      {multiTabBlocked && (
        <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-5">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-[22px] font-extrabold text-gray-900 mb-2">Already open in another tab</h2>
          <p className="text-[14px] text-gray-500 max-w-sm mb-6">
            This staff dashboard can only be opened in one browser tab at a time to prevent duplicate requests and excessive server usage.
          </p>
          <div className="text-[13px] text-gray-400 space-y-1">
            <p>Close the other tab, or</p>
            <button
              onClick={() => { setMultiTabBlocked(false); localStorage.removeItem('attenda_staff_tab_id'); }}
              className="text-teal-600 font-semibold hover:underline"
            >
              Take control here
            </button>
          </div>
        </div>
      )}

      {/* ── Welcome modal (first login after setup) ── */}
      {showWelcome && (
        <div className="fixed inset-0 z-[999] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center">
            <div className="text-4xl mb-4">👋</div>
            <h2 className="text-[22px] font-extrabold text-gray-900 mb-1">Welcome to Attenda, {s.name.split(' ')[0]}!</h2>
            <p className="text-[13px] text-gray-500 mb-2">
              You&apos;re logged in as <span className="font-bold text-teal-600">{s.role === 'supervisor' ? 'Supervisor' : 'Staff'}</span>
            </p>
            <p className="text-[13px] text-gray-400 mb-6">Here&apos;s what you have access to today:</p>
            <div className="text-left bg-gray-50 rounded-2xl p-4 mb-6 space-y-2">
              {visibleNav.slice(0, 6).map(n => (
                <div key={n.tab} className="flex items-center gap-2 text-[13px] text-gray-700">
                  <n.icon size={14} className="text-teal-500 shrink-0" />
                  <span>{n.label}</span>
                </div>
              ))}
              {visibleNav.length > 6 && <p className="text-[11px] text-gray-400 pl-5">+ {visibleNav.length - 6} more</p>}
            </div>
            <button onClick={() => setShowWelcome(false)}
              className="w-full py-3.5 rounded-2xl text-white font-extrabold text-[15px]"
              style={{ backgroundColor: TEAL }}>
              Get Started →
            </button>
          </div>
        </div>
      )}

      {/* ── Force password change modal (first login with default password) ── */}
      {showForcePasswordChange && (
        <div className="fixed inset-0 z-[1000] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🔐</div>
              <h2 className="text-[20px] font-extrabold text-gray-900 mb-2">Change Your Password</h2>
              <p className="text-[13px] text-gray-500">
                You're using the default password. Please create a new password to continue.
              </p>
            </div>

            {passwordChangeError && (
              <div className="bg-red-50 text-red-600 text-[12px] font-semibold p-3 rounded-xl mb-4 text-center">
                {passwordChangeError}
              </div>
            )}

            <div className="space-y-3 mb-5">
              <input
                type="password"
                placeholder="New password (min 8 characters)"
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setPasswordChangeError(''); }}
                className="w-full bg-gray-50 rounded-xl px-4 py-3.5 text-[14px] border border-gray-100 focus:outline-none focus:border-teal-400"
                autoComplete="new-password"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setPasswordChangeError(''); }}
                className="w-full bg-gray-50 rounded-xl px-4 py-3.5 text-[14px] border border-gray-100 focus:outline-none focus:border-teal-400"
                autoComplete="new-password"
              />
            </div>

            <button
              onClick={async () => {
                setPasswordChangeError('');
                if (!newPassword || newPassword.length < 8) {
                  setPasswordChangeError('Password must be at least 8 characters.');
                  return;
                }
                if (newPassword !== confirmPassword) {
                  setPasswordChangeError('Passwords do not match.');
                  return;
                }
                if (newPassword === 'Attenda2026!') {
                  setPasswordChangeError('Choose a new password — not the default one.');
                  return;
                }
                setPasswordChanging(true);
                try {
                  const { error } = await supabase.auth.updateUser({ password: newPassword });
                  if (error) throw error;
                  setShowForcePasswordChange(false);
                  setNewPassword('');
                  setConfirmPassword('');
                  setPassword('');
                } catch (e: unknown) {
                  const msg = e instanceof Error ? e.message : 'Failed to update password.';
                  setPasswordChangeError(msg);
                } finally {
                  setPasswordChanging(false);
                }
              }}
              disabled={passwordChanging}
              className="w-full py-3.5 rounded-2xl text-white font-extrabold text-[15px] disabled:opacity-50"
              style={{ backgroundColor: TEAL }}>
              {passwordChanging ? 'Updating...' : 'Update Password & Continue →'}
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile top bar ──────────────────────────── */}
      <header className="md:hidden sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[15px] font-bold text-gray-900 leading-tight">{config?.name || 'Attenda'}</p>
            <p className="text-[11px] text-gray-500">{s.name} ·{' '}
              <span className={`font-semibold ${s.role === 'superadmin' ? 'text-purple-600' : s.role === 'admin' ? 'text-teal-600' : 'text-blue-600'}`}>
                {s.role === 'superadmin' ? 'Super Admin' : s.role === 'admin' ? 'Admin' : 'Staff'}
              </span>
            </p>
          </div>
          <button
            onClick={() => { supabase.auth.signOut(); setSession(null); setAuthMode('email'); setTab('orders'); }}
            className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-red-500 transition-colors"
          >
            <LogOut size={14} />
          </button>
        </div>
        {/* Scrollable tab strip */}
        <div className="flex overflow-x-auto no-scrollbar border-t border-gray-100 bg-gray-50">
          {visibleNav.map(item => (
            <button
              key={item.tab}
              onClick={() => setTab(item.tab)}
              className={`relative shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold transition-colors whitespace-nowrap ${
                effectiveTab === item.tab ? 'text-white' : 'text-gray-500'
              }`}
              style={effectiveTab === item.tab ? { backgroundColor: TEAL } : {}}
            >
              <item.icon size={13} />
              {item.label}
              {item.tab === 'orders' && pendingCount > 0 && (
                <span className="bg-amber-400 text-white text-[9px] font-bold px-1 py-0.5 rounded-full leading-none">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* ── Desktop sidebar ─────────────────────────── */}
      <aside className="hidden md:flex w-[240px] bg-white flex-col shrink-0 h-screen sticky top-0 overflow-y-auto" style={{ borderRight: '1px solid #E5EAF0' }}>
        <div className="px-5 pt-5 pb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-primary.svg" alt="Attenda" style={{ height: 28, width: 'auto', marginBottom: 4 }} />
          <h2 className="text-[15px] font-bold text-gray-900 leading-tight">
            {config?.name || 'Attenda'}
          </h2>
          {isAdmin ? (
            <select
              value={config?.slug || ''}
              onChange={e => switchHotel(e.target.value)}
              className="w-full mt-1 text-[11px] text-gray-500 bg-transparent border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-teal-400"
            >
              {allHotels.length === 0 && (
                // Lazy load hotels the first time
                <option value={config?.slug || ''}>{config?.slug || 'Loading...'}</option>
              )}
              {allHotels.map(h => (
                <option key={h.slug} value={h.slug}>{h.name}</option>
              ))}
            </select>
          ) : (
            <p className="text-[12px] text-gray-500">
              {config?.slug ? `@${config.slug}` : 'Dashboard'}
            </p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-200/60">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Logged in as</p>
          <p className="text-[14px] font-semibold text-gray-900">{s.name}</p>
          {impersonatingUser ? (
            <>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Impersonating</span>
                <span className="text-[11px] text-gray-500">{impersonatingUser.name}</span>
              </div>
              <button onClick={() => setImpersonatingUser(null)} className="mt-1 text-[11px] font-semibold text-red-500 hover:text-red-700 transition-colors">
                Stop Impersonating
              </button>
            </>
          ) : (
            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
              s.role === 'superadmin' ? 'bg-purple-100 text-purple-700' :
              s.role === 'admin' ? 'bg-teal-100 text-teal-700' :
              s.role === 'vendor' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {s.role === 'superadmin' ? 'Super Admin' : s.role === 'admin' ? 'Admin' : s.role === 'supervisor' ? 'Supervisor' : s.role === 'vendor' ? `Vendor · ${s.vendorType || ''}` : 'Staff'}
            </span>
          )}
          {s.role === 'superadmin' && !impersonatingUser && (
            <button onClick={() => setShowImpersonatePicker(true)} className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-purple-600 hover:text-purple-800 transition-colors">
              <Eye size={12} /> View as Staff
            </button>
          )}
        </div>

        <nav className="px-3 py-3 flex-1">
          {(() => {
            const sections = new Map<string, typeof visibleNav>();
            visibleNav.forEach(item => {
              const s = item.section || '';
              if (!sections.has(s)) sections.set(s, []);
              sections.get(s)!.push(item);
            });
            const sectionOrder = ['Today', 'Operate', 'Manage', 'Platform', ''];
            const sectionLabels: Record<string, string> = {
              'Today': 'TODAY',
              'Operate': 'OPERATE',
              'Manage': 'MANAGE',
              'Platform': 'PLATFORM',
              '': '',
            };
            const result: JSX.Element[] = [];
            sectionOrder.forEach(sec => {
              const items = sections.get(sec);
              if (!items || items.length === 0) return;
              if (sec) {
                result.push(
                  <p key={`h-${sec}`} className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-3 pt-4 pb-1.5">{sectionLabels[sec]}</p>
                );
              }
              items.forEach(item => {
                result.push(
                  <button
                    key={item.tab}
                    onClick={() => setTab(item.tab)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors text-left mb-0.5 ${
                      effectiveTab === item.tab ? '' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    style={effectiveTab === item.tab ? { backgroundColor: 'var(--v2-brand-tint, #E4F5F3)', color: 'var(--v2-brand-deep, #0E7C74)' } : {}}
                  >
                    <item.icon size={15} />
                    {item.label}
                    {item.tab === 'orders' && pendingCount > 0 && (
                      <span className="ml-auto bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                );
              });
            });
            return result;
          })()}
        </nav>

        <div className="p-4 border-t border-gray-200/60">
          <button
            onClick={() => { supabase.auth.signOut(); setSession(null); setAuthMode('email'); setTab('orders'); }}
            className="flex items-center gap-2 text-[12px] text-gray-500 hover:text-red-500 transition-colors"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ────────────────────────────── */}
      <main className="flex-1 min-w-0 bg-[#FAFAFA]">
        {/* ── Persistent ticket alert bar ── */}
        {pendingCount > 0 && !dismissedAlert && (
          <div className="bg-amber-50 border-b border-amber-200 px-3 md:px-8 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <p className="text-[13px] font-semibold text-amber-800 truncate">
                <strong>{pendingCount}</strong> open ticket{pendingCount === 1 ? '' : 's'} — check Requests tab
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => { setTab('orders'); setDismissedAlert(true); }}
                className="text-[11px] font-bold px-3 py-1 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
              >
                View
              </button>
              <button
                onClick={() => setDismissedAlert(true)}
                className="text-[11px] text-amber-500 hover:text-amber-700 font-semibold"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        {/* ── Silent "all clear" when no open tickets ── */}
        {pendingCount === 0 && !dismissedAlert && requests.length > 0 && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 md:px-8 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <p className="text-[13px] font-semibold text-emerald-700">No open tickets — all clear ✅</p>
            </div>
            <button
              onClick={() => setDismissedAlert(true)}
              className="text-[11px] text-emerald-500 hover:text-emerald-700 font-semibold shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}
        {tabPanel('dailybrief', true,
          <ErrorBoundary fallback={<div className="p-4 md:p-8"><div className="bg-red-50 border border-red-200 rounded-2xl p-6"><p className="text-[16px] font-bold text-red-800 mb-2">Dashboard error</p><pre id="error-message" className="text-[12px] text-red-700 whitespace-pre-wrap bg-red-100 p-4 rounded-xl">{/* error will show here */}</pre></div></div>}>
            <V2Dashboard
              hotelId={config?.id || ''}
              hotelName={config?.name || 'Hotel'}
              timezone={config?.timezone}
              sessionName={session?.name || ''}
              effectiveRole={effectiveRole}
              requests={requests}
              onOpenTab={(t: string) => setTab(t as NavTab)}
              onUpdateRequest={async (id, status) => { await updateRequestStatus(id, status); reload(s.role); }}
            />
          </ErrorBoundary>
        )}
        {tabPanel('myday', true,
          <ErrorBoundary fallback={<div className="p-4 md:p-8"><div className="bg-red-50 border border-red-200 rounded-2xl p-6"><p className="text-[16px] font-bold text-red-800 mb-2">My Day error</p></div></div>}>
            <V2MyDay
              hotelId={config?.id || ''}
              hotelName={config?.name || 'Hotel'}
              timezone={config?.timezone}
              sessionName={session?.name || ''}
              requests={requests}
              onOpenTab={(t: string) => setTab(t as NavTab)}
              onUpdateRequest={async (id, status) => { await updateRequestStatus(id, status); reload(s.role); }}
            />
          </ErrorBoundary>
        )}
        {tabPanel('property_info', !!config,
          <PropertyInfoView config={config!} />
        )}
        {tabPanel('schedules', true,
          <SchedulesView hotelId={config?.id || ''} isAdmin={isAdmin} weekStartsOn={config?.weekStartsOn || 'Sunday'} staffName={s.name} hotelName={config?.name || 'Hotel'} staffList={staff.map(s => ({ id: s.id, name: s.name, role: s.role, department: s.department, hire_date: s.hire_date, min_hours: s.min_hours || 0, employment_type: s.employment_type, email: s.email || '' }))} />
        )}
        {tabPanel('compset', true,
          <CompsetView hotelId={config?.id || ''} isAdmin={isAdmin} staffId={staff.find(st => st.name === s.name)?.id || ''} staffName={s.name} />
        )}
        {tabPanel('leaderboard', true,
          <LeaderboardView hotelId={config?.id || ''} staffName={s.name} isAdmin={isAdmin} />
        )}
        {tabPanel('culture', true,
          <CultureView hotelId={config?.id || ''} staffName={s.name || session?.name || 'Staff'} isAdmin={isAdmin} />
        )}
        {tabPanel('checklists_tab', true,
          <ChecklistsTabView hotelId={config?.id || ''} isAdmin={isAdmin} />
        )}
        {tabPanel('kpis', true,
          <KpisView hotelId={config?.id || ''} isAdmin={isAdmin} userId="" userName={session?.name || 'Staff'} />
        )}
        {tabPanel('marketplace', true,
          <MarketplaceView hotelId={config?.id || ''} isAdmin={isAdmin} />
        )}
        {tabPanel('learning_hr', true,
          <LearningHRView hotelId={config?.id || ''} />
        )}
        {tabPanel('orders', true,
          <OrdersView
            requests={requests}
            messages={messages}
            staffName={s.name}
            staffList={staff}
            onStatusChange={async (id, status, assigned_to) => { await updateRequestStatus(id, status, assigned_to); reload(s.role); }}
            onDelete={async id => { await deleteRequest(id); reload(s.role); }}
            onRefresh={() => reload(s.role)}
          />
        )}
        {tabPanel('messages', true,
          <MessagesView messages={messages} hotelId={config?.id || ''} />
        )}
        {tabPanel('shuttle', true,
          <ShuttleViewComponent hotelId={config?.id || ''} isAdmin={isAdmin} staffName={s.name} staffList={staff} />
        )}
        {tabPanel('shuttle_schedule', true,
          <ShuttleScheduleView hotelId={config?.id || ''} isAdmin={isAdmin} />
        )}
        {tabPanel('forecast', true,
          <ForecastView hotelId={config?.id || ''} totalRooms={config?.roomCount || 0} timezone={config?.timezone} />
        )}
        {tabPanel('todos', true,
          <PositionTodosView hotelId={config?.id || ''} isAdmin={isAdmin} canManage={canManageTodos} staffName={s.name} department={s.department} />
        )}
        {tabPanel('vendor_manifest', true,
          <VendorDashboard hotelId={config?.id || ''} vendorType={s.vendorType || 'shuttle'} vendorName={s.name} />
        )}
        {tabPanel('hotel', isAdmin && !!config,
          <ErrorBoundary>
            <V2PropertySettings
              config={config!}
              onSaved={async () => { const c = await getHotelConfig(); if (c) setConfig(c); }}
            />
          </ErrorBoundary>
        )}
        {tabPanel('staff_mgmt', isAdmin,
          <V2StaffManagement hotelId={config?.id || ''} hotelName={config?.name || 'Hotel'} hotelSlug={config?.slug || ''} staff={staff} onRefresh={async () => setStaff(await getStaffAccountsForHotel(config?.id || ''))} />
        )}
        {tabPanel('partners', isAdmin,
          <PartnersView hotelId={config?.id || ''} />
        )}
        {tabPanel('vendors', isAdmin || s.role === 'manager',
          <V2Vendors hotelId={config?.id || ''} userName={s.name} />
        )}
        {tabPanel('qrcodes', isAdmin,
          <QrCodesView hotelId={config?.id || ''} hotelSlug={config?.slug || ''} />
        )}
        {tabPanel('knowledge', true,
          <V2RightAnswers hotelId={config?.id || ''} isAdmin={isAdmin} userName={s.name} />
        )}
        {tabPanel('inspections', true,
          <V2ComingSoon icon={ClipboardCheck} title="Inspections" subtitle="Brand, local, safety, and departmental inspections."
            description="Recurring and special inspections, scoring, deficiencies, corrective actions, evidence, and follow-up will live here. No mockup or backing schema exists yet — future work." />
        )}
        {tabPanel('maintenance', true,
          <V2ComingSoon icon={Wrench} title="Maintenance" subtitle="Protect the asset — work orders, PMs, and vendor dependency."
            description="Work orders, preventive maintenance, asset history, parts/inventory, and spend controls will live here. No mockup or backing schema exists yet — future work." />
        )}
        {tabPanel('housekeeping', true,
          <V2ComingSoon icon={DoorOpen} title="Housekeeping" subtitle="Control rooms, minutes, labor, and supplies."
            description="Room workload, checkouts/stayovers, housekeeper allocation, productivity, and supply inventory will live here. No mockup or backing schema exists yet — future work." />
        )}
        {tabPanel('fnb', true,
          <V2FnB />
        )}
        {tabPanel('rooms', isAdmin,
          <RoomsView hotelId={config?.id || ''} hotelName={config?.name || 'Hotel'} />
        )}
        {tabPanel('agent', isAdmin,
          <AgentDashboard hotelId={config?.id || ''} hotelName={config?.name || 'Hotel'} />
        )}
        {tabPanel('properties', s.role === 'superadmin',
          <SuperAdminView onSwitchHotel={switchHotel} />
        )}
        {tabPanel('guests', true,
          <GuestsView hotelId={config?.id || ''} />
        )}
        {tabPanel('revenue', isAdmin,
          <V2Revenue hotelId={config?.id || ''} isAdmin={isAdmin} />
        )}
        {tabPanel('reports', isAdmin,
          <V2Reports hotelId={config?.id || ''} isAdmin={isAdmin} />
        )}
        {tabPanel('callouts', isAdmin || s.role === 'staff',
          <CalloutsView hotelId={config?.id || ''} isAdmin={isAdmin} staffName={s.name} />
        )}
        {tabPanel('schedule_forecast', true,
          <V2ScheduleForecast hotelId={config?.id || ''} totalRooms={config?.roomCount || 0} timezone={config?.timezone} isAdmin={isAdmin}
            staffList={staff.map(st => ({ id: st.id || '', name: st.name, role: st.role, department: st.department, hire_date: st.hire_date, min_hours: st.min_hours || 0, employment_type: st.employment_type, email: st.email || '' }))} />
        )}
      </main>
    </div>
  );
}

/* ── Orders View (dynamic import) ──────────────────────── */
const OrdersView = dynamic(() => import('@/components/staff/OrdersView'), { ssr: false });

/* ── Messages View (WhatsApp-Style Split) ──────────────── */
function MessagesView({ messages, hotelId }: { messages: Message[]; hotelId?: string }) {
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [staffChannel, setStaffChannel] = useState<Message[]>([]);
  const [staffMsg, setStaffMsg] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [internalTab, setInternalTab] = useState<'guest' | 'staff'>('guest');

  // Load staff messages
  useEffect(() => {
    if (!hotelId) return;
    supabase.from('messages')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('sender', 'staff')
      .eq('room', '__staff__')
      .order('created_at', { ascending: true })
      .then(({ data }) => setStaffChannel(data || []));
  }, [hotelId]);

  // Subscribe to new staff messages
  useEffect(() => {
    if (!hotelId) return;
    const ch = supabase
      .channel('staff-messages-live')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `hotel_id=eq.${hotelId}` },
        () => {
          supabase.from('messages')
            .select('*')
            .eq('hotel_id', hotelId)
            .eq('sender', 'staff')
            .eq('room', '__staff__')
            .order('created_at', { ascending: true })
            .then(({ data }) => setStaffChannel(data || []));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [hotelId]);

  // Build conversation groups (by guest_name), sorted by most recent
  const byGuest = new Map<string, Message[]>();
  messages.forEach(msg => {
    const arr = byGuest.get(msg.guest_name) || [];
    arr.push(msg);
    byGuest.set(msg.guest_name, arr);
  });
  const groups: { guest_name: string; room: string; messages: Message[]; lastMsg: Message; unread: number }[] = [];
  byGuest.forEach((msgs, name) => {
    // Filter out internal staff messages from guest view
    const real = msgs.filter(m => m.room !== '__staff__');
    if (real.length === 0) return;
    real.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    groups.push({
      guest_name: name,
      room: real[real.length - 1].room,
      messages: real,
      lastMsg: real[real.length - 1],
      unread: real.length,
    });
  });
  groups.sort((a, b) => new Date(b.lastMsg.created_at).getTime() - new Date(a.lastMsg.created_at).getTime());

  const selected = groups.find(g => g.guest_name === selectedGuest);
  const [showArchived, setShowArchived] = useState(false);

  // Split into today's active convos vs archived (no activity today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activeGroups = groups.filter(g => new Date(g.lastMsg.created_at) >= today);
  const archivedGroups = groups.filter(g => new Date(g.lastMsg.created_at) < today);

  const filteredGroups = showArchived ? archivedGroups : activeGroups;

  const handleSend = async () => {
    if (!replyText.trim() || !selected || !hotelId) return;
    await supabase.from('messages').insert({
      hotel_id: hotelId,
      guest_name: selected.guest_name,
      room: selected.room,
      sender: 'staff',
      body: replyText.trim(),
    });
    setReplyText('');
  };

  const sendStaffMessage = async () => {
    if (!staffMsg.trim() || !hotelId) return;
    await supabase.from('messages').insert({
      hotel_id: hotelId,
      guest_name: 'Staff Channel',
      room: '__staff__',
      sender: 'staff',
      body: staffMsg.trim(),
    });
    setStaffMsg('');
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [selected, selectedGuest]);

  /* ── Left Panel: Contact List ────────────────────────── */
  const contactList = (
    <div className="h-full flex flex-col bg-white">
      <div className="shrink-0 px-4 py-3 border-b border-gray-200">
        <h2 className="text-[15px] font-extrabold text-gray-900">Chats</h2>
        <p className="text-[11px] text-gray-400 mt-0.5">{activeGroups.length} active · {archivedGroups.length} archived</p>
      </div>
      <div className="flex gap-1 px-4 py-2 border-b border-gray-100">
        <button onClick={() => setShowArchived(false)} className={`text-[11px] font-semibold px-3 py-1.5 rounded-full transition-colors ${!showArchived ? 'bg-teal-100 text-teal-800' : 'text-gray-500 hover:bg-gray-100'}`}>Active ({activeGroups.length})</button>
        <button onClick={() => setShowArchived(true)} className={`text-[11px] font-semibold px-3 py-1.5 rounded-full transition-colors ${showArchived ? 'bg-teal-100 text-teal-800' : 'text-gray-500 hover:bg-gray-100'}`}>Archived ({archivedGroups.length})</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredGroups.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare size={28} className="text-gray-300 mx-auto mb-2" />
            <p className="text-[12px] text-gray-500">{showArchived ? 'No archived conversations.' : 'No active conversations today.'}</p>
          </div>
        ) : (
          filteredGroups.map(g => (
            <button
              key={g.guest_name}
              onClick={() => setSelectedGuest(g.guest_name)}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                selectedGuest === g.guest_name ? 'bg-teal-50' : ''
              }`}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[14px] font-bold shrink-0" style={{ backgroundColor: TEAL }}>
                {g.guest_name.charAt(0).toUpperCase()}
              </div>
              {/* Preview */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-semibold text-gray-900 truncate">{g.guest_name}</p>
                  <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                    {new Date(g.lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 truncate mt-0.5">
                  Room {g.room} — {g.lastMsg.body}
                </p>
              </div>
              {/* Unread badge */}
              {g.unread > 0 && (
                <span className="text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: TEAL }}>
                  {g.unread}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );

  /* ── Right Panel: Chat History + Reply ───────────────── */
  const chatContent = selected ? (
    <div className="h-full flex flex-col bg-[#ECE5DD]">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-gray-200 bg-white flex items-center gap-3">
        <button
          onClick={() => setSelectedGuest(null)}
          className="lg:hidden text-gray-500 hover:text-gray-700"
          aria-label="Back to conversations"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0" style={{ backgroundColor: TEAL }}>
          {selected.guest_name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-[13px] font-semibold text-gray-900">{selected.guest_name}</p>
          <p className="text-[11px] text-gray-500">Room {selected.room}</p>
        </div>
      </div>

      {/* Message bubbles (all) */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {selected.messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'staff' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm ${
              msg.sender === 'staff'
                ? 'bg-[#DCF8C6] text-gray-800 rounded-br-md'   // staff = sent = green bubble
                : 'bg-white text-gray-800 rounded-bl-md'        // guest = received = white bubble
            }`}>
              {msg.body}
            </div>
            <span className="text-[9px] text-gray-400 mt-0.5 px-1">
              {msg.sender === 'staff' ? 'Staff' : msg.guest_name} · {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>

      {/* Reply input */}
      <div className="shrink-0 bg-gray-50 border-t border-gray-200 px-4 py-3">
        <div className="flex gap-2">
          <input
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type a reply..."
            className="flex-1 bg-white rounded-full px-4 py-2.5 text-[13px] outline-none border border-gray-200 placeholder-gray-400 focus:border-teal-500 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!replyText.trim()}
            className="px-5 py-2.5 rounded-full text-white font-semibold text-[13px] disabled:opacity-40 transition-colors"
            style={{ backgroundColor: TEAL }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  ) : (
    <div className="h-full flex items-center justify-center bg-[#FAFAFA]">
      <div className="text-center">
        <MessageSquare size={44} className="text-gray-200 mx-auto mb-3" />
        <p className="text-[13px] text-gray-500 font-medium">Select a conversation</p>
        <p className="text-[11px] text-gray-400 mt-1">Choose a guest from the sidebar to view their messages.</p>
      </div>
    </div>
  );

  /* ── Tab switcher ────────────────────────────────────── */
  const tabBar = (
    <div className="flex gap-0.5 p-2 bg-gray-100 rounded-xl mb-3 mx-4 mt-3">
      <button onClick={() => setInternalTab('guest')}
        className={`flex-1 py-2 rounded-lg text-[12px] font-bold transition-colors ${internalTab === 'guest' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
        Guest Chats ({activeGroups.length + archivedGroups.length})
      </button>
      <button onClick={() => setInternalTab('staff')}
        className={`flex-1 py-2 rounded-lg text-[12px] font-bold transition-colors ${internalTab === 'staff' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
        Staff Channel ({staffChannel.length})
      </button>
    </div>
  );

  /* ── Staff Channel View ─────────────────────────────── */
  const staffChannelView = (
    <div className="h-full flex flex-col">
      <div className="shrink-0 px-4 py-3 border-b border-gray-200 bg-white">
        <h2 className="text-[15px] font-extrabold text-gray-900">Staff Channel</h2>
        <p className="text-[11px] text-gray-400 mt-0.5">Internal team messages — all staff see this</p>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#FAFAFA]">
        {staffChannel.length === 0 ? (
          <div className="py-12 text-center">
            <MessageSquare size={28} className="text-gray-300 mx-auto mb-2" />
            <p className="text-[12px] text-gray-500">No staff messages yet.</p>
          </div>
        ) : (
          staffChannel.map(msg => (
            <div key={msg.id} className={`flex flex-col ${msg.sender === 'staff' ? 'items-start' : 'items-end'}`}>
              <div className="max-w-[75%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm bg-white text-gray-800 rounded-bl-md">
                <p className="text-[10px] font-bold text-gray-500 mb-0.5">{msg.guest_name}</p>
                {msg.body}
              </div>
              <span className="text-[9px] text-gray-400 mt-0.5 px-1">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
      </div>
      <div className="shrink-0 bg-gray-50 border-t border-gray-200 px-4 py-3">
        <div className="flex gap-2">
          <input value={staffMsg} onChange={e => setStaffMsg(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendStaffMessage(); } }}
            placeholder="Message the team..."
            className="flex-1 bg-white rounded-full px-4 py-2.5 text-[13px] outline-none border border-gray-200 placeholder-gray-400" />
          <button onClick={sendStaffMessage} disabled={!staffMsg.trim()}
            className="px-5 py-2.5 rounded-full text-white font-semibold text-[13px] disabled:opacity-40" style={{ backgroundColor: TEAL }}>
            Send
          </button>
        </div>
      </div>
    </div>
  );

  /* ── Layout: Desktop = split, Mobile = full screen ─── */
  return internalTab === 'staff' ? (
    <div className="h-full">{staffChannelView}</div>
  ) : (
    <div className="h-full flex flex-col">
      {tabBar}
      <div className="flex-1 flex">
        {/* Left panel — hidden on mobile when a conversation is open */}
        <div className="hidden lg:flex lg:flex-col w-80 border-r border-gray-200 shrink-0">
          {contactList}
        </div>
        <div className={`lg:hidden w-full ${selectedGuest ? 'hidden' : 'block'}`}>
          {contactList}
        </div>

        {/* Right panel — chat */}
        <div className={`flex-1 min-w-0 ${selectedGuest ? 'block' : 'hidden lg:block'}`}>
          {chatContent}
        </div>
      </div>
    </div>
  );
}

/* ── Shuttle Routes Panel ───────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ShuttleRoutesPanel({ hotelId, isAdmin }: { hotelId: string; isAdmin: boolean }) {
  const [routes, setRoutes] = useState<ShuttleRoute[]>([]);
  const [slots, setSlots] = useState<ShuttleSlot[]>([]);
  const [bookings, setBookings] = useState<Record<string, ShuttleBooking[]>>({});
  const [loading, setLoading] = useState(true);
  const [newRoute, setNewRoute] = useState({ name: '', type: 'airport', price: 0 });
  const [newSlot, setNewSlot] = useState<{ route_id: string; show: boolean; time: string; days: number[]; capacity: number; event_label: string; override_price: number | null }>({ route_id: '', show: false, time: '', days: [0,1,2,3,4,5,6], capacity: 0, event_label: '', override_price: null });
  const [batch, setBatch] = useState<{ route_id: string; show: boolean; from: string; to: string; interval: number; days: number[]; capacity: number; override_price: number | null }>({ route_id: '', show: false, from: '', to: '', interval: 60, days: [0,1,2,3,4,5,6], capacity: 0, override_price: null });
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);

  const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  const load = useCallback(async () => {
    if (!hotelId) { setLoading(false); return; }
    const r = await getShuttleRoutes(hotelId);
    setRoutes(r);
    const s = await getAllShuttleSlotsForHotel(hotelId);
    setSlots(s);
    const b = await getAllShuttleBookingsForHotel(hotelId);
    const bySlot: Record<string, ShuttleBooking[]> = {};
    b.forEach(bk => { if (!bySlot[bk.slot_id]) bySlot[bk.slot_id] = []; bySlot[bk.slot_id].push(bk); });
    setBookings(bySlot);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const handleAddRoute = async () => {
    if (!newRoute.name) return;
    await createShuttleRoute({ hotel_id: hotelId, name: newRoute.name, type: newRoute.type, price: newRoute.price });
    setNewRoute({ name: '', type: 'airport', price: 0 });
    load();
  };

  const handleAddSlot = async () => {
    if (!newSlot.time || !newSlot.route_id) return;
    await createShuttleSlot({ route_id: newSlot.route_id, hotel_id: hotelId, departure_time: newSlot.time + ':00', days_of_week: newSlot.days, capacity: newSlot.capacity, event_label: newSlot.event_label, override_price: newSlot.override_price ?? undefined });
    setNewSlot({ route_id: '', show: false, time: '', days: [0,1,2,3,4,5,6], capacity: 0, event_label: '', override_price: null });
    load();
  };

  const handleBatchGenerate = async () => {
    if (!batch.from || !batch.to || !batch.route_id) return;
    const [startH, startM] = batch.from.split(':').map(Number);
    const [endH, endM] = batch.to.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const generated: { route_id: string; hotel_id: string; departure_time: string; days_of_week: number[]; capacity: number; override_price?: number }[] = [];
    for (let m = startMinutes; m <= endMinutes; m += batch.interval) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const departure_time = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
      generated.push({ route_id: batch.route_id, hotel_id: hotelId, days_of_week: batch.days, departure_time, capacity: batch.capacity, override_price: batch.override_price ?? undefined });
    }
    await Promise.all(generated.map(g => createShuttleSlot(g)));
    setBatch({ route_id: '', show: false, from: '', to: '', interval: 60, days: [0,1,2,3,4,5,6], capacity: 0, override_price: null });
    load();
  };

  if (loading) return <div className="text-center py-12"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6">
      {/* Add Route */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-extrabold text-[15px] mb-3">+ Add Route</h3>
          <div className="flex gap-2 items-end flex-wrap">
            <input placeholder="Route name (e.g. MIA Airport)" value={newRoute.name} onChange={e => setNewRoute({ ...newRoute, name: e.target.value })}
              className="flex-1 min-w-[160px] bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            <select value={newRoute.type} onChange={e => setNewRoute({ ...newRoute, type: e.target.value })}
              className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none">
              <option value="airport">Airport (free)</option><option value="cruise">Cruise Port</option><option value="custom">Custom</option>
            </select>
            <div>
              <label className="text-[10px] text-gray-400 block">$ per person</label>
              <input type="number" min="0" step="0.01" value={newRoute.price || ''} placeholder="0" onChange={e => setNewRoute({ ...newRoute, price: parseFloat(e.target.value)||0 })}
                className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none w-[72px]" />
            </div>
            <button onClick={handleAddRoute} className="px-4 py-2.5 rounded-xl text-white font-semibold text-[13px]" style={{ backgroundColor: '#158A7C' }}>Add</button>
          </div>
        </div>
      )}

      {/* Routes & Slots */}
      {routes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
          <Bus size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[13px] text-gray-500">No shuttle routes configured yet.</p>
          {isAdmin && <p className="text-[12px] text-gray-400 mt-1">Add your first route above.</p>}
        </div>
      ) : routes.map(route => {
        const routeSlots = slots.filter(s => s.route_id === route.id);
        return (
          <div key={route.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between cursor-pointer" onClick={() => setExpandedRoute(expandedRoute === route.id ? null : route.id)}>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-teal-100 text-teal-700">{route.type}</span>
                <h3 className="font-extrabold text-[16px] text-gray-900">{route.name}</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: (route.price||0) > 0 ? '#FEF3C7' : '#D1FAE5', color: (route.price||0) > 0 ? '#92400E' : '#065F46' }}>{(route.price||0) > 0 ? `$${route.price}/person` : 'Free'}</span>
                <span className="text-[12px] text-gray-400">{routeSlots.length} slots</span>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <>
                    <button onClick={e => { e.stopPropagation(); setNewSlot({ route_id: route.id, show: true, time: '', days: [0,1,2,3,4,5,6], capacity: 0, event_label: '', override_price: null }); }}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-teal-50 text-teal-600">+ Slot</button>
                    <button onClick={e => { e.stopPropagation(); if(confirm('Delete this route and all slots?')) { deleteShuttleRoute(route.id); load(); } }}
                      className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </>
                )}
                {expandedRoute === route.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>

            {expandedRoute === route.id && (
              <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                {/* Add slot form */}
                {newSlot.show && newSlot.route_id === route.id && (
                  <div className="bg-white rounded-xl p-4 border border-gray-200 mb-4 space-y-3">
                    <div className="space-y-3">
                      <div className="flex gap-2 items-end">
                        <div>
                          <label className="text-[10px] text-gray-400 block">Time</label>
                          <input type="time" value={newSlot.time} onChange={e => setNewSlot({ ...newSlot, time: e.target.value })}
                            className="bg-gray-50 rounded-lg px-3 py-2 border text-[13px] outline-none" />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 block">Capacity (0=unlimited)</label>
                          <input type="number" min="0" max="99" value={newSlot.capacity} onChange={e => setNewSlot({ ...newSlot, capacity: parseInt(e.target.value)||0 })}
                            className="bg-gray-50 rounded-lg px-3 py-2 border text-[13px] outline-none w-24" />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 block">Override $ (optional)</label>
                          <input type="number" min="0" step="0.01" value={newSlot.override_price ?? ''} placeholder="--" onChange={e => setNewSlot({ ...newSlot, override_price: e.target.value ? parseFloat(e.target.value) : null })}
                            className="bg-gray-50 rounded-lg px-3 py-2 border text-[13px] outline-none w-[80px]" />
                        </div>
                        <button onClick={handleAddSlot} className="px-4 py-2 rounded-lg text-white font-bold text-[12px]" style={{ backgroundColor: '#158A7C' }}>Save</button>
                        <button onClick={() => setNewSlot({ route_id: '', show: false, time: '', days: [0,1,2,3,4,5,6], capacity: 0, event_label: '', override_price: null })} className="px-3 py-2 text-[12px] text-gray-400">Cancel</button>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block">Event / Cruise Line (optional)</label>
                        <input value={newSlot.event_label} onChange={e => setNewSlot({ ...newSlot, event_label: e.target.value })} placeholder="e.g. Royal Caribbean · May 17" 
                          className="w-full bg-gray-50 rounded-lg px-3 py-2 border text-[13px] outline-none" />
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {DAYS.map((d, i) => {
                        const dayNum = (i + 1) % 7;
                        const active = newSlot.days.includes(dayNum);
                        return (
                          <button key={d} onClick={() => setNewSlot({ ...newSlot, days: active ? newSlot.days.filter(x => x !== dayNum) : [...newSlot.days, dayNum] })}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${active ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{d}</button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Batch generate slots */}{isAdmin && (
                  <div className="bg-white rounded-xl p-4 border border-gray-200 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-[13px] text-gray-800">⚡ Generate Hours</h4>
                      <button onClick={() => setBatch(batch.show && batch.route_id === route.id ? { ...batch, show: false } : { route_id: route.id, show: true, from: '', to: '', interval: 60, days: [0,1,2,3,4,5,6], capacity: 0, override_price: null })}
                        className="text-[11px] font-bold text-teal-600">{batch.show && batch.route_id === route.id ? 'Close' : 'Open'}</button>
                    </div>
                    {batch.show && batch.route_id === route.id && (
                      <div className="space-y-3">
                        <p className="text-[11px] text-gray-500">Generate slots every X minutes, from start to end time.</p>
                        <div className="flex gap-2 items-end flex-wrap">
                          <div>
                            <label className="text-[10px] text-gray-400 block">From</label>
                            <input type="time" value={batch.from} onChange={e => setBatch({ ...batch, from: e.target.value })}
                              className="bg-gray-50 rounded-lg px-3 py-2 border text-[13px] outline-none w-28" />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 block">To</label>
                            <input type="time" value={batch.to} onChange={e => setBatch({ ...batch, to: e.target.value })}
                              className="bg-gray-50 rounded-lg px-3 py-2 border text-[13px] outline-none w-28" />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 block">Every (min)</label>
                            <select value={batch.interval} onChange={e => setBatch({ ...batch, interval: parseInt(e.target.value) })}
                              className="bg-gray-50 rounded-lg px-3 py-2 border text-[13px] outline-none">
                              <option value={30}>30 min</option>
                              <option value={60}>1 hour</option>
                              <option value={120}>2 hours</option>
                              <option value={180}>3 hours</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 block">Capacity</label>
                            <input type="number" min="0" max="99" value={batch.capacity} onChange={e => setBatch({ ...batch, capacity: parseInt(e.target.value)||0 })}
                              className="bg-gray-50 rounded-lg px-3 py-2 border text-[13px] outline-none w-20" />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 block">$ per person</label>
                            <input type="number" min="0" step="0.01" value={batch.override_price ?? ''} placeholder="0" onChange={e => setBatch({ ...batch, override_price: e.target.value ? parseFloat(e.target.value) : null })}
                              className="bg-gray-50 rounded-lg px-3 py-2 border text-[13px] outline-none w-20" />
                          </div>
                          <button onClick={handleBatchGenerate} className="px-4 py-2 rounded-lg text-white font-bold text-[12px]" style={{ backgroundColor: '#158A7C' }}>Generate</button>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {DAYS.map((d, i) => {
                            const dayNum = (i + 1) % 7;
                            const active = batch.days.includes(dayNum);
                            return (
                              <button key={d} onClick={() => setBatch({ ...batch, days: active ? batch.days.filter(x => x !== dayNum) : [...batch.days, dayNum] })}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${active ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{d}</button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Slots list */}
                {routeSlots.length === 0 ? (
                  <p className="text-[13px] text-gray-400 py-2">No time slots yet.</p>
                ) : routeSlots.map(slot => {
                  const slotBookings = bookings[slot.id] || [];
                  const dayNames = (slot.days_of_week || []).map(d => DAYS[(d+6)%7]).join(', ') || 'One-off';
                  return (
                    <div key={slot.id} className="bg-white rounded-xl border border-gray-100 mb-2 overflow-hidden">
                      <div className="px-4 py-3 flex items-center justify-between cursor-pointer" onClick={() => setExpandedSlot(expandedSlot === slot.id ? null : slot.id)}>
                        <div className="flex items-center gap-4">
                          <span className="text-[18px] font-extrabold text-gray-900">{slot.departure_time?.slice(0,5)}</span>
                          <span className="text-[11px] text-gray-400">{slot.event_label ? slot.event_label : dayNames}</span>
                          {(slot.override_price ?? slot.route_price ?? 0) > 0 && <span className="text-[11px] font-semibold text-amber-700">${slot.override_price ?? slot.route_price}/pp</span>}
                          {slot.capacity > 0 && <span className="text-[11px] font-semibold text-emerald-600">{slot.capacity - slotBookings.length} / {slot.capacity} spots</span>}
                          <span className="text-[11px] font-semibold text-purple-600">{slotBookings.length} booked</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isAdmin && <button onClick={e => { e.stopPropagation(); if(confirm('Delete slot?')) { deleteShuttleSlot(slot.id); load(); } }} className="text-red-400"><Trash2 size={12} /></button>}
                          {expandedSlot === slot.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                      </div>
                      {expandedSlot === slot.id && (
                        <div className="border-t border-gray-100 px-4 py-3">
                          {slotBookings.length === 0 ? (
                            <p className="text-[12px] text-gray-400">No bookings yet.</p>
                          ) : (
                            <div className="space-y-2">
                              {slotBookings.map(b => (
                                <div key={b.id} className="flex items-center justify-between text-[12px]">
                                  <div>
                                    <span className="font-semibold text-gray-800">{b.guest_name} · Room {b.room_number} · {b.pax} pax</span>
                                    {(b.price_charged || 0) > 0 && <span className="ml-2 text-[10px] text-amber-700 font-bold">${b.price_charged} charged {b.charge_accepted ? '✅' : '⚠️ not accepted'}</span>}
                                  </div>
                                  <button onClick={() => { cancelShuttleBooking(b.id); load(); }} className="text-[10px] text-red-500 font-bold">Cancel</button>
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Add guest manually — for front desk walk-ups */}
                          {isAdmin && (
                            <AddGuestToSlot slotId={slot.id} routeName={slot.event_label || dayNames} onDone={load} />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Shuttle Requests Panel ─────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ShuttleRequestsPanel({ hotelId }: { hotelId: string }) {
  const [requests, setRequests] = useState<ShuttleRequest[]>([]);
  const [staffList, setStaffList] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [reqs, staff] = await Promise.all([getShuttleRequests(hotelId), getStaffAccountsForHotel(hotelId)]);
    setRequests(reqs);
    setStaffList(staff.filter(s => s.active));
    setLoading(false);
  }, [hotelId]);

  useEffect(() => {
    load();
    // Real-time: auto-refresh when new shuttle requests come in from the AI agent
    const { supabase } = require('@/lib/supabase');
    const channel = supabase
      .channel(`shuttle_requests_${hotelId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'shuttle_requests', filter: `hotel_id=eq.${hotelId}` }, () => {
        load();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'shuttle_requests', filter: `hotel_id=eq.${hotelId}` }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load, hotelId]);

  if (loading) return <div className="text-center py-12"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  const pending = requests.filter(r => r.status === 'pending');
  const active = requests.filter(r => r.status === 'assigned' || r.status === 'in_progress');
  const done = requests.filter(r => r.status === 'completed' || r.status === 'cancelled');

  return (
    <div className="space-y-6">
      {pending.length + active.length === 0 && done.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
          <Bus size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[13px] text-gray-500">No pickup requests yet.</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div>
              <h3 className="text-[13px] font-bold text-amber-600 uppercase tracking-wider mb-2">Pending ({pending.length})</h3>
              <div className="space-y-2">
                {pending.map(r => (
                  <div key={r.id} className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-[14px] font-bold text-gray-900">{r.guest_name} · Room {r.room_number} · {r.pax} pax</p>
                        <p className="text-[12px] text-gray-500">{r.destination} · {r.date || 'No date'} {r.time || ''}</p>
                        {(r.airline || r.terminal || r.callback_number) && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {r.airline && <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[10px] font-bold text-blue-700">{r.airline}</span>}
                            {r.terminal && <span className="px-2 py-0.5 rounded-md bg-purple-50 text-[10px] font-bold text-purple-700">Terminal {r.terminal}</span>}
                            {r.callback_number && <span className="px-2 py-0.5 rounded-md bg-green-50 text-[10px] font-bold text-green-700">📞 {r.callback_number}</span>}
                            {r.flight_number && <span className="px-2 py-0.5 rounded-md bg-gray-50 text-[10px] font-bold text-gray-600">Flight {r.flight_number}</span>}
                          </div>
                        )}
                        {r.notes && <p className="text-[11px] text-gray-400 mt-1">{r.notes}</p>}
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700 shrink-0 ml-2">AI BOOKED</span>
                    </div>
                    <div className="flex gap-2">
                      <select onChange={async e => { if(e.target.value) { await updateShuttleRequest(r.id, { assigned_driver_id: e.target.value, status: 'assigned' }); load(); } }}
                        className="flex-1 bg-gray-50 rounded-lg px-3 py-2 border text-[12px] outline-none">
                        <option value="">Assign driver...</option>
                        {staffList.map(s => <option key={s.id} value={s.id}>{s.name} {s.phone ? `· ${s.phone}` : ''}</option>)}
                      </select>
                      <button onClick={async () => { await updateShuttleRequest(r.id, { status: 'cancelled' }); load(); }}
                        className="px-3 py-2 rounded-lg text-[11px] font-bold text-red-600 bg-red-50">Cancel</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {active.length > 0 && (
            <div>
              <h3 className="text-[13px] font-bold text-blue-600 uppercase tracking-wider mb-2">In Progress ({active.length})</h3>
              <div className="space-y-2">
                {active.map(r => (
                  <div key={r.id} className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[14px] font-bold text-gray-900">{r.guest_name} · Room {r.room_number}</p>
                        <p className="text-[12px] text-gray-500">{r.destination} · Driver: {r.assigned_driver_name || 'Unassigned'}</p>
                      </div>
                      <button onClick={async () => { await updateShuttleRequest(r.id, { status: 'completed' }); load(); }}
                        className="px-3 py-2 rounded-lg text-[11px] font-bold text-white" style={{ backgroundColor: '#158A7C' }}>Complete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {done.length > 0 && (
            <div>
              <h3 className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-2">Today's Ride History ({done.length})</h3>
              <div className="space-y-2">
                {done.map(r => {
                  const isDone = r.status === 'completed';
                  return (
                    <div key={r.id} className={`bg-white rounded-xl border p-3.5 shadow-sm ${isDone ? 'border-gray-200' : 'border-red-100'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[13px] font-bold text-gray-900">{r.guest_name} · Room {r.room_number} · {r.pax} pax</p>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${isDone ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                          {isDone ? '✓ COMPLETED' : '✕ CANCELLED'}
                        </span>
                      </div>
                      <p className="text-[12px] text-gray-500">{r.destination} · {r.date || 'No date'} {r.time || ''}</p>
                      {(r.airline || r.terminal || r.callback_number) && (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {r.airline && <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[10px] font-bold text-blue-700">{r.airline}</span>}
                          {r.terminal && <span className="px-2 py-0.5 rounded-md bg-purple-50 text-[10px] font-bold text-purple-700">Terminal {r.terminal}</span>}
                          {r.callback_number && <span className="px-2 py-0.5 rounded-md bg-green-50 text-[10px] font-bold text-green-700">📞 {r.callback_number}</span>}
                        </div>
                      )}
                      {r.assigned_driver_name && <p className="text-[10px] text-gray-400 mt-1">Driver: {r.assigned_driver_name}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Cruise Calendar Panel ───────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CruiseCalendarPanel({ hotelId, isAdmin }: { hotelId: string; isAdmin: boolean }) {
  const [schedules, setSchedules] = useState<CruiseSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ship_name: '', cruise_line: '', terminal: '', departure_date: '', departure_time: '', notes: '' });
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const data = await getCruiseSchedulesAll(hotelId);
    setSchedules(data);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!form.ship_name || !form.departure_date || !form.departure_time) return;
    setAdding(true);
    await createCruiseSchedule({ hotel_id: hotelId, ...form });
    setForm({ ship_name: '', cruise_line: '', terminal: '', departure_date: '', departure_time: '', notes: '' });
    await load();
    setAdding(false);
  };

  if (loading) return <div className="text-center py-12"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  const today = localDateStr();
  const upcoming = schedules.filter(s => s.departure_date >= today);
  const past = schedules.filter(s => s.departure_date < today);

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-extrabold text-[15px] mb-3">+ Add Cruise Schedule</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Ship Name *</label>
              <input value={form.ship_name} onChange={e => setForm({ ...form, ship_name: e.target.value })} placeholder="e.g. Harmony of the Seas"
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Cruise Line</label>
              <input value={form.cruise_line} onChange={e => setForm({ ...form, cruise_line: e.target.value })} placeholder="e.g. Royal Caribbean"
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Terminal</label>
              <input value={form.terminal} onChange={e => setForm({ ...form, terminal: e.target.value })} placeholder="e.g. Terminal D"
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Departure Date *</label>
              <input type="date" value={form.departure_date} onChange={e => setForm({ ...form, departure_date: e.target.value })}
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Departure Time *</label>
              <input type="time" value={form.departure_time} onChange={e => setForm({ ...form, departure_time: e.target.value })}
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Notes</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Pier, parking, check-in info..."
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            </div>
          </div>
          <button onClick={handleAdd} disabled={adding || !form.ship_name || !form.departure_date || !form.departure_time}
            className="mt-4 px-5 py-2.5 rounded-xl text-white font-semibold text-[13px] disabled:opacity-40"
            style={{ backgroundColor: TEAL }}>
            {adding ? 'Adding...' : 'Add to Calendar'}
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <span className="text-[18px]">🚢</span>
          <h3 className="font-extrabold text-[15px]">Upcoming Departures ({upcoming.length})</h3>
        </div>
        {upcoming.length === 0 ? (
          <div className="px-5 py-8 text-center"><p className="text-[13px] text-gray-400">No upcoming cruises scheduled.</p></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {upcoming.map(s => (
              <div key={s.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{s.cruise_line || 'Cruise'}</span>
                    {s.terminal && <span className="text-[11px] text-gray-400">{s.terminal}</span>}
                  </div>
                  <p className="text-[15px] font-bold text-gray-900">{s.ship_name}</p>
                  <p className="text-[13px] text-gray-600">
                    {new Date(s.departure_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {s.departure_time.slice(0, 5)}
                  </p>
                  {s.notes && <p className="text-[11px] text-gray-400 mt-0.5">{s.notes}</p>}
                </div>
                {isAdmin && (
                  <button onClick={async () => { await deleteCruiseSchedule(s.id); load(); }}
                    className="text-red-400 hover:text-red-600 shrink-0"><Trash2 size={14} /></button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <details className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <summary className="text-[13px] font-bold text-gray-500 cursor-pointer">Past Departures ({past.length})</summary>
          <div className="space-y-2 mt-3">
            {past.map(s => (
              <div key={s.id} className="flex items-center justify-between text-[12px] py-1">
                <span className="text-gray-500">{s.ship_name} · {s.departure_date} {s.departure_time.slice(0,5)}</span>
                {isAdmin && (
                  <button onClick={async () => { await deleteCruiseSchedule(s.id); load(); }} className="text-red-400 text-[11px]">Remove</button>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/* ── Vendor Dashboard ────────────────────────────────────── */
function VendorDashboard({ hotelId, vendorType, vendorName }: { hotelId: string; vendorType: string; vendorName: string }) {
  const isShuttle = vendorType === 'shuttle' || vendorType === 'taxi';
  const isCatering = vendorType === 'catering' || vendorType === 'restaurant';

  return (
    <div>
      {isShuttle && <ShuttleVendorView hotelId={hotelId} vendorName={vendorName} vendorType={vendorType} />}
      {isCatering && <RestaurantVendorView hotelId={hotelId} vendorName={vendorName} />}
      {!isShuttle && !isCatering && <GeneralVendorView hotelId={hotelId} vendorName={vendorName} vendorType={vendorType} />}
    </div>
  );
}

function ShuttleVendorView({ hotelId, vendorName, vendorType }: { hotelId: string; vendorName: string; vendorType: string }) {
  const [bookings, setBookings] = useState<ShuttleBooking[]>([]);
  const [slots, setSlots] = useState<ShuttleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [allBookings, allSlots] = await Promise.all([
      getAllShuttleBookingsForHotel(hotelId),
      getAllShuttleSlotsForHotel(hotelId),
    ]);
    setBookings(allBookings);
    setSlots(allSlots);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-center py-12"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  const today = localDateStr();
  const slotMap = Object.fromEntries(slots.map(s => [s.id, s]));
  const filteredBookings = bookings.filter(b => {
    if (!dateFilter) return true;
    const slot = slotMap[b.slot_id];
    return (slot?.date || today) === dateFilter;
  });
  const totalPax = filteredBookings.reduce((sum, b) => sum + (b.pax || 1), 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-extrabold text-gray-900">Passenger Manifest</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{vendorName} · {vendorType} operator</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-[12px] font-semibold">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-gray-400 uppercase font-bold">Total Bookings</p>
          <p className="text-[28px] font-extrabold text-teal-600">{filteredBookings.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-gray-400 uppercase font-bold">Passengers</p>
          <p className="text-[28px] font-extrabold text-blue-600">{totalPax}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-gray-400 uppercase font-bold">Routes Active</p>
          <p className="text-[28px] font-extrabold text-gray-700">{slots.length}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-[13px] outline-none" />
        {dateFilter && <button onClick={() => setDateFilter('')} className="text-[12px] text-gray-400">Clear</button>}
        <span className="text-[12px] text-gray-400">{dateFilter ? `Showing ${dateFilter}` : 'All bookings'}</span>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-bold text-[14px]">Booking List ({filteredBookings.length})</h3>
        </div>
        {filteredBookings.length === 0 ? (
          <div className="px-5 py-8 text-center"><p className="text-[13px] text-gray-400">No bookings found.</p></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredBookings.map((b, i) => {
              const slot = slotMap[b.slot_id];
              return (
                <div key={b.id} className="px-5 py-3 flex items-center gap-4">
                  <span className="text-[12px] font-bold text-gray-400 w-6">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-[14px] font-bold text-gray-900">{b.guest_name}</p>
                    <p className="text-[11px] text-gray-500">Room {b.room_number} · {b.pax} pax{b.notes ? ` · ${b.notes}` : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold text-gray-700">{slot?.route_name || b.route_name || '—'}</p>
                    <p className="text-[11px] text-gray-400">{slot?.departure_time?.slice(0,5) || '—'}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                    {b.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function RestaurantVendorView({ hotelId, vendorName }: { hotelId: string; vendorName: string }) {
  const [orders, setOrders] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('requests')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('type', 'Food Order')
      .order('created_at', { ascending: false });
    setOrders((data || []) as Request[]);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string) => {
    await updateRequestStatus(id, status);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: status as Request['status'] } : o));
  };

  if (loading) return <div className="text-center py-12"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  const pending = orders.filter(o => o.status === 'pending');
  const inProgress = orders.filter(o => o.status === 'in-progress');
  const completed = orders.filter(o => o.status === 'completed');

  const OrderCard = ({ order }: { order: Request }) => (
    <div className={`bg-white rounded-2xl border shadow-sm p-4 ${order.status === 'pending' ? 'border-amber-300' : order.status === 'in-progress' ? 'border-teal-300' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-[14px] font-bold text-gray-900">{order.guest_name}</p>
          <p className="text-[11px] text-gray-500">Room {order.room} · {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${order.status === 'pending' ? 'bg-amber-100 text-amber-700' : order.status === 'in-progress' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500'}`}>
          {order.status}
        </span>
      </div>
      <p className="text-[13px] text-gray-700 mb-3 line-clamp-2">{order.details}</p>
      <div className="flex gap-2">
        {order.status === 'pending' && (
          <button onClick={() => updateStatus(order.id, 'in-progress')}
            className="flex-1 py-2 rounded-xl text-white text-[12px] font-bold" style={{ backgroundColor: TEAL }}>
            Start Preparing
          </button>
        )}
        {order.status === 'in-progress' && (
          <button onClick={() => updateStatus(order.id, 'completed')}
            className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-[12px] font-bold">
            Mark Delivered
          </button>
        )}
        {order.status === 'completed' && (
          <span className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-400 text-[12px] font-bold text-center">Delivered</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-extrabold text-gray-900">Incoming Orders</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{vendorName} · Food & Beverage</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-[12px] font-semibold">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
          <p className="text-[11px] text-amber-500 uppercase font-bold">Pending</p>
          <p className="text-[28px] font-extrabold text-amber-600">{pending.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-teal-200 p-4 shadow-sm">
          <p className="text-[11px] text-teal-500 uppercase font-bold">Preparing</p>
          <p className="text-[28px] font-extrabold text-teal-600">{inProgress.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-gray-400 uppercase font-bold">Delivered Today</p>
          <p className="text-[28px] font-extrabold text-gray-700">{completed.length}</p>
        </div>
      </div>
      {orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <UtensilsCrossed size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-gray-400">No orders yet</p>
          <p className="text-[12px] text-gray-300 mt-1">New orders will appear here in real time</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.length > 0 && (
            <>
              <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Pending ({pending.length})</p>
              {pending.map(o => <OrderCard key={o.id} order={o} />)}
            </>
          )}
          {inProgress.length > 0 && (
            <>
              <p className="text-[11px] font-bold text-teal-600 uppercase tracking-wider mt-4">Preparing ({inProgress.length})</p>
              {inProgress.map(o => <OrderCard key={o.id} order={o} />)}
            </>
          )}
          {completed.length > 0 && (
            <>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-4">Delivered ({completed.length})</p>
              {completed.map(o => <OrderCard key={o.id} order={o} />)}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function GeneralVendorView({ hotelId, vendorName, vendorType }: { hotelId: string; vendorName: string; vendorType: string }) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('requests')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false })
      .limit(50);
    setRequests((data || []) as Request[]);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-center py-12"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  const pending = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-extrabold text-gray-900">Vendor Dashboard</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{vendorName} · {vendorType}</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-[12px] font-semibold">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-gray-400 uppercase font-bold">Total Requests</p>
          <p className="text-[28px] font-extrabold text-teal-600">{requests.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
          <p className="text-[11px] text-amber-500 uppercase font-bold">Pending</p>
          <p className="text-[28px] font-extrabold text-amber-600">{pending}</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-bold text-[14px]">Recent Requests</h3>
        </div>
        {requests.length === 0 ? (
          <div className="px-5 py-8 text-center"><p className="text-[13px] text-gray-400">No requests yet.</p></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {requests.map(r => (
              <div key={r.id} className="px-5 py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[14px] font-bold text-gray-900">{r.guest_name} — Room {r.room}</p>
                    <p className="text-[12px] text-gray-500 mt-0.5">{r.type} · {r.details?.slice(0, 60)}{r.details?.length > 60 ? '…' : ''}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${r.status === 'pending' ? 'bg-amber-100 text-amber-700' : r.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Guest Home Preview ─────────────────────────────────── */
function GuestHomePreview({ color, hotelName }: { color: string; hotelName: string }) {
  const tiles = [
    { label: 'WELCOME', filled: true },
    { label: 'TRANSPORT', filled: false },
    { label: 'FACILITIES', filled: false },
    { label: 'MESSAGE', filled: false },
  ];
  return (
    <div className="relative mx-auto" style={{ width: 200, height: 400 }}>
      {/* Phone frame */}
      <div className="absolute inset-0 rounded-[28px] border-[6px] border-gray-800 bg-[#F4F4F5] overflow-hidden shadow-2xl">
        {/* Status bar */}
        <div className="bg-white px-3 pt-2 pb-1">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[9px] font-black text-black leading-none">Hello!</div>
              <div className="text-[6px] text-gray-400 mt-0.5">What do you need today?</div>
            </div>
            <div className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            </div>
          </div>
        </div>
        {/* 2×2 grid */}
        <div className="grid grid-cols-2 gap-1 p-1.5 h-[160px]">
          {tiles.map((t) => (
            <div
              key={t.label}
              className="rounded-xl flex items-center justify-center text-[6px] font-bold tracking-wider"
              style={t.filled
                ? { backgroundColor: color, color: 'white' }
                : { backgroundColor: 'white', color, border: '1px solid #e5e7eb' }}
            >
              {t.label}
            </div>
          ))}
        </div>
        {/* Rewards banner */}
        <div className="mx-1.5 rounded-xl overflow-hidden" style={{ height: 44, backgroundColor: color, opacity: 0.15 }}>
          <div className="flex items-end h-full px-2 pb-1">
            <span className="text-[6px] font-bold" style={{ color }}>LOYALTY REWARDS</span>
          </div>
        </div>
        {/* Bottom row */}
        <div className="flex gap-1 p-1.5 mt-1" style={{ height: 70 }}>
          <div className="w-[38%] rounded-xl bg-white border border-gray-200 flex items-center justify-center">
            <span className="text-[5px] font-bold" style={{ color }}>NEARBY</span>
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex-1 rounded-xl flex items-center justify-center" style={{ backgroundColor: color }}>
              <span className="text-[5px] font-bold text-white">FOOD</span>
            </div>
            <div className="flex-1 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
              <span className="text-[5px] font-bold" style={{ color }}>REVIEW</span>
            </div>
          </div>
        </div>
        {/* Hotel name chip */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-center">
          <div className="px-2 py-0.5 rounded-full text-white text-[5px] font-bold" style={{ backgroundColor: color }}>
            {hotelName || 'Your Hotel'}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Hotel Settings View ────────────────────────────────── */
/* ── Properties View ──────────────────────────────────────── */
function PropertiesView({ onSwitchHotel }: { onSwitchHotel: (slug: string) => void }) {
  const [hotels, setHotels] = useState<{ id: string; slug: string; name: string; brand: string }[]>([]);
  const [form, setForm] = useState({ slug: '', name: '', adminEmail: '', propertyType: 'Hotel' });
  const [copied, setCopied] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const adminFetch = async (action: string, body: any) => {
    const res = await fetch('/api/superadmin-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
      body: JSON.stringify({ action, data: body }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Request failed');
    return json;
  };

  useEffect(() => {
    adminFetch('list_hotels', {}).then(json => setHotels(json.hotels || [])).catch(() => {});
  }, []);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://attenda.vercel.app';
  const getGuestUrl = (slug: string) => `${baseUrl}/?hotel=${slug}`;
  const getAdminUrl = (slug: string) => `${baseUrl}/staff?hotel=${slug}`;

  const handleCreate = async () => {
    if (!form.slug || !form.name) return;
    setCreating(true);
    try {
      const json = await adminFetch('create_hotel', {
        slug: form.slug, name: form.name, adminEmail: form.adminEmail || undefined, propertyType: form.propertyType,
      });
      const hotel = json.hotel;
      if (form.adminEmail && hotel) {
        const origin = window.location.origin;
        await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
          body: JSON.stringify({
            type: 'tenant_onboarding',
            data: {
              hotelName: form.name,
              slug: form.slug,
              adminEmail: form.adminEmail,
              guestUrl: `${origin}/?hotel=${form.slug}`,
              adminUrl: `${origin}/staff?hotel=${form.slug}`,
            },
          }),
        });
      }
      setForm({ slug: '', name: '', adminEmail: '', propertyType: 'Hotel' });
      const refreshed = await adminFetch('list_hotels', {});
      setHotels(refreshed.hotels || []);
    } catch (e: unknown) {
      const msg = (e instanceof Error ? e.message : '') || (typeof e === 'object' && e !== null && 'message' in e ? String((e as { message: unknown }).message) : '');
      alert(msg.includes('unique') || msg.includes('duplicate') ? 'Slug already in use. Try a different one.' : msg || 'Failed to create hotel. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-[26px] font-extrabold text-gray-900">All Properties</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">{hotels.length} propert{hotels.length !== 1 ? 'ies' : 'y'} on this platform.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 shadow-sm">
        <h3 className="font-bold text-[14px] mb-4">Create New Property</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Property Name *" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Miami Airport Hotel" />
          <Field label="URL Slug *" value={form.slug} onChange={v => setForm({ ...form, slug: v.toLowerCase().replace(/\s+/g, '-') })} placeholder="miami-airport" />
          <div className="col-span-2">
            <Field label="Admin Email (optional — for onboarding email)" value={form.adminEmail} onChange={v => setForm({ ...form, adminEmail: v })} placeholder="manager@property.com" />
          </div>
          <div className="col-start-1">
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Property Type</label>
            <select
              value={form.propertyType}
              onChange={e => setForm({ ...form, propertyType: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-[13px] text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
              <option value="Hotel">Hotel</option>
              <option value="Short-Term Rental">Short-Term Rental</option>
              <option value="Motel">Motel</option>
              <option value="Vacation Rental">Vacation Rental</option>
              <option value="Boutique Stay">Boutique Stay</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        {form.slug && (
          <p className="text-[11px] text-gray-400 mb-3 font-mono">Guest URL preview: {getGuestUrl(form.slug)}</p>
        )}
        <button onClick={handleCreate} disabled={creating}
          className="px-6 py-3 rounded-xl text-white font-semibold text-[13px] disabled:opacity-60" style={{ backgroundColor: TEAL }}>
          {creating ? 'Creating...' : 'CREATE PROPERTY'}
        </button>
      </div>

      <div className="space-y-4">
        {hotels.map(hotel => {
          const guestUrl = getGuestUrl(hotel.slug);
          const adminUrl = getAdminUrl(hotel.slug);
          return (
            <div key={hotel.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div>
                    <p className="font-extrabold text-[16px] text-gray-900">{hotel.name}</p>
                    <p className="text-[12px] text-gray-400 font-mono mt-0.5">@{hotel.slug}</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide shrink-0 mt-1"
                    style={{ backgroundColor: `${TEAL}15`, color: TEAL }}>
                    {hotel.brand || 'Hotel'}
                  </span>
                </div>
                <button onClick={() => onSwitchHotel(hotel.slug)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold shrink-0"
                  style={{ backgroundColor: `${TEAL}15`, color: TEAL }}>
                  Manage
                </button>
              </div>

              <div className="space-y-2">
                {([
                  { label: 'Guest App URL', url: guestUrl, id: hotel.id + '-guest', note: 'Share with guests or embed in QR code' },
                  { label: 'Admin / Staff URL', url: adminUrl, id: hotel.id + '-admin', note: 'Send to hotel admin • Admin PIN: 2025' },
                ] as const).map(({ label, url, id, note }) => (
                  <div key={id} className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                      <p className="text-[12px] text-gray-700 font-mono truncate mt-0.5">{url}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{note}</p>
                    </div>
                    <button onClick={() => handleCopy(url, id)}
                      className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold"
                      style={{ backgroundColor: `${TEAL}15`, color: TEAL }}>
                      {copied === id ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy</>}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Shared UI Helpers ──────────────────────────────────── */
function Section({ title, Icon, children }: {
  title: string;
  Icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} style={{ color: TEAL }} />
        <h3 className="font-bold text-[14px]">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none"
      />
    </div>
  );
}
/* ── Guests View ──────────────────────────────────────── */
interface GuestSessionData {
  name: string;
  room: string;
  checkout: string;
  checkedIn: string;
  validationStatus?: 'pending' | 'confirmed';
  validatedAt?: string;
  lastSeen?: string;
}

function GuestsView({ hotelId }: { hotelId: string }) {
  const [guests, setGuests] = useState<GuestSessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed'>('all');

  const loadGuests = useCallback(async () => {
    const guestList: GuestSessionData[] = [];

    // Fetch from database (guests table)
    try {
      const dbGuests = await getGuestValidations(hotelId);
      dbGuests.forEach(g => {
        guestList.push({
          name: g.name,
          room: g.room,
          checkout: '',
          checkedIn: g.validatedAt,
          validationStatus: 'confirmed',
          validatedAt: g.validatedAt,
          lastSeen: g.validatedAt,
        });
      });
    } catch (err) {
      console.error('Error loading guest validations from DB:', err);
    }

    // Also check localStorage for current session
    const stored = localStorage.getItem('guestSession');
    if (stored) {
      try {
        const session = JSON.parse(stored);
        const existing = guestList.findIndex(g => g.name === session.name && g.room === session.room);
        if (existing >= 0) {
          // Merge — localStorage session may have a more recent validation status
          if (session.validationStatus === 'confirmed') {
            guestList[existing].validationStatus = 'confirmed';
            guestList[existing].validatedAt = session.validatedAt || guestList[existing].validatedAt;
          }
        } else {
          guestList.push({
            name: session.name,
            room: session.room,
            checkout: session.checkout || '',
            checkedIn: session.checkedIn || '',
            validationStatus: session.validationStatus || 'pending',
            validatedAt: session.validatedAt,
            lastSeen: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('Error parsing guest session:', err);
      }
    }

    // Also get guests from recent requests
    try {
      const { data } = await supabase
        .from('requests')
        .select('guest_name, room')
        .eq('hotel_id', hotelId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) {
        data.forEach((r: { guest_name: string; room: string }) => {
          const existing = guestList.findIndex(g => g.name === r.guest_name && g.room === r.room);
          if (existing < 0) {
            guestList.push({
              name: r.guest_name,
              room: r.room,
              checkout: '',
              checkedIn: '',
              validationStatus: 'pending',
              lastSeen: new Date().toISOString(),
            });
          }
        });
      }
    } catch (err) {
      console.error('Error loading guests from requests:', err);
    }

    setGuests(guestList);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => {
    loadGuests();
    // Subscribe to localStorage changes for real-time updates
    const handleStorage = () => loadGuests();
    window.addEventListener('storage', handleStorage);
    // Subscribe to Realtime for guest_validations changes instead of polling
    const channel = supabase
      .channel(`guest_validations_${hotelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guest_validations', filter: `hotel_id=eq.${hotelId}` }, () => {
        loadGuests();
      })
      .subscribe();
    return () => {
      window.removeEventListener('storage', handleStorage);
      supabase.removeChannel(channel);
    };
  }, [loadGuests, hotelId]);

  const confirmGuest = async (guest: GuestSessionData) => {
    // Write to database so it persists across devices
    if (hotelId) {
      try {
        await upsertGuestValidation(hotelId, guest.name, guest.room, new Date().toISOString());
      } catch (err) {
        console.error('Error writing guest validation to DB:', err);
      }
    }
    // Update localStorage if it's the current session
    const stored = localStorage.getItem('guestSession');
    if (stored) {
      try {
        const session = JSON.parse(stored);
        if (session.name === guest.name && session.room === guest.room) {
          session.validationStatus = 'confirmed';
          session.validatedAt = new Date().toISOString();
          localStorage.setItem('guestSession', JSON.stringify(session));
          // Broadcast to other tabs
          window.dispatchEvent(new StorageEvent('storage'));
        }
      } catch (err) {
        console.error('Error confirming guest:', err);
      }
    }
    loadGuests();
  };

  const filteredGuests = guests.filter(g => {
    if (filter === 'pending') return g.validationStatus !== 'confirmed';
    if (filter === 'confirmed') return g.validationStatus === 'confirmed';
    return true;
  });

  const confirmedCount = guests.filter(g => g.validationStatus === 'confirmed').length;
  const pendingCount = guests.length - confirmedCount;

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px] font-extrabold text-gray-900">Guest Check-ins</h1>
        <button onClick={loadGuests} className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-gray-600 hover:bg-gray-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-gray-400 uppercase font-bold">Total Guests</p>
          <p className="text-[28px] font-extrabold text-gray-900">{guests.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-amber-500 uppercase font-bold">Pending</p>
          <p className="text-[28px] font-extrabold text-amber-600">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-emerald-500 uppercase font-bold">Confirmed</p>
          <p className="text-[28px] font-extrabold text-emerald-600">{confirmedCount}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(['all', 'pending', 'confirmed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${
              filter === f
                ? 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'All Guests' : f === 'pending' ? 'Pending' : 'Confirmed'}
          </button>
        ))}
      </div>

      {/* Guest List */}
      <div className="space-y-3">
        {filteredGuests.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
            <Users size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-[13px] text-gray-500">No guests found.</p>
          </div>
        ) : (
          filteredGuests.map((guest, i) => (
            <div
              key={`${guest.name}-${guest.room}-${i}`}
              className={`bg-white rounded-xl border p-5 shadow-sm transition-all ${
                guest.validationStatus === 'confirmed'
                  ? 'border-gray-200'
                  : 'border-l-4 border-l-amber-400 border-r border-t border-b border-amber-100 animate-pulse'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${
                      guest.validationStatus === 'confirmed' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`} />
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${
                      guest.validationStatus === 'confirmed' ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {guest.validationStatus === 'confirmed' ? 'Validated' : 'Pending Validation'}
                    </span>
                  </div>
                  <p className="text-[16px] font-bold text-gray-900">{guest.name}</p>
                  <p className="text-[13px] text-gray-500">Room {guest.room}</p>
                  {guest.checkout && (
                    <p className="text-[12px] text-gray-400 mt-1">
                      Checkout: {new Date(guest.checkout).toLocaleDateString()}
                    </p>
                  )}
                  {guest.validatedAt && (
                    <p className="text-[11px] text-emerald-600 mt-1">
                      Confirmed at {new Date(guest.validatedAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {guest.validationStatus !== 'confirmed' ? (
                    <button
                      onClick={() => confirmGuest(guest)}
                      className="px-4 py-2 rounded-lg text-white text-[12px] font-bold bg-emerald-500 hover:bg-emerald-600 transition-colors"
                    >
                      Confirm Guest
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-[12px] font-bold">
                      ✓ Confirmed
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info Note */}
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-[13px] text-amber-800">
          <strong>Note:</strong> Since PMS integration is not yet active, guests show as &quot;Pending&quot; until manually confirmed by staff.
          Guests can still use the app while pending, but they will need to validate before placing orders or booking transport.
        </p>
      </div>
    </div>
  );
}

/* ── Rooms View (Bulk upload + management) ───────────────── */
/* ── Front Desk View ──────────────────────────────────── */
function PropertyInfoView({ config }: { config: HotelConfig }) {
  const items = [
    { label: 'Property Name', value: config.name, icon: HotelIcon },
    { label: 'Manager', value: config.managerName, icon: Users },
    { label: 'Address', value: config.address, icon: MapPin },
    { label: 'Front Desk Phone', value: config.frontDeskPhone, icon: Phone },
    { label: 'WiFi Network', value: config.wifiName, icon: Wifi },
    { label: 'WiFi Password', value: config.wifiPassword, icon: Lock },
    { label: 'Website', value: config.websiteUrl, icon: ExternalLink, link: true },
  ].filter(i => i.value);

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-[22px] font-extrabold text-gray-900 mb-1">Property Info</h1>
      <p className="text-[13px] text-gray-500 mb-6">Quick reference for {config.name}</p>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${TEAL}15` }}>
              <item.icon size={18} style={{ color: TEAL }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{item.label}</p>
              {item.link ? (
                <a href={item.value} target="_blank" rel="noopener noreferrer" className="text-[14px] font-semibold text-blue-600 hover:underline break-all">{item.value}</a>
              ) : (
                <p className="text-[14px] font-semibold text-gray-900 break-all">{item.value}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Local calendar date as YYYY-MM-DD (never UTC — avoids the ~7pm rollover bug).
function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
// Week helpers
function getWeekStart(date: string, weekStartsOn?: string): string {
  const d = new Date(date + 'T00:00:00');
  const day = d.getDay(); // 0=Sun
  if (weekStartsOn === 'Monday') {
    const monOffset = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - monOffset);
  } else {
    d.setDate(d.getDate() - day);
  }
  return localDateStr(d);
}
function getWeekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}
function addDays(date: string, n: number): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}
function dayName(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
}
function dayMonth(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}
function formatHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}
function formatDateRange(a: string, b: string): string {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return `${da.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${db.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

// Default coverage rules used by the forecast form
const DEFAULT_COVERAGE_RULES: CoverageRule[] = [
  { department: 'front_desk',   position: 'Front Desk Agent',  ratio: 30, min_staff: 1, max_staff: 4, start_time: '07:00', end_time: '23:00' },
  { department: 'housekeeping', position: 'Housekeeper',       ratio: 15, min_staff: 2, max_staff: 8, start_time: '08:00', end_time: '16:00' },
  { department: 'maintenance',  position: 'Maintenance Tech',  ratio: 50, min_staff: 1, max_staff: 3, start_time: '08:00', end_time: '17:00' },
  { department: 'security',     position: 'Security Officer',  ratio: 60, min_staff: 1, max_staff: 2, start_time: '22:00', end_time: '06:00' },
  { department: 'drivers',      position: 'Shuttle Driver',    ratio: 40, min_staff: 0, max_staff: 3, start_time: '06:00', end_time: '22:00' },
  { department: 'management',   position: 'Manager on Duty',   ratio: 80, min_staff: 1, max_staff: 2, start_time: '08:00', end_time: '20:00' },
];

/* ── Checklists Tab View ─────────────────────────────── */
function ChecklistsTabView({ hotelId, isAdmin }: { hotelId: string; isAdmin: boolean }) {
  const [templates, setTemplates] = useState<Checklist[]>([]);
  const [instances, setInstances] = useState<ChecklistInstance[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newItems, setNewItems] = useState('');
  const [newDept, setNewDept] = useState<DepartmentKey>('front_desk');
  const [openDept, setOpenDept] = useState<DepartmentKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const [t, i] = await Promise.all([getChecklists(hotelId), getChecklistInstances(hotelId)]);
    setTemplates(t || []);
    setInstances(i || []);
  };
  useEffect(() => { load(); }, [hotelId]);

  const today = localDateStr();

  const create = async () => {
    if (!newName.trim()) return;
    setSubmitting(true); setError(null);
    const items = newItems.split('\n').filter(Boolean).map((label, i) => ({ id: `item-${i}`, label: label.trim() }));
    const { error: err } = await supabase.from('staff_checklists').insert({
      hotel_id: hotelId,
      name: newName.trim(),
      items,
      department: newDept,
      is_active: true,
      assigned_role: 'staff',
    });
    if (err) { setError(err.message); setSubmitting(false); return; }
    setNewName(''); setNewItems(''); setNewDept('front_desk'); setShowNew(false);
    await load();
    setSubmitting(false);
  };

  const startInstance = async (templateId: string) => {
    setSubmitting(true); setError(null);
    const { error: err } = await supabase.from('staff_checklist_instances').insert({
      checklist_id: templateId,
      hotel_id: hotelId,
      staff_name: sessionStorage.getItem('attenda_session_name') || 'Staff',
      shift_date: today,
      checked_items: [],
      completed: false,
    });
    if (err) { setError(err.message); setSubmitting(false); return; }
    await load();
    setSubmitting(false);
  };

  const toggleItem = async (instanceId: string, itemId: string, currentlyChecked: boolean) => {
    const inst = instances.find(i => i.id === instanceId);
    if (!inst) return;
    const newChecked = currentlyChecked
      ? inst.checked_items.filter(x => x.item_id !== itemId)
      : [...inst.checked_items, { item_id: itemId, checked_at: new Date().toISOString() }];
    const tpl = templates.find(t => t.id === inst.checklist_id);
    const completed = newChecked.length === (tpl?.items.length || 0);
    await supabase.from('staff_checklist_instances').update({
      checked_items: newChecked,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    }).eq('id', instanceId);
    await load();
  };

  const removeTemplate = async (id: string) => {
    if (!confirm('Delete this checklist template?')) return;
    await deleteChecklist(id);
    load();
  };

  // Build a map of templates by department
  const templatesByDept: Record<string, Checklist[]> = {};
  templates.filter(t => t.is_active !== false).forEach(t => {
    const k = t.department || 'front_desk';
    (templatesByDept[k] = templatesByDept[k] || []).push(t);
  });

  // Today's instance per template (most recent if multiple)
  const todaysInstanceFor = (templateId: string) =>
    instances
      .filter(i => i.checklist_id === templateId && i.shift_date === today)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0];

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-extrabold text-gray-900">Checklists</h1>
          <p className="text-[13px] text-gray-500">Today&apos;s tasks by department</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-[12px] font-bold" style={{ backgroundColor: TEAL }}>
            <Plus size={14} /> New
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-[12px] rounded-xl px-4 py-3 mb-4">{error}</div>}

      {/* Department sections — click to expand and see today's checklist */}
      <div className="space-y-3">
        {DEPARTMENTS.map(dept => {
          const deptTemplates = templatesByDept[dept.key] || [];
          const open = openDept === dept.key;
          return (
            <div key={dept.key} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setOpenDept(open ? null : dept.key)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[20px]">{dept.icon}</span>
                  <div className="text-left">
                    <p className="text-[14px] font-bold text-gray-900">{dept.label}</p>
                    <p className="text-[11px] text-gray-500">
                      {deptTemplates.length} checklist{deptTemplates.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <ChevronDown size={18} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>

              {open && (
                <div className="border-t border-gray-100 divide-y divide-gray-100">
                  {deptTemplates.length === 0 ? (
                    <p className="text-[12px] text-gray-400 px-4 py-4">No checklists for {dept.label} yet. {isAdmin ? 'Create one above.' : 'Ask your manager to add one.'}</p>
                  ) : (
                    deptTemplates.map(tpl => {
                      const inst = todaysInstanceFor(tpl.id);
                      const totalItems = tpl.items?.length || 0;
                      const doneCount = inst?.checked_items.length || 0;
                      return (
                        <div key={tpl.id} className="px-4 py-3">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-[14px] font-semibold text-gray-900">{tpl.name}</p>
                              <p className="text-[11px] text-gray-500">
                                {totalItems} item{totalItems === 1 ? '' : 's'}
                                {inst ? ` · ${doneCount}/${totalItems} done` : ' · not started'}
                              </p>
                            </div>
                            {isAdmin ? (
                              <button onClick={() => removeTemplate(tpl.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                                <Trash2 size={14} />
                              </button>
                            ) : !inst && totalItems > 0 ? (
                              <button onClick={() => startInstance(tpl.id)} disabled={submitting} className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ backgroundColor: TEAL }}>
                                Start
                              </button>
                            ) : inst?.completed ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Done</span>
                            ) : inst ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">In Progress</span>
                            ) : null}
                          </div>

                          {/* Progress bar */}
                          {inst && totalItems > 0 && (
                            <div className="bg-gray-100 rounded-full h-1.5 mb-3">
                              <div className="h-1.5 rounded-full transition-all" style={{ width: `${(doneCount / totalItems) * 100}%`, backgroundColor: TEAL }} />
                            </div>
                          )}

                          {/* Items — only show for staff once they start the checklist, or for admin always */}
                          {(inst || isAdmin) && totalItems > 0 && (
                            <div className="space-y-1">
                              {tpl.items.map(item => {
                                const isChecked = !!inst?.checked_items.find(x => x.item_id === item.id);
                                return (
                                  <label key={item.id} className="flex items-center gap-2.5 py-1.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => inst && toggleItem(inst.id, item.id, isChecked)}
                                      disabled={!inst || submitting}
                                      className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                                      style={{ accentColor: TEAL }}
                                    />
                                    <span className={`text-[13px] ${isChecked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                      {item.label}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}

                          {/* Admin: no-instance preview of items */}
                          {!inst && isAdmin && totalItems > 0 && (
                            <p className="text-[11px] text-gray-400 mt-1">Staff will start and check these off as they work.</p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Admin: new checklist template modal */}
      {showNew && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setShowNew(false)}>
          <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-bold">New Checklist Template</h2>
              <button onClick={() => setShowNew(false)} className="p-1 text-gray-400 hover:text-gray-600"><XIcon size={18} /></button>
            </div>
            <p className="text-[12px] text-gray-500 mb-4">Name the checklist and pick a department. Add items next (one per line).</p>
            <div className="space-y-3">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Morning Room Check" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100" autoFocus />
              <select value={newDept} onChange={e => setNewDept(e.target.value as DepartmentKey)} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100">
                {DEPARTMENTS.map(d => <option key={d.key} value={d.key}>{d.icon} {d.label}</option>)}
              </select>
              <div>
                <p className="text-[11px] text-gray-400 mb-1 font-medium">Items (one per line)</p>
                <textarea value={newItems} onChange={e => setNewItems(e.target.value)} placeholder="Verify breakfast setup&#10;Inspect pool area&#10;Restock amenities" rows={4} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none resize-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={create} disabled={submitting} className="flex-1 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>{submitting ? 'Saving…' : 'Create'}</button>
                <button onClick={() => setShowNew(false)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-[13px]">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddGuestToSlot({ slotId, routeName, onDone }: { slotId: string; routeName: string; onDone: () => void }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ guest_name: '', room_number: '', pax: '1', notes: '' });
  const [saving, setSaving] = useState(false);
  if (!show) return (
    <button onClick={() => setShow(true)} className="flex items-center gap-1 text-[11px] font-bold text-teal-600 hover:text-teal-800">
      + Add Guest (walk-up)
    </button>
  );
  const save = async () => {
    if (!form.guest_name) return;
    setSaving(true);
    await bookShuttleSlot({ slot_id: slotId, guest_name: form.guest_name, room_number: form.room_number, pax: parseInt(form.pax) || 1, notes: form.notes });
    setForm({ guest_name: '', room_number: '', pax: '1', notes: '' });
    setShow(false);
    onDone();
    setSaving(false);
  };
  return (
    <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
      <p className="text-[10px] font-bold text-gray-500">Add Guest to {routeName}</p>
      <input placeholder="Guest name" value={form.guest_name} onChange={e => setForm(f => ({...f, guest_name: e.target.value}))} className="w-full text-[11px] border rounded px-2 py-1" />
      <div className="flex gap-1">
        <input placeholder="Room" value={form.room_number} onChange={e => setForm(f => ({...f, room_number: e.target.value}))} className="w-20 text-[11px] border rounded px-2 py-1" />
        <input placeholder="Pax" type="number" value={form.pax} onChange={e => setForm(f => ({...f, pax: e.target.value}))} className="w-16 text-[11px] border rounded px-2 py-1" />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={() => setShow(false)} className="text-[11px] text-gray-500">Cancel</button>
        <button onClick={save} disabled={saving} className="text-[11px] font-bold text-teal-600">{saving ? 'Saving…' : 'Add'}</button>
      </div>
    </div>
  );
}

/* ── Learning View ───────────────────────────────────── */
/* ── Learning & HR (combined) ─────────────────────────── */
function ShuttleScheduleView({ hotelId, isAdmin }: { hotelId: string; isAdmin: boolean }) {
  const [slots, setSlots] = useState<(OpsShuttleSlot & { id: string })[]>([]);
  const [config, setConfig] = useState<HotelConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [genMonth, setGenMonth] = useState(localDateStr().slice(0, 7));
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);
  const [form, setForm] = useState<{ day_of_week: number; departure_time: string; pickup_location: string; destination: string; service_type: 'regular' | 'express'; capacity: number; notes: string }>({ day_of_week: 1, departure_time: '08:00', pickup_location: '', destination: '', service_type: 'regular', capacity: 12, notes: '' });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [s, c] = await Promise.all([listShuttleSlots(hotelId), getHotelConfig(hotelId)]);
      setSlots(s || []);
      setConfig(c);
      setLoading(false);
    })();
  }, [hotelId]);

  const save = async () => {
    if (!form.pickup_location) return;
    try {
      await createOps(hotelId, 'shuttle_slot', form, 'active', { guest_name: 'Admin', room: 'SHUTTLE' });
      const s = await listShuttleSlots(hotelId);
      setSlots(s || []);
      setShowAdd(false);
      setForm({ day_of_week: 1, departure_time: '08:00', pickup_location: '', destination: '', service_type: 'regular', capacity: 12, notes: '' });
    } catch {
      alert('Failed to save shuttle slot');
    }
  };

  const del = async (id: string) => {
    if (!confirm('Delete this slot?')) return;
    await deleteOps(id);
    setSlots(slots.filter(s => s.id !== id));
  };

  const generateMonth = async () => {
    if (!config?.hasFreeShuttle) {
      setGenResult('Free shuttle is not enabled. Turn it on in Property Settings first.');
      return;
    }
    const startTime = config.shuttleStartTime?.slice(0, 5);
    const endTime = config.shuttleEndTime?.slice(0, 5);
    if (!startTime || !endTime) {
      setGenResult('Set shuttle start and end times in Property Settings first.');
      return;
    }
    if (!config.shuttleDays || config.shuttleDays.length === 0) {
      setGenResult('Set shuttle days in Property Settings first.');
      return;
    }
    setGenerating(true);
    setGenResult(null);
    try {
      const [year, month] = genMonth.split('-').map(Number);
      const startMin = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
      const endMin = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
      const lastDay = new Date(year, month, 0).getDate();
      let created = 0;
      let skipped = 0;
      for (let d = 1; d <= lastDay; d++) {
        const dt = new Date(year, month - 1, d);
        const dow = dt.getDay(); // 0=Sun..6=Sat
        // Convert 0-6 to our schedule's day_of_week convention (this view uses 0=Sun..6=Sat, matching Date.getDay)
        if (!config.shuttleDays.includes(dow)) { skipped++; continue; }
        for (let m = startMin; m <= endMin; m += 60) {
          const hh = String(Math.floor(m / 60)).padStart(2, '0');
          const mm = String(m % 60).padStart(2, '0');
          // Skip if a slot for this day+time already exists
          const exists = slots.some(s => s.day_of_week === dow && s.departure_time === `${hh}:${mm}:00`);
          if (exists) { skipped++; continue; }
          await createOps(hotelId, 'shuttle_slot', {
            day_of_week: dow,
            departure_time: `${hh}:${mm}:00`,
            pickup_location: config.shuttlePickupLocation || 'Hotel lobby',
            destination: 'Airport',
            service_type: 'regular',
            capacity: config.shuttleCapacity || 8,
            notes: '',
          }, 'active', { guest_name: 'Admin', room: 'SHUTTLE' });
          created++;
        }
      }
      const refreshed = await listShuttleSlots(hotelId);
      setSlots(refreshed || []);
      setGenResult(`Created ${created} slots for ${genMonth}${skipped ? `, skipped ${skipped} duplicates or off-days` : ''}.`);
    } catch (e: any) {
      setGenResult(`Failed: ${e?.message || 'unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="p-4 text-center text-[13px] text-gray-400 py-12">Loading...</div>;

  // Day columns honor the property's "week starts on" setting. The stored
  // day_of_week uses 0=Sun..6=Sat (Date.getDay), so we keep that index in
  // dayIdx and only reorder how the columns are displayed.
  const ALL_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DAY_ORDER = config?.weekStartsOn === 'Monday' ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
  const SERVICE_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
    regular: { bg: 'bg-gray-100', text: 'text-gray-700', ring: 'ring-gray-300' },
    express: { bg: 'bg-gray-900', text: 'text-white', ring: 'ring-gray-700' },
  };

  // Build unique time-slot rows
  const allTimes = Array.from(new Set(slots.map(s => s.departure_time))).sort();

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[20px] font-extrabold text-gray-900">Shuttle Schedule</h1>
          <p className="text-[12px] text-gray-500">Free pickup and drop-off times</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={() => setShowGenerate(true)} disabled={!config?.hasFreeShuttle} className="px-3 py-2 rounded-xl bg-gray-900 text-white font-bold text-[12px] flex items-center gap-1 disabled:opacity-40" title={!config?.hasFreeShuttle ? 'Enable free shuttle in Property Settings first' : 'Auto-fill the month'}>
              <CalendarDays size={14} /> Generate Month
            </button>
            <button onClick={() => setShowAdd(true)} className="px-3 py-2 rounded-xl text-white font-bold text-[12px] flex items-center gap-1" style={{ backgroundColor: TEAL }}>
              <Plus size={14} /> Add Slot
            </button>
          </div>
        )}
      </div>

      {slots.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center">
          <Bus size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[14px] text-gray-500 font-medium">No shuttle slots configured</p>
          {isAdmin && <p className="text-[12px] text-gray-400 mt-1">Tap "Add Slot" to build the weekly grid</p>}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="sticky left-0 z-10 bg-gray-50 text-left p-2 font-bold text-gray-500 uppercase text-[10px] min-w-[80px]">Time</th>
                  {DAY_ORDER.map(dayIdx => <th key={dayIdx} className="text-center p-2 font-bold text-gray-500 uppercase text-[10px] min-w-[110px]">{ALL_DAYS[dayIdx]}</th>)}
                </tr>
              </thead>
              <tbody>
                {allTimes.map(time => (
                  <tr key={time} className="border-b border-gray-100">
                    <td className="sticky left-0 z-10 bg-white p-2 font-bold text-gray-700 text-[11px]">{time}</td>
                    {DAY_ORDER.map(dayIdx => {
                      const cellSlots = slots.filter(s => s.day_of_week === dayIdx && s.departure_time === time);
                      return (
                        <td key={dayIdx} className="p-1 align-top">
                          {cellSlots.map(s => {
                            const c = SERVICE_COLORS[s.service_type] || SERVICE_COLORS.regular;
                            return (
                              <div key={s.id} className={`${c.bg} ${c.text} rounded-lg p-1.5 mb-1 ring-1 ${c.ring} relative group`}>
                                <p className="font-bold text-[10px] leading-tight">{s.pickup_location}</p>
                                {s.notes && <p className="text-[9px] opacity-80 leading-tight mt-0.5">→ {s.notes}</p>}
                                {isAdmin && (
                                  <button onClick={() => del(s.id)} className="absolute -top-1 -right-1 w-4 h-4 bg-gray-900 text-white rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px]">×</button>
                                )}
                              </div>
                            );
                          })}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 ring-1 ring-gray-300"></span><span className="text-gray-600">Regular</span></span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-900 ring-1 ring-gray-700"></span><span className="text-gray-600">Express</span></span>
          </div>
        </div>
      )}

      {showAdd && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setShowAdd(false)}>
          <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-[15px] font-bold mb-4">New Shuttle Slot</h2>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Day</label>
                <div className="grid grid-cols-7 gap-1 mt-1">
                  {DAY_ORDER.map(i => (
                    <button key={i} onClick={() => setForm(p => ({ ...p, day_of_week: i }))} className={`py-2 rounded-lg text-[10px] font-bold ${form.day_of_week === i ? 'text-white' : 'bg-gray-100 text-gray-600'}`} style={form.day_of_week === i ? { backgroundColor: TEAL } : {}}>{ALL_DAYS[i]}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Departure Time</label>
                <input type="time" value={form.departure_time} onChange={e => setForm(p => ({ ...p, departure_time: e.target.value }))} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 mt-1" />
              </div>
              <input value={form.pickup_location} onChange={e => setForm(p => ({ ...p, pickup_location: e.target.value }))} placeholder="Pickup location (e.g. Hotel lobby)" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100" />
              <input value={form.destination} onChange={e => setForm(p => ({ ...p, destination: e.target.value }))} placeholder="Destination (e.g. MIA Airport)" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Service</label>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    {(['regular', 'express'] as const).map(t => (
                      <button key={t} onClick={() => setForm(p => ({ ...p, service_type: t }))} className={`py-2 rounded-xl text-[11px] font-bold border capitalize ${form.service_type === t ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600'}`} style={form.service_type === t ? { backgroundColor: TEAL } : {}}>{t}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Capacity</label>
                  <input type="number" min="1" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: Number(e.target.value) }))} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 mt-1" />
                </div>
              </div>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Notes (optional)" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100" />
              <div className="flex gap-2 pt-2">
                <button onClick={save} disabled={!form.pickup_location} className="flex-1 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>Save</button>
                <button onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-[13px]">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showGenerate && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => { setShowGenerate(false); setGenResult(null); }}>
          <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-[15px] font-bold mb-1">Generate Month of Shuttle Slots</h2>
            <p className="text-[11px] text-gray-500 mb-4">
              Auto-fills every {config?.shuttleDays && config.shuttleDays.length < 7 ? 'selected ' : ''}day from {config?.shuttleStartTime?.slice(0, 5) || '—'} to {config?.shuttleEndTime?.slice(0, 5) || '—'} on the hour. Uses {config?.shuttlePickupLocation || 'Hotel lobby'} → Airport, capacity {config?.shuttleCapacity || 8}. Existing slots are kept; duplicates are skipped.
            </p>

            <label className="text-[10px] font-bold text-gray-500 uppercase">Month</label>
            <input type="month" value={genMonth} onChange={e => setGenMonth(e.target.value)} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 mt-1 mb-4" />

            {genResult && (
              <div className="bg-gray-50 rounded-xl p-3 text-[12px] text-gray-700 mb-3">
                {genResult}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={generateMonth} disabled={generating} className="flex-1 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>
                {generating ? 'Generating…' : 'Generate'}
              </button>
              <button onClick={() => { setShowGenerate(false); setGenResult(null); }} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-[13px]">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── ADMIN CALLOUTS (requests for changes / time off) ─── */
// ADMIN CALLOUTS (requests for changes / time off)
// ============================================================
function AdminCalloutsView({ hotelId }: { hotelId: string }) {
  const [reqs, setReqs] = useState<OpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      setLoading(true);
      const r = await listScheduleChangeRequests(hotelId, 'pending');
      setReqs(r || []);
      setLoading(false);
    })();
  }, [hotelId]);

  const resolve = async (id: string) => {
    await updateOps(id, { status: 'resolved' });
    setReqs(reqs.filter(r => r.id !== id));
  };

  if (loading) return <div className="p-4 text-center text-[13px] text-gray-400 py-12">Loading...</div>;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-4">
        <h1 className="text-[20px] font-extrabold text-gray-900">Staff Callouts</h1>
        <p className="text-[12px] text-gray-500">Requests for time off, swaps, and changes</p>
      </div>
      {reqs.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center">
          <Inbox size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[14px] text-gray-500 font-medium">No pending callouts</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reqs.map(r => {
            const d = r.details as any;
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-amber-200 p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[14px] font-bold text-gray-900">{d.requested_by} · {d.change_type?.replace('_', ' ')}</p>
                    <p className="text-[12px] text-gray-500 mt-1">{d.details}</p>
                    <p className="text-[10px] text-gray-400 mt-2">{d.shift_date} · {d.department}</p>
                  </div>
                  <button onClick={() => resolve(r.id)} className="px-3 py-1.5 rounded-lg text-white font-bold text-[11px]" style={{ backgroundColor: TEAL }}>Resolve</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Inline helpers for SVG icons not in lucide
const Phone = ({ size, style }: { size: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DashboardInner />
    </Suspense>
  );
}
