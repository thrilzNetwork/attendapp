'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Save, ImageIcon, Wifi, Hotel, Users, ClipboardList, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { getHotelConfig, updateHotelConfig, HotelConfig, getStaffAccounts, createStaffAccount, deleteStaffAccount, StaffAccount } from '@/lib/supabase';

type Tab = 'hotel' | 'staff' | 'requests';

export default function AdminPage() {
  const [isAuth, setIsAuth] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [tab, setTab] = useState<Tab>('hotel');
  const [saved, setSaved] = useState(false);

  // Hotel state
  const [config, setConfig] = useState<HotelConfig>({
    slug: 'miami-airport',
    name: '',
    wifiName: '',
    wifiPassword: '',
    welcomeLetter: '',
    managerName: '',
    teamPhotoUrl: '',
    frontDeskPhone: '',
  });

  // Staff state
  const [staff, setStaff] = useState<StaffAccount[]>([]);
  const [newStaff, setNewStaff] = useState({ name: '', pin: '', role: 'staff' });
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    if (isAuth) {
      getHotelConfig().then(c => c && setConfig(c));
      loadStaff();
    }
  }, [isAuth]);

  const loadStaff = async () => {
    const data = await getStaffAccounts();
    setStaff(data);
  };

  const handleSaveHotel = async () => {
    await updateHotelConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleAddStaff = async () => {
    if (!newStaff.name || !newStaff.pin) return;
    await createStaffAccount({
      name: newStaff.name,
      pin_code: newStaff.pin,
      role: newStaff.role,
    });
    setNewStaff({ name: '', pin: '', role: 'staff' });
    await loadStaff();
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('Delete this staff member?')) return;
    await deleteStaffAccount(id);
    await loadStaff();
  };

  if (!isAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
        <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#6B1D3C]/10 mb-6 mx-auto">
            <Hotel size={28} className="text-[#6B1D3C]" />
          </div>
          <h1 className="text-xl font-bold text-center text-black mb-2">Admin Access</h1>
          <p className="text-sm text-gray-400 text-center mb-6">Enter admin PIN to continue</p>
          <input
            type="password"
            value={adminPin}
            onChange={(e) => setAdminPin(e.target.value)}
            placeholder="Admin PIN"
            className="w-full bg-gray-50 rounded-xl px-4 py-3.5 text-[15px] text-black placeholder:text-gray-300 border border-gray-100 focus:border-[#6B1D3C] focus:outline-none text-center tracking-[0.2em] font-mono mb-4"
            maxLength={6}
          />
          <button
            onClick={() => {
              if (adminPin === '2025') setIsAuth(true);
              else alert('Wrong PIN');
            }}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-[14px] tracking-wide"
            style={{ backgroundColor: '#6B1D3C' }}
          >
            ACCESS DASHBOARD
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="flex items-center justify-between px-6 h-[52px]">
          <Link href="/" className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={20} className="text-[#3A1A2D]" />
          </Link>
          <span className="text-[15px] font-bold text-black">Admin Dashboard</span>
          <div className="w-9" />
        </div>
      </div>

      <div className="pt-[52px]">
        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-white">
          {[
            { key: 'hotel' as Tab, label: 'Hotel Info', icon: Hotel },
            { key: 'staff' as Tab, label: 'Staff', icon: Users },
            { key: 'requests' as Tab, label: 'Requests', icon: ClipboardList },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-[13px] font-semibold transition-colors ${
                tab === t.key ? 'text-[#6B1D3C] border-b-2 border-[#6B1D3C]' : 'text-gray-400'
              }`}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5 pb-20 max-w-md mx-auto">
          {/* --- HOTEL INFO TAB --- */}
          {tab === 'hotel' && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Hotel size={18} className="text-[#6B1D3C]" />
                  <h3 className="font-bold text-[14px]">Hotel Identity</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Hotel Name</label>
                    <input
                      value={config.name}
                      onChange={(e) => setConfig({ ...config, name: e.target.value })}
                      className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] text-black placeholder:text-gray-300 border border-gray-100 focus:border-[#6B1D3C] focus:outline-none"
                      placeholder="Best Western Premier Miami Airport"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Manager Name</label>
                    <input
                      value={config.managerName}
                      onChange={(e) => setConfig({ ...config, managerName: e.target.value })}
                      className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] text-black placeholder:text-gray-300 border border-gray-100 focus:border-[#6B1D3C] focus:outline-none"
                      placeholder="Hotel Manager"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Wifi size={18} className="text-[#6B1D3C]" />
                  <h3 className="font-bold text-[14px]">WiFi Settings</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Network Name</label>
                    <input
                      value={config.wifiName}
                      onChange={(e) => setConfig({ ...config, wifiName: e.target.value })}
                      className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] text-black placeholder:text-gray-300 border border-gray-100 focus:border-[#6B1D3C] focus:outline-none"
                      placeholder="BESTWESTERN"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Password</label>
                    <input
                      value={config.wifiPassword}
                      onChange={(e) => setConfig({ ...config, wifiPassword: e.target.value })}
                      className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] text-black placeholder:text-gray-300 border border-gray-100 focus:border-[#6B1D3C] focus:outline-none"
                      placeholder="Welcome2025"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <ImageIcon size={18} className="text-[#6B1D3C]" />
                  <h3 className="font-bold text-[14px]">Welcome Letter</h3>
                </div>
                <textarea
                  value={config.welcomeLetter}
                  onChange={(e) => setConfig({ ...config, welcomeLetter: e.target.value })}
                  className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[13px] text-black placeholder:text-gray-300 border border-gray-100 focus:border-[#6B1D3C] focus:outline-none resize-none"
                  rows={5}
                  placeholder="Dear Guest, welcome to our hotel..."
                />
              </div>

              {saved && (
                <div className="bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-xl text-[13px] font-medium text-center">
                  ✅ Saved to Supabase
                </div>
              )}

              <button
                onClick={handleSaveHotel}
                className="w-full py-3.5 rounded-xl text-white font-semibold text-[14px] tracking-wide flex items-center justify-center gap-2"
                style={{ backgroundColor: '#6B1D3C' }}
              >
                <Save size={16} />
                SAVE CHANGES
              </button>
            </div>
          )}

          {/* --- STAFF TAB --- */}
          {tab === 'staff' && (
            <div className="space-y-5">
              {/* Add Staff */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Plus size={18} className="text-[#6B1D3C]" />
                  <h3 className="font-bold text-[14px]">Add Staff Member</h3>
                </div>
                <div className="space-y-3">
                  <input
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                    placeholder="Staff Name"
                    className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] text-black placeholder:text-gray-300 border border-gray-100 focus:border-[#6B1D3C] focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type={showPin ? 'text' : 'password'}
                        value={newStaff.pin}
                        onChange={(e) => setNewStaff({ ...newStaff, pin: e.target.value })}
                        placeholder="PIN Code"
                        maxLength={6}
                        className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] text-black placeholder:text-gray-300 border border-gray-100 focus:border-[#6B1D3C] focus:outline-none pr-10"
                      />
                      <button
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <select
                      value={newStaff.role}
                      onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                      className="bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] text-black border border-gray-100 focus:border-[#6B1D3C] focus:outline-none"
                    >
                      <option value="staff">Staff</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>
                  <button
                    onClick={handleAddStaff}
                    className="w-full py-3 rounded-xl text-white font-semibold text-[13px]"
                    style={{ backgroundColor: '#6B1D3C' }}
                  >
                    ADD STAFF
                  </button>
                </div>
              </div>

              {/* Staff List */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Users size={18} className="text-[#6B1D3C]" />
                  <h3 className="font-bold text-[14px]">Active Staff ({staff.length})</h3>
                </div>
                <div className="space-y-2">
                  {staff.length === 0 && (
                    <p className="text-center text-gray-400 text-sm py-4">No staff accounts yet</p>
                  )}
                  {staff.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl">
                      <div>
                        <p className="text-[14px] font-semibold text-black">{s.name}</p>
                        <p className="text-[11px] text-gray-400 capitalize">{s.role} • PIN: ****</p>
                      </div>
                      <button
                        onClick={() => handleDeleteStaff(s.id!)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* --- REQUESTS TAB --- */}
          {tab === 'requests' && (
            <div className="text-center py-12">
              <ClipboardList size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-[14px]">Use the Staff Dashboard</p>
              <p className="text-gray-300 text-[12px] mt-1">to manage requests in real-time</p>
              <Link
                href="/staff"
                className="inline-block mt-4 text-[#6B1D3C] font-semibold text-[13px]"
              >
                Go to Staff Dashboard →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
