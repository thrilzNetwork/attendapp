'use client';

import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { CreditCard, Lock } from 'lucide-react';

export interface FeeBreakdown {
  subtotal: number;
  attendaFee: number;
  stripeFee: number;
  tip: number;
  total: number;
}

export default function PaymentSheet({ clientSecret, onSuccess, onCancel, brandColor, breakdown }: {
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
  brandColor: string;
  breakdown: FeeBreakdown;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setPaying(true);
    setError('');
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.origin + '/confirmation' },
      redirect: 'if_required',
    });
    if (stripeError) {
      setError(stripeError.message || 'Payment failed');
      setPaying(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
      <div className="bg-white w-full max-w-md rounded-t-2xl p-5 pb-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lock size={14} className="text-emerald-600" />
            <span className="text-[13px] font-bold text-gray-900">Secure Payment</span>
          </div>
          <button onClick={onCancel} className="text-gray-400 text-[12px]">Cancel</button>
        </div>

        {/* Fee breakdown */}
        <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-1.5">
          <div className="flex justify-between text-[12px]">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-semibold text-gray-800">${breakdown.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[12px]">
            <span className="text-gray-500">Attenda service fee (10%)</span>
            <span className="font-semibold text-gray-800">${breakdown.attendaFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[12px]">
            <span className="text-gray-500">Card processing (~2.9% + 30¢)</span>
            <span className="font-semibold text-gray-800">${breakdown.stripeFee.toFixed(2)}</span>
          </div>
          {breakdown.tip > 0 && (
            <div className="flex justify-between text-[12px]">
              <span className="text-gray-500">Tip</span>
              <span className="font-semibold text-emerald-600">${breakdown.tip.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-[13px] pt-1.5 border-t border-gray-200">
            <span className="font-bold text-gray-900">Total</span>
            <span className="font-extrabold text-gray-900">${breakdown.total.toFixed(2)}</span>
          </div>
        </div>

        <PaymentElement />
        {error && <p className="text-[11px] text-red-500 mt-2">{error}</p>}
        <button
          onClick={handlePay}
          disabled={paying || !stripe}
          className="mt-4 w-full py-3.5 rounded-xl text-white font-bold text-[14px] flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ backgroundColor: brandColor }}
        >
          <CreditCard size={16} /> {paying ? 'Processing…' : 'Pay Now'}
        </button>
        <p className="text-[10px] text-gray-400 text-center mt-2">Powered by Stripe · Your card is never stored</p>
      </div>
    </div>
  );
}
