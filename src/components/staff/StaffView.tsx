'use client';

/* ── Enhanced Staff View ─────────────────────────────────── */
import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  StaffAccount, updateStaffDetails, setStaffPassword, resetAllStaffPasswords, deleteStaffAccount,
} from '@/lib/supabase';

const TEAL = '#158A7C';

const DEPARTMENTS = [
  { key: 'management',   label: 'Management',   icon: '👔' },
  { key: 'front_desk',   label: 'Front Desk',   icon: '🛎️' },
  { key: 'housekeeping', label: 'Housekeeping', icon: '🧹' },
  { key: 'maintenance',  label: 'Maintenance',  icon: '🔧' },
  { key: 'security',     label: 'Security',     icon: '🛡️' },
  { key: 'drivers',      label: 'Drivers',      icon: '🚐' },
] as const;

export default function StaffView({ hotelId, hotelName, hotelSlug, staff, onRefresh }: { hotelId: string; hotelName: string; hotelSlug: string; staff: StaffAccount[]; onRefresh: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'staff', vendor_type: '', department: '', positions: [] as string[], hire_date: '', min_hours: 0, employment_type: 'full_time' });
  const [editingPerms, setEditingPerms] = useState<string | null>(null);
  const [editingDept, setEditingDept] = useState<string | null>(null);
  const [editingDeptValue, setEditingDeptValue] = useState('');
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '', department: '', positions: [] as string[], hire_date: '', min_hours: 0, employment_type: 'full_time' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [sendInvite, setSendInvite] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resentId, setResentId] = useState<string | null>(null);
  // Password reset state
  const [resettingPwId, setResettingPwId] = useState<string | null>(null);
  const [resetPwForm, setResetPwForm] = useState<{ id: string; name: string; pw: string } | null>(null);
  const [resetPwError, setResetPwError] = useState('');
  const [resetPwSaving, setResetPwSaving] = useState(false);
  const [resetPwMsg, setResetPwMsg] = useState('');
  const [resetAllBusy, setResetAllBusy] = useState(false);
  const [resetAllMsg, setResetAllMsg] = useState('');
  const ALL_PERMS = ['orders', 'messages', 'shuttle', 'knowledge', 'compset', 'marketplace', 'hotel', 'staff_mgmt', 'partners', 'qrcodes'];

  const handleSetPassword = async () => {
    if (!resetPwForm) return;
    if (!resetPwForm.pw || resetPwForm.pw.length < 6) { setResetPwError('Password must be at least 6 characters.'); return; }
    setResetPwSaving(true);
    setResetPwError('');
    setResetPwMsg('');
    try {
      await setStaffPassword(resetPwForm.id, resetPwForm.pw);
      setResetPwForm(null);
      setResetPwMsg(`Password updated for ${resetPwForm.name}.`);
    } catch (e: unknown) {
      setResetPwError(e instanceof Error ? e.message : 'Failed to update password.');
    } finally {
      setResetPwSaving(false);
    }
  };

  const handleResetAll = async () => {
    if (!confirm('Reset ALL staff passwords to Attenda2026! and force each to set a new one on next login?')) return;
    setResetAllBusy(true);
    setResetAllMsg('');
    try {
      const res = await resetAllStaffPasswords('Attenda2026!');
      setResetAllMsg(`Reset ${res.updated} staff password(s). Skipped: ${res.skipped.length ? res.skipped.join(', ') : 'none'}. Staff will set a new password on next login.`);
      onRefresh();
    } catch (e: unknown) {
      setResetAllMsg('Error: ' + (e instanceof Error ? e.message : 'Failed to reset.'));
    } finally {
      setResetAllBusy(false);
    }
  };

  const handleResendInvite = async (s: StaffAccount) => {
    if (!s.email) return;
    setResendingId(s.id!);
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://attendaapp.com';
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
        body: JSON.stringify({
          type: 'staff_invitation',
          data: {
            staffEmail: s.email,
            staffName: s.name,
            staffRole: s.role,
            hotelName,
            hotelSlug,
            pin: '',
            setupUrl: `${baseUrl}/staff/setup?email=${encodeURIComponent(s.email)}&hotel=${encodeURIComponent(hotelSlug)}&mode=setup`,
          },
        }),
      });
      setResentId(s.id!);
      setTimeout(() => setResentId(null), 3000);
    } catch {
      // ignore — admin can retry
    } finally {
      setResendingId(null);
    }
  };

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

  const handleAdd = async () => {
    setSaveError('');
    if (!form.name) {
      setSaveError('Name is required.');
      return;
    }
    setSaving(true);
    try {
      await adminFetch('create_staff', {
        hotel_id: hotelId, name: form.name, role: form.role,
        email: form.email, phone: form.phone,
        permissions: form.role === 'vendor' ? [] : ['orders', 'messages', 'shuttle'],
        vendor_type: form.role === 'vendor' ? form.vendor_type || 'shuttle' : undefined,
        department: form.positions[0] || form.department || undefined,
        positions: form.positions.length > 0 ? form.positions : undefined,
        hire_date: form.hire_date || undefined,
        min_hours: Number(form.min_hours) || 0,
        employment_type: form.employment_type || 'full_time',
      });

      // Send invitation email with setup link
      if (form.email && sendInvite) {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://attendaapp.com';
        fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
          body: JSON.stringify({
            type: 'staff_invitation',
            data: {
              staffEmail: form.email,
              staffName: form.name,
              staffRole: form.role,
              hotelName,
              hotelSlug,
              pin: '',
              setupUrl: `${baseUrl}/staff/setup?email=${encodeURIComponent(form.email)}&hotel=${encodeURIComponent(hotelSlug)}&mode=setup`,
            },
          }),
        }).catch(() => {});
      }

      setForm({ name: '', email: '', phone: '', role: 'staff', vendor_type: '', department: '', positions: [], hire_date: '', min_hours: 0, employment_type: 'full_time' });
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save staff';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  const openProfile = (s: StaffAccount) => {
    setProfileForm({
      name: s.name || '',
      email: s.email || '',
      phone: s.phone || '',
      department: s.department || '',
      positions: Array.isArray(s.positions) ? s.positions : (s.department ? [s.department] : []),
      hire_date: s.hire_date || '',
      min_hours: s.min_hours || 0,
      employment_type: s.employment_type || 'full_time',
    });
    setProfileError('');
    setEditingProfile(editingProfile === s.id ? null : s.id!);
  };

  const saveProfile = async (staffId: string) => {
    setProfileSaving(true);
    setProfileError('');
    try {
      await updateStaffDetails(staffId, {
        name: profileForm.name || undefined,
        email: profileForm.email || undefined,
        phone: profileForm.phone || undefined,
        department: profileForm.positions[0] || profileForm.department || undefined,
        positions: profileForm.positions,
        hire_date: profileForm.hire_date || undefined,
        min_hours: Number(profileForm.min_hours) || 0,
        employment_type: profileForm.employment_type || undefined,
      });
      setEditingProfile(null);
      onRefresh();
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePermToggle = async (staffId: string, perm: string, current: string[]) => {
    const updated = current.includes(perm) ? current.filter(p => p !== perm) : [...current, perm];
    await adminFetch('update_staff_permissions', { id: staffId, permissions: updated });
    onRefresh();
  };

  const handleToggleActive = async (s: StaffAccount) => {
    await adminFetch('update_staff', { id: s.id!, updates: { active: !s.active } });
    onRefresh();
  };

  const permLabels: Record<string, string> = {
    orders: 'Live Orders', messages: 'Guest Messages', shuttle: 'Transportation',
    knowledge: 'Right Answers', compset: 'Compset', marketplace: 'Marketplace',
    hotel: 'Hotel Settings', staff_mgmt: 'Staff Mgmt', partners: 'Partners', qrcodes: 'QR Codes',
    vendors: 'Vendors',
  };

  return (
    <div className="p-8 max-w-lg">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px] font-extrabold text-gray-900">Staff Management</h1>
        <button onClick={handleResetAll} disabled={resetAllBusy}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-[11px] font-bold disabled:opacity-50">
          {resetAllBusy ? 'Resetting...' : 'Reset All Passwords'}
        </button>
      </div>
      {resetAllMsg && (
        <div className="mb-5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[12px] font-semibold px-4 py-3 rounded-xl">
          {resetAllMsg}
        </div>
      )}
      <div className="space-y-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-bold text-[15px] mb-3">Add Staff Member</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name"
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none">
                  <option value="staff">Staff</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="manager">Admin / Manager</option>
                  <option value="vendor">Vendor (external)</option>
                </select>
              </div>
            </div>
            {form.role === 'vendor' && (
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Vendor Type</label>
                <select value={form.vendor_type} onChange={e => setForm({ ...form, vendor_type: e.target.value })}
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-orange-200 text-[13px] outline-none">
                  <option value="shuttle">Shuttle Company</option>
                  <option value="taxi">Taxi / Rideshare</option>
                  <option value="tour">Tour Operator</option>
                  <option value="catering">Catering</option>
                  <option value="other">Other</option>
                </select>
                <p className="text-[10px] text-orange-600 mt-1">Vendors only see their own manifest — no hotel data.</p>
              </div>
            )}
            {/* Positions — multi-select */}
            {form.role !== 'vendor' && (
              <div>
                <label className="text-[10px] text-gray-400 block mb-1.5 uppercase font-bold">Positions (select all that apply)</label>
                <div className="flex flex-wrap gap-2">
                  {DEPARTMENTS.map(d => {
                    const checked = form.positions.includes(d.key);
                    return (
                      <button key={d.key} type="button"
                        onClick={() => setForm(f => ({ ...f, positions: checked ? f.positions.filter(p => p !== d.key) : [...f.positions, d.key] }))}
                        className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${checked ? 'bg-teal-600 text-white border-teal-600' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-teal-400'}`}>
                        {d.icon} {d.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">First selected = primary department for scheduling.</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Email</label>
                <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="staff@hotel.com"
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Phone</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="305-555-0100"
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Hire Date</label>
              <input type="date" value={form.hire_date} onChange={e => setForm({ ...form, hire_date: e.target.value })}
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
              <p className="text-[10px] text-gray-400 mt-1">Used for PTO accrual calculations.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Min Weekly Hours</label>
                <input type="number" min={0} max={80} value={form.min_hours} onChange={e => setForm({ ...form, min_hours: parseInt(e.target.value) || 0 })}
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Employment Type</label>
                <select value={form.employment_type} onChange={e => setForm({ ...form, employment_type: e.target.value })}
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none">
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                </select>
              </div>
            </div>
            {saveError && <p className="text-[11px] text-red-500 bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>}
            <button onClick={handleAdd} disabled={saving} className="w-full py-3 rounded-xl text-white font-semibold text-[13px] disabled:opacity-50" style={{ backgroundColor: '#158A7C' }}>{saving ? 'Saving...' : 'ADD STAFF MEMBER'}</button>
            {form.email && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={sendInvite} onChange={e => setSendInvite(e.target.checked)} className="w-4 h-4 rounded" style={{ accentColor: '#158A7C' }} />
                <span className="text-[11px] text-gray-500">Send invitation email with setup link</span>
              </label>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100"><h3 className="font-bold text-[15px]">Active Staff ({staff.filter(s => s.active).length})</h3></div>
          <div className="divide-y divide-gray-50">
            {staff.filter(s => s.active).length === 0 ? (
              <div className="px-5 py-6 text-center"><p className="text-[13px] text-gray-400">No staff accounts yet.</p></div>
            ) : staff.filter(s => s.active).map(s => (
              <div key={s.id} className="px-5 py-3">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-[14px] font-bold text-gray-900">{s.name}
                      <span className="text-[10px] text-gray-400 capitalize font-normal"> · {s.role}{s.vendor_type ? ` (${s.vendor_type})` : ''}</span>
                    </p>
                    <p className="text-[11px] text-gray-400">{s.email}{s.email && s.phone ? ' · ' : ''}{s.phone} · PIN: ••••
                      {(Array.isArray(s.positions) && s.positions.length > 0 ? s.positions : s.department ? [s.department] : []).map(pos => {
                        const dep = DEPARTMENTS.find(d => d.key === pos);
                        return dep ? <span key={pos}> · {dep.icon} {dep.label}</span> : null;
                      })}
                      {s.hire_date && <span> · Hired: {new Date(s.hire_date+'T00:00:00').toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}</span>}
                      {s.hire_date && (() => {
                        const months = Math.floor((Date.now() - new Date(s.hire_date+'T00:00:00').getTime()) / (1000*60*60*24*30.44));
                        const ptoAccrued = Math.floor(months * 1.25); // ~15 days/year
                        return <span> · {ptoAccrued}PTO days</span>;
                      })()}
                      {(s.min_hours || s.employment_type) && (
                        <span> · {s.employment_type === 'part_time' ? 'Part-time' : 'Full-time'}{s.min_hours ? ` · ${s.min_hours}h/wk min` : ''}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => openProfile(s)}
                      className={`text-[10px] font-bold px-2 py-1 rounded ${editingProfile === s.id ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Edit Profile</button>
                    <button onClick={() => setEditingPerms(editingPerms === s.id ? null : s.id!)}
                      className="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 text-gray-600">Permissions</button>
                    {s.email && (
                      <button onClick={() => handleResendInvite(s)} disabled={resendingId === s.id}
                        className="text-[10px] font-bold px-2 py-1 rounded bg-teal-50 text-teal-700 disabled:opacity-50">
                        {resentId === s.id ? 'Sent!' : resendingId === s.id ? 'Sending...' : 'Resend Invite'}
                      </button>
                    )}
                    <button onClick={() => { setResetPwForm({ id: s.id!, name: s.name, pw: '' }); setResetPwError(''); setResetPwMsg(''); }}
                      className="text-[10px] font-bold px-2 py-1 rounded bg-indigo-50 text-indigo-700">
                      Reset Password
                    </button>
                    <button onClick={() => handleToggleActive(s)} className="text-[10px] font-bold px-2 py-1 rounded bg-amber-100 text-amber-700">Deactivate</button>
                    <button onClick={() => { if(confirm('Delete?')) { deleteStaffAccount(s.id!); onRefresh(); } }}
                      className="text-red-400"><Trash2 size={13} /></button>
                  </div>
                </div>
                {editingProfile === s.id && (
                  <div className="mt-3 bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Edit Profile</p>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Name</label>
                      <input value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                        className="w-full bg-white rounded-lg px-3 py-2 border border-gray-200 text-[12px] outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1.5 uppercase font-bold">Positions (select all that apply)</label>
                      <div className="flex flex-wrap gap-1.5">
                        {DEPARTMENTS.map(d => {
                          const checked = profileForm.positions.includes(d.key);
                          return (
                            <button key={d.key} type="button"
                              onClick={() => setProfileForm(f => ({ ...f, positions: checked ? f.positions.filter(p => p !== d.key) : [...f.positions, d.key] }))}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${checked ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-500 border-gray-200 hover:border-teal-400'}`}>
                              {d.icon} {d.label}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">First selected = primary department for scheduling.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Email</label>
                        <input value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})}
                          className="w-full bg-white rounded-lg px-3 py-2 border border-gray-200 text-[12px] outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Phone</label>
                        <input value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})}
                          className="w-full bg-white rounded-lg px-3 py-2 border border-gray-200 text-[12px] outline-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Hire Date</label>
                        <input type="date" value={profileForm.hire_date} onChange={e => setProfileForm({...profileForm, hire_date: e.target.value})}
                          className="w-full bg-white rounded-lg px-3 py-2 border border-gray-200 text-[12px] outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Min Hrs/Wk</label>
                        <input type="number" min={0} max={80} value={profileForm.min_hours} onChange={e => setProfileForm({...profileForm, min_hours: parseInt(e.target.value)||0})}
                          className="w-full bg-white rounded-lg px-3 py-2 border border-gray-200 text-[12px] outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Type</label>
                        <select value={profileForm.employment_type} onChange={e => setProfileForm({...profileForm, employment_type: e.target.value})}
                          className="w-full bg-white rounded-lg px-3 py-2 border border-gray-200 text-[12px] outline-none">
                          <option value="full_time">Full Time</option>
                          <option value="part_time">Part Time</option>
                        </select>
                      </div>
                    </div>
                    {profileError && <p className="text-[11px] text-red-500">{profileError}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => saveProfile(s.id!)} disabled={profileSaving}
                        className="px-4 py-2 rounded-lg text-white text-[12px] font-bold disabled:opacity-50" style={{backgroundColor: TEAL}}>
                        {profileSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button onClick={() => setEditingProfile(null)} className="px-3 py-2 rounded-lg text-[12px] text-gray-500 font-semibold bg-white border border-gray-200">Cancel</button>
                    </div>
                  </div>
                )}
                {editingPerms === s.id && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {ALL_PERMS.map(p => {
                      const has = (s.permissions || []).includes(p);
                      return (
                        <button key={p} onClick={() => handlePermToggle(s.id!, p, s.permissions || [])}
                          className={`px-2 py-1 rounded text-[10px] font-bold ${has ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{permLabels[p]}</button>
                      );
                    })}
                  </div>
                )}
                {editingDept === s.id && (
                  <div className="mt-2 flex items-center gap-2">
                    <select value={editingDeptValue} onChange={e => setEditingDeptValue(e.target.value)}
                      className="flex-1 bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-200 text-[12px] outline-none">
                      <option value="">— No position —</option>
                      {DEPARTMENTS.map(d => (
                        <option key={d.key} value={d.key}>{d.icon} {d.label}</option>
                      ))}
                    </select>
                    <button onClick={async () => {
                      await updateStaffDetails(s.id!, { department: editingDeptValue });
                      setEditingDept(null);
                      onRefresh();
                    }} className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white" style={{backgroundColor: TEAL}}>Save</button>
                    <button onClick={() => setEditingDept(null)} className="text-[11px] text-gray-500 font-semibold px-2">Cancel</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Inactive staff */}
        {staff.filter(s => !s.active).length > 0 && (
          <details className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <summary className="text-[13px] font-bold text-gray-500 cursor-pointer">Inactive ({staff.filter(s => !s.active).length})</summary>
            <div className="space-y-2 mt-2">
              {staff.filter(s => !s.active).map(s => (
                <div key={s.id} className="flex items-center justify-between text-[12px] py-1">
                  <span className="text-gray-500">{s.name} · {s.role}</span>
                  <div className="flex items-center gap-2">
                    {s.email && (
                      <button onClick={() => handleResendInvite(s)} disabled={resendingId === s.id}
                        className="text-[10px] font-bold text-teal-600 disabled:opacity-50">
                        {resentId === s.id ? 'Sent!' : resendingId === s.id ? 'Sending...' : 'Resend Invite'}
                      </button>
                    )}
                    <button onClick={() => handleToggleActive(s)} className="text-[10px] font-bold text-emerald-600">Reactivate</button>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Reset single staff password modal */}
      {resetPwForm && (
        <div className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-4" onClick={() => !resetPwSaving && setResetPwForm(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-[17px] font-extrabold text-gray-900 mb-1">Reset Password</h3>
            <p className="text-[12px] text-gray-500 mb-4">
              Set a new password for <span className="font-bold text-gray-800">{resetPwForm.name}</span>. They can change it anytime after login.
            </p>
            <input
              type="password"
              placeholder="New password (min 6 characters)"
              value={resetPwForm.pw}
              autoComplete="new-password"
              onChange={e => { setResetPwForm({ ...resetPwForm, pw: e.target.value }); setResetPwError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSetPassword()}
              className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-200 focus:outline-none focus:border-teal-400 mb-3"
            />
            {resetPwError && <p className="text-[11px] text-red-500 bg-red-50 px-3 py-2 rounded-lg mb-3">{resetPwError}</p>}
            {resetPwMsg && <p className="text-[11px] text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg mb-3">{resetPwMsg}</p>}
            <div className="flex gap-2">
              <button onClick={() => setResetPwForm(null)} disabled={resetPwSaving}
                className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold text-gray-500 bg-gray-100 disabled:opacity-50">Cancel</button>
              <button onClick={handleSetPassword} disabled={resetPwSaving}
                className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-50" style={{ backgroundColor: TEAL }}>
                {resetPwSaving ? 'Saving...' : 'Set Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
