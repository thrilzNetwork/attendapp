'use client';

import React from 'react';

/**
 * Premium phone frame (iPhone-style: dynamic island, metal bezel, side buttons,
 * subtle screen glare). Wrap a screenshot <Image> or live UI as children.
 */
export function PhoneFrame({
  children,
  className = '',
  width = 260,
}: {
  children: React.ReactNode;
  className?: string;
  width?: number;
}) {
  return (
    <div className={`relative ${className}`} style={{ width }}>
      {/* side buttons */}
      <div className="absolute -left-[2px] top-[110px] h-9 w-[3px] rounded-l bg-gray-700" />
      <div className="absolute -left-[2px] top-[160px] h-14 w-[3px] rounded-l bg-gray-700" />
      <div className="absolute -right-[2px] top-[140px] h-20 w-[3px] rounded-r bg-gray-700" />

      <div
        className="relative rounded-[44px] p-[10px] shadow-2xl"
        style={{ background: 'linear-gradient(145deg,#2a2a2e,#0a0a0c 55%,#1a1a1e)' }}
      >
        <div className="relative overflow-hidden rounded-[36px] bg-white">
          {/* dynamic island */}
          <div className="absolute left-1/2 top-2 z-20 h-[26px] w-[88px] -translate-x-1/2 rounded-full bg-black" />
          {/* screen glare */}
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-tr from-transparent via-white/0 to-white/10" />
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Mac-style browser window frame with traffic lights and a URL pill.
 */
export function BrowserFrame({
  url = 'attenda.app',
  children,
  className = '',
}: {
  url?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="mx-3 flex h-7 flex-1 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-[11px] font-semibold text-gray-500">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-400">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          {url}
        </div>
      </div>
      {children}
    </div>
  );
}
