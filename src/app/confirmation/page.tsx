'use client';

import { CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';

export default function ConfirmationPage() {
  // Build back URL preserving hotel tenant context
  let backHref = '/';
  if (typeof window !== 'undefined') {
    const slug = localStorage.getItem('attenda_hotel_slug');
    if (slug) backHref = `/?hotel=${encodeURIComponent(slug)}`;
  }

  return (
    <div className="h-screen w-full max-w-md mx-auto bg-[#F5F5F5] flex flex-col items-center justify-center px-8 text-center">
      <CheckCircle size={64} className="text-green-500 mb-6" />
      <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Order Placed!</h1>
      <p className="text-sm text-gray-500 mb-1">
        Front desk has received your request.
      </p>
      <div className="flex items-center justify-center gap-1 text-xs text-gray-400 mt-2">
        <Clock size={12} />
        <span>Estimated: 25-40 minutes</span>
      </div>

      <Link
        href={backHref}
        className="mt-8 bg-[#3A1A2D] text-white font-bold py-4 px-10 rounded-2xl shadow-md active:scale-[0.97] transition-transform text-sm"
      >
        Back to Services
      </Link>

      <Link
        href="/nearby"
        className="mt-3 text-xs font-bold text-[#3A1A2D]">
        Order More Food →
      </Link>
    </div>
  );
}
