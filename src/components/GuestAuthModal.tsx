'use client';

import { useState, useEffect } from 'react';
import { X, User, DoorOpen } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

export default function GuestAuthModal({ open, onClose, onSuccess }: Props) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();
  const years = [currentYear, currentYear + 1, currentYear + 2];

  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [month, setMonth] = useState(currentMonth.toString());
  const [day, setDay] = useState(currentDay.toString());
  const [year, setYear] = useState(currentYear.toString());
  const [errors, setErrors] = useState({ name: false, room: false, date: false });

  useEffect(() => {
    if (open) {
      const qrRoom = localStorage.getItem('attenda_qr_room');
      if (qrRoom && !room) setRoom(qrRoom);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [open]);

  if (!open) return null;

  const daysInMonth = month ? getDaysInMonth(parseInt(month), parseInt(year) || currentYear) : 31;
  const days = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());

  const handleSubmit = () => {
    const e = {
      name: !name.trim(),
      room: !room.trim(),
      date: !month || !day || !year
    };
    if (e.name || e.room || e.date) {
      setErrors(e);
      return;
    }
    const checkout = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    localStorage.setItem('guestSession', JSON.stringify({ name: name.trim(), room: room.trim(), checkout }));
    onSuccess?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Centered Modal Card */}
      <div className="relative bg-white rounded-[20px] w-full max-w-[340px] shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:scale-95 z-10"
        >
          <X size={16} className="text-gray-500" />
        </button>

        <div className="px-6 pt-6 pb-7">
          {/* Header */}
          <div className="mb-5">
            <p className="text-[20px] font-bold text-black">Welcome</p>
            <p className="text-[13px] text-gray-400 mt-0.5">Please verify your stay details</p>
          </div>

          {/* Fields */}
          <div className="space-y-3">
            <div>
              <label className="text-[12px] font-semibold text-gray-600 mb-1.5 block">Full Name</label>
              <div className={`flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-3 border ${errors.name ? 'border-red-400' : 'border-gray-200'}`}>
                <User size={16} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="John Smith"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setErrors({ ...errors, name: false }); }}
                  className="bg-transparent text-[15px] text-gray-800 outline-none w-full placeholder:text-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="text-[12px] font-semibold text-gray-600 mb-1.5 block">Room Number</label>
              <div className={`flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-3 border ${errors.room ? 'border-red-400' : 'border-gray-200'}`}>
                <DoorOpen size={16} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 205"
                  value={room}
                  onChange={(e) => { setRoom(e.target.value); setErrors({ ...errors, room: false }); }}
                  className="bg-transparent text-[15px] text-gray-800 outline-none w-full placeholder:text-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="text-[12px] font-semibold text-gray-600 mb-1.5 block">Checkout Date</label>
              <div className={`flex gap-2 ${errors.date ? 'border border-red-400 rounded-xl p-0.5' : ''}`}>
                <select
                  value={month}
                  onChange={(e) => { setMonth(e.target.value); setErrors({ ...errors, date: false }); }}
                  className="flex-1 bg-gray-50 rounded-xl px-3 py-3 text-[14px] text-gray-800 outline-none border border-gray-200 appearance-none"
                  style={{ backgroundImage: 'none' }}
                >
                  <option value="" disabled>Month</option>
                  {MONTHS.map((m, i) => {
                    const monthNum = i + 1;
                    const unavailable = parseInt(year) === currentYear && monthNum < currentMonth;
                    return (
                      <option key={m} value={monthNum.toString()} disabled={unavailable}>
                        {m}{unavailable ? ' (past)' : ''}
                      </option>
                    );
                  })}
                </select>

                <select
                  value={day}
                  onChange={(e) => { setDay(e.target.value); setErrors({ ...errors, date: false }); }}
                  className="w-[70px] bg-gray-50 rounded-xl px-2 py-3 text-[14px] text-gray-800 outline-none border border-gray-200 text-center appearance-none"
                >
                  <option value="" disabled>Day</option>
                  {days.map((d) => {
                    const dNum = parseInt(d);
                    const unavailable = parseInt(year) === currentYear && parseInt(month) === currentMonth && dNum < currentDay;
                    return (
                      <option key={d} value={d} disabled={unavailable}>
                        {d}{unavailable ? '×' : ''}
                      </option>
                    );
                  })}
                </select>

                <select
                  value={year}
                  onChange={(e) => { setYear(e.target.value); setErrors({ ...errors, date: false }); }}
                  className="w-[80px] bg-gray-50 rounded-xl px-2 py-3 text-[14px] text-gray-800 outline-none border border-gray-200 text-center appearance-none"
                >
                  <option value="" disabled>Year</option>
                  {years.map((y) => (
                    <option key={y} value={y.toString()}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full mt-5 py-3.5 rounded-[14px] text-white font-bold text-[15px] active:scale-[0.98] shadow-sm"
            style={{ backgroundColor: '#6B1D3C' }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
