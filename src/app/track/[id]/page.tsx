'use client';

import { Suspense, useState, useEffect } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Clock, ChefHat, Package, Truck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const TEAL = '#0D9488';

interface OrderRow {
  id: string;
  vendor_status: string | null;
  details: string | null;
  total_amount: number | null;
  partner_id: string | null;
  created_at: string;
  type: string | null;
  status: string | null;
}

interface PartnerRow {
  id: string;
  name: string;
  image_url: string | null;
}

// Map statuses to a step index 1–5
function getStepIndex(vendorStatus: string | null, parentStatus: string | null): number {
  if (parentStatus === 'completed') return 5;
  if (vendorStatus === 'ready') return 4;
  if (vendorStatus === 'preparing') return 3;
  if (vendorStatus === 'received') return 2;
  return 1;
}

const STEPS = [
  { label: 'Order Placed', Icon: CheckCircle },
  { label: 'Received by Restaurant', Icon: Clock },
  { label: 'Being Prepared', Icon: ChefHat },
  { label: 'Ready for Pickup', Icon: Package },
  { label: 'Delivered', Icon: Truck },
];

function StepDot({ step, activeStep, color }: { step: number; activeStep: number; color: string }) {
  const done = step <= activeStep;
  const active = step === activeStep;
  const { Icon } = STEPS[step - 1];

  return (
    <div className="flex flex-col items-center">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
        style={done ? { backgroundColor: color } : { backgroundColor: '#E5E7EB' }}
      >
        <Icon
          size={18}
          style={{ color: done ? '#fff' : '#9CA3AF' }}
          className={active ? 'animate-pulse' : ''}
        />
      </div>
      <p
        className="text-[10px] font-semibold mt-1.5 text-center leading-tight max-w-[56px]"
        style={{ color: done ? color : '#9CA3AF' }}
      >
        {STEPS[step - 1].label}
      </p>
    </div>
  );
}

function TrackContent() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [order, setOrder] = useState<OrderRow | null>(null);
  const [partner, setPartner] = useState<PartnerRow | null>(null);
  const [vendorStatus, setVendorStatus] = useState<string | null>(null);
  const [parentStatus, setParentStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    (async () => {
      // Fetch order
      const { data: orderData, error: orderError } = await supabase
        .from('requests')
        .select('id, vendor_status, details, total_amount, partner_id, created_at, type, status')
        .eq('id', id)
        .single();

      if (cancelled) return;

      if (orderError || !orderData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setOrder(orderData as OrderRow);
      setVendorStatus(orderData.vendor_status ?? null);
      setParentStatus(orderData.status ?? null);

      // Fetch partner if partner_id exists
      if (orderData.partner_id) {
        const { data: partnerData } = await supabase
          .from('partners')
          .select('id, name, image_url')
          .eq('id', orderData.partner_id)
          .single();
        if (!cancelled && partnerData) {
          setPartner(partnerData as PartnerRow);
        }
      }

      if (!cancelled) setLoading(false);
    })();

    // Real-time subscription
    const channel = supabase
      .channel('track-' + id)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'requests',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          const n = payload.new as Partial<OrderRow>;
          if (n.vendor_status !== undefined) setVendorStatus(n.vendor_status ?? null);
          if (n.status !== undefined) setParentStatus(n.status ?? null);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="h-dvh w-full flex items-center justify-center bg-[#F4F4F5]">
        <div className="w-7 h-7 border-2 border-gray-300 rounded-full animate-spin" style={{ borderTopColor: TEAL }} />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="h-dvh w-full flex flex-col items-center justify-center bg-[#F4F4F5] px-5 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-[18px] font-bold text-black mb-2">Order Not Found</h2>
        <p className="text-[14px] text-gray-500 mb-6">
          We couldn&apos;t find an order with that ID. Check your link or contact the front desk.
        </p>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 active:scale-95"
        >
          <ArrowLeft size={14} />
          Go Back
        </button>
      </div>
    );
  }

  const activeStep = getStepIndex(vendorStatus, parentStatus);
  const isReady = vendorStatus === 'ready' || parentStatus === 'completed';
  const lastUpdated = new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formattedDate = new Date(order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <div className="min-h-dvh w-full bg-[#F4F4F5]">
      {/* Header */}
      <div className="bg-white px-5 pt-6 pb-4 flex items-center gap-3 shadow-sm">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center active:scale-95"
        >
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-[17px] font-bold text-black">Order Tracking</h1>
          <p className="text-[11px] text-gray-400 font-mono mt-0.5">#{order.id.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4 max-w-md mx-auto pb-10">
        {/* Ready banner */}
        {isReady && (
          <div
            className="rounded-2xl px-4 py-3 flex items-center gap-3"
            style={{ backgroundColor: `${TEAL}15`, border: `1px solid ${TEAL}30` }}
          >
            <span className="text-2xl">🎉</span>
            <div>
              <p className="text-[14px] font-bold" style={{ color: TEAL }}>
                {parentStatus === 'completed' ? 'Order Delivered!' : 'Your order is ready!'}
              </p>
              <p className="text-[12px] text-gray-500">
                {parentStatus === 'completed'
                  ? 'We hope you enjoyed your order.'
                  : 'Head over to pick it up or wait for delivery.'}
              </p>
            </div>
          </div>
        )}

        {/* Partner card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
          {partner?.image_url ? (
            <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0">
              <Image src={partner.image_url} alt={partner.name} fill className="object-cover" sizes="48px" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
              <ChefHat size={22} className="text-gray-400" />
            </div>
          )}
          <div className="flex-1">
            <p className="text-[15px] font-bold text-black">{partner?.name || order.type || 'Restaurant'}</p>
            <p className="text-[12px] text-gray-400">{order.details ? order.details.slice(0, 60) + (order.details.length > 60 ? '…' : '') : 'Your order'}</p>
          </div>
          {order.total_amount != null && order.total_amount > 0 && (
            <p className="text-[16px] font-bold text-black shrink-0">
              ${order.total_amount.toFixed(2)}
            </p>
          )}
        </div>

        {/* Status stepper */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-[13px] font-bold text-gray-500 uppercase tracking-wide mb-5">Order Status</h3>

          {/* Stepper row */}
          <div className="relative flex items-start justify-between">
            {/* Connector line behind dots */}
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200 -z-0" />
            <div
              className="absolute top-5 left-5 h-0.5 -z-0 transition-all duration-500"
              style={{
                backgroundColor: TEAL,
                width: `${Math.min(((activeStep - 1) / 4) * 100, 100)}%`,
              }}
            />
            {STEPS.map((_, i) => (
              <StepDot key={i} step={i + 1} activeStep={activeStep} color={TEAL} />
            ))}
          </div>

          <p className="text-[11px] text-gray-400 mt-4 text-center">
            Ordered {formattedDate} at {lastUpdated}
          </p>
        </div>

        {/* Details card */}
        {order.details && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wide mb-2">Order Details</p>
            <p className="text-[13px] text-gray-700 leading-relaxed">{order.details}</p>
          </div>
        )}

        {/* Live indicator */}
        <div className="flex items-center justify-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <p className="text-[11px] text-gray-400">Live updates enabled</p>
        </div>
      </div>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={
      <div className="h-dvh w-full flex items-center justify-center bg-[#F4F4F5]">
        <div className="w-7 h-7 border-2 border-gray-300 rounded-full animate-spin" style={{ borderTopColor: TEAL }} />
      </div>
    }>
      <TrackContent />
    </Suspense>
  );
}
