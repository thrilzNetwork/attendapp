# Attenda Stripe Checkout Enhancement Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add tip, fee breakdown, and transport Stripe payments to the guest checkout flow. Create a test partner to verify the existing partner iPad dashboard end-to-end.

**Architecture:** The checkout page (`nearby/detail/page.tsx`) currently sends only `subtotal` to the payment-intent API. We'll add a tip input, pass `tipCents` to the API, compute the full fee breakdown server-side, and display it to the guest before they pay. For transport, we'll add pricing fields and Stripe payment to the Private Transport tab. The partner dashboard already exists at `/partner?restaurant=<id>` with PIN login + kanban — we just need a test partner to verify it.

**Tech Stack:** Next.js 14 App Router, TypeScript, Stripe Elements, Supabase, Tailwind CSS

---

## Current State Summary

- **Checkout** (`nearby/detail/page.tsx`): Guest builds cart → hits "Place Order" → creates `requests` row → calls `/api/stripe/payment-intent` with `amountCents = subtotal * 100` → shows Stripe PaymentElement sheet → on success, dispatches Uber + email + redirects to `/confirmation`
- **Payment Intent API** (`api/stripe/payment-intent/route.ts`): Receives `{ requestId, amountCents, partnerId, description }`, calls `computeFees(amountCents)` which splits 10% platform / 90% vendor, creates PaymentIntent with metadata, updates `requests` row
- **Fee computation** (`lib/stripe.ts`): `PLATFORM_FEE_PCT = 0.10`, `computeFees()` returns `{ platformFeeCents, vendorPayoutCents }`
- **Transport** (`transport/page.tsx`): Airport/Cruise tabs book shuttle slots (room charge, no Stripe). Private Transport tab creates a `shuttle_requests` row (no payment at all)
- **Partner Dashboard** (`partner/page.tsx`): Already built — PIN login, 4-column kanban (new/received/preparing/ready), menu view, business info, real-time subscription, sound alerts, revenue tracking. Works for any partner type (restaurant, transport, service, etc.)

---

## Task 1: Add tip input to checkout UI

**Objective:** Add a tip percentage selector and custom tip input to the checkout page, displayed when the cart has items.

**Files:**
- Modify: `src/app/nearby/detail/page.tsx` (lines 387-432, the cart summary section)

**Step 1: Add tip state**

Add state variables after the existing `deliveryMethod`/`uberQuote` state block (around line 93):

```tsx
const [tipPercent, setTipPercent] = useState<number>(0); // 0, 15, 18, 20, or custom
const [tipCustom, setTipCustom] = useState<string>(''); // custom dollar amount
```

**Step 2: Add tip UI before the Place Order button**

Insert between the delivery method toggle (line 416) and the Place Order button (line 418):

```tsx
{/* Tip / Gratuity */}
<div className="bg-white rounded-xl border border-gray-100 p-3">
  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Add a tip</p>
  <div className="flex gap-2 mb-2">
    {[15, 18, 20].map(pct => (
      <button
        key={pct}
        onClick={() => { setTipPercent(pct); setTipCustom(''); }}
        className={`flex-1 py-2 rounded-xl text-[12px] font-bold border-2 transition-colors ${
          tipPercent === pct && !tipCustom
            ? 'border-current text-white'
            : 'border-gray-200 text-gray-600 bg-white'
        }`}
        style={tipPercent === pct && !tipCustom ? { backgroundColor: brandColor, borderColor: brandColor } : {}}
      >
        {pct}%
      </button>
    ))}
    <button
      onClick={() => { setTipPercent(0); setTipCustom(''); }}
      className={`flex-1 py-2 rounded-xl text-[12px] font-bold border-2 transition-colors ${
        tipPercent === 0 && !tipCustom
          ? 'border-current text-white'
          : 'border-gray-200 text-gray-600 bg-white'
      }`}
      style={tipPercent === 0 && !tipCustom ? { backgroundColor: brandColor, borderColor: brandColor } : {}}
    >
      None
    </button>
  </div>
  <div className="flex items-center gap-2">
    <span className="text-[11px] text-gray-400">Custom:</span>
    <div className="relative flex-1">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-gray-400">$</span>
      <input
        type="number"
        min="0"
        step="0.50"
        placeholder="0.00"
        value={tipCustom}
        onChange={e => { setTipCustom(e.target.value); setTipPercent(0); }}
        className="w-full bg-gray-50 rounded-xl pl-7 pr-3 py-2 border border-gray-200 text-[13px] text-gray-800 outline-none"
      />
    </div>
  </div>
  {(tipPercent > 0 || parseFloat(tipCustom) > 0) && (
    <p className="text-[11px] text-gray-500 mt-2 text-center">
      Tip: ${tipCustom ? parseFloat(tipCustom).toFixed(2) : (total * tipPercent / 100).toFixed(2)}
    </p>
  )}
</div>
```

**Step 3: Compute tip amount for the API call**

Add a `tipCents` variable before the `placeOrder` function:

```tsx
const tipAmount = tipCustom ? parseFloat(tipCustom) || 0 : total * tipPercent / 100;
const tipCents = Math.round(tipAmount * 100);
```

**Step 4: Pass tipCents to the payment-intent API**

In `placeOrder()`, modify the fetch body (line 234):

```tsx
body: JSON.stringify({
  requestId: requestRow.id,
  amountCents: Math.round(subtotal * 100),
  tipCents,
  partnerId: partner.id,
  description: `${partner.name} order — Room ${room}`,
}),
```

**Step 5: Update the Place Order button to show tip-inclusive total**

Modify the button total display (line 426):

```tsx
<span className="text-lg font-extrabold">${(total + tipAmount).toFixed(2)}</span>
```

**Verification:** `npm run build` passes with 0 new errors. The tip selector appears when cart has items.

---

## Task 2: Add fee breakdown display before payment

**Objective:** Show the guest a clear breakdown of what they're paying before they hit "Pay Now" in the Stripe sheet.

**Files:**
- Modify: `src/app/nearby/detail/page.tsx` (the `PaymentSheet` component, lines 15-67)

**Step 1: Accept fee breakdown props**

Modify `PaymentSheet` props:

```tsx
function PaymentSheet({ clientSecret, onSuccess, onCancel, brandColor, breakdown }: {
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
  brandColor: string;
  breakdown: { subtotal: number; attendaFee: number; stripeFee: number; tip: number; total: number };
})
```

**Step 2: Add breakdown display in the sheet**

Insert between the PaymentElement (line 53) and the Pay button (line 55):

```tsx
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
```

**Step 3: Compute breakdown in PartnerContent and pass to PaymentSheet**

In `PartnerContent`, compute the breakdown before rendering PaymentSheet:

```tsx
const attendaFee = total * 0.10;
const stripeFee = (total + tipAmount) * 0.029 + 0.30;
const grandTotal = total + tipAmount;
```

Pass to PaymentSheet:

```tsx
<PaymentSheet
  clientSecret={paymentClientSecret}
  brandColor={brandColor}
  onCancel={...}
  onSuccess={...}
  breakdown={{ subtotal: total, attendaFee, stripeFee, tip: tipAmount, total: grandTotal }}
/>
```

**Verification:** `npm run build` passes. The Stripe payment sheet shows the breakdown before the guest pays.

---

## Task 3: Update payment-intent API to accept tipCents

**Objective:** The API currently only takes `amountCents`. Add `tipCents` and include it in the PaymentIntent amount and metadata.

**Files:**
- Modify: `src/app/api/stripe/payment-intent/route.ts`

**Step 1: Accept tipCents in the request body**

```tsx
const { requestId, amountCents, tipCents, partnerId, description } = body as {
  requestId: string;
  amountCents: number;
  tipCents?: number;
  partnerId: string;
  description: string;
};
```

**Step 2: Compute total with tip**

```tsx
const totalCents = amountCents + (tipCents || 0);
const { platformFeeCents, vendorPayoutCents } = computeFees(amountCents); // fee only on subtotal, not tip
```

**Step 3: Use totalCents for the PaymentIntent amount**

```tsx
const intentParams: any = {
  amount: totalCents,  // was: amountCents
  // ... rest unchanged
  metadata: {
    request_id: requestId,
    partner_id: partnerId,
    platform_fee_cents: String(platformFeeCents),
    vendor_payout_cents: String(vendorPayoutCents),
    tip_cents: String(tipCents || 0),
    subtotal_cents: String(amountCents),
  },
};
```

**Step 4: Update the requests row with tip info**

```tsx
await db.from('requests').update({
  stripe_payment_intent_id: intent.id,
  stripe_payment_status: 'pending',
  amount_cents: totalCents,
  platform_fee_cents: platformFeeCents,
  vendor_payout_cents: vendorPayoutCents,
  tip_cents: tipCents || 0,
}).eq('id', requestId);
```

**Verification:** `npm run build` passes. The API accepts and processes tipCents.

---

## Task 4: Add Stripe payment to Private Transport

**Objective:** The Private Transport tab currently just creates a pending request with no payment. Add a price input, tip, and Stripe payment flow.

**Files:**
- Modify: `src/app/transport/page.tsx` (the `PrivateTransport` component, lines 481-593)

**Step 1: Add pricing state to PrivateTransport**

Add after existing form state (line 482):

```tsx
const [price, setPrice] = useState<string>('');
const [tipPercent, setTipPercent] = useState<number>(0);
const [tipCustom, setTipCustom] = useState<string>('');
const [stripeEnabled, setStripeEnabled] = useState(false);
const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
```

**Step 2: Check Stripe availability on mount**

Add useEffect:

```tsx
useEffect(() => {
  setStripeEnabled(!!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}, []);
```

**Step 3: Add price input field to the form**

Insert after the "Pax" field and before "Notes":

```tsx
<div>
  <label className="text-[12px] font-semibold text-gray-600 block mb-1">Estimated Price</label>
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-gray-400">$</span>
    <input
      type="number"
      min="0"
      step="0.50"
      placeholder="0.00"
      value={price}
      onChange={e => setPrice(e.target.value)}
      className="w-full bg-gray-50 rounded-xl pl-7 pr-4 py-3 text-[14px] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-200"
    />
  </div>
</div>
```

**Step 4: Add tip selector (reuse pattern from Task 1)**

Insert after the price field:

```tsx
{parseFloat(price) > 0 && (
  <div className="bg-white rounded-xl border border-gray-100 p-3">
    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Add a tip</p>
    <div className="flex gap-2 mb-2">
      {[15, 18, 20].map(pct => (
        <button key={pct} onClick={() => { setTipPercent(pct); setTipCustom(''); }}
          className={`flex-1 py-2 rounded-xl text-[12px] font-bold border-2 ${
            tipPercent === pct && !tipCustom ? 'border-current text-white' : 'border-gray-200 text-gray-600 bg-white'
          }`}
          style={tipPercent === pct && !tipCustom ? { backgroundColor: brandColor, borderColor: brandColor } : {}}
        >{pct}%</button>
      ))}
      <button onClick={() => { setTipPercent(0); setTipCustom(''); }}
        className={`flex-1 py-2 rounded-xl text-[12px] font-bold border-2 ${
          tipPercent === 0 && !tipCustom ? 'border-current text-white' : 'border-gray-200 text-gray-600 bg-white'
        }`}
        style={tipPercent === 0 && !tipCustom ? { backgroundColor: brandColor, borderColor: brandColor } : {}}
      >None</button>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-gray-400">Custom:</span>
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-gray-400">$</span>
        <input type="number" min="0" step="0.50" placeholder="0.00"
          value={tipCustom} onChange={e => { setTipCustom(e.target.value); setTipPercent(0); }}
          className="w-full bg-gray-50 rounded-xl pl-7 pr-3 py-2 border border-gray-200 text-[13px] text-gray-800 outline-none" />
      </div>
    </div>
  </div>
)}
```

**Step 5: Modify handleSubmit to create Stripe payment when price > 0**

Replace the existing `handleSubmit` (lines 487-512) with:

```tsx
const handleSubmit = async () => {
  if (!form.guestName || !form.room) { setError('Name and room are required.'); return; }
  setSubmitting(true); setError('');
  try {
    const hotel = await getHotelConfig();
    const priceNum = parseFloat(price) || 0;
    const tipAmount = tipCustom ? parseFloat(tipCustom) || 0 : priceNum * tipPercent / 100;
    const totalCents = Math.round((priceNum + tipAmount) * 100);

    const { data: requestRow } = await supabase.from('requests').insert({
      hotel_id: hotel?.id || '',
      guest_name: form.guestName,
      room: form.room,
      type: 'Transport',
      details: `${form.destination || 'Private ride'} — ${form.date || 'Today'} ${form.time || ''} · ${form.pax} pax`,
      status: 'pending',
      total_amount: priceNum + tipAmount,
      vendor_payout: +(priceNum * 0.9).toFixed(2),
      stripe_payment_status: stripeEnabled && priceNum > 0 ? 'pending' : 'room_charge',
    }).select('id').single();

    if (stripeEnabled && priceNum > 0 && requestRow) {
      const res = await fetch('/api/stripe/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: requestRow.id,
          amountCents: Math.round(priceNum * 100),
          tipCents: Math.round(tipAmount * 100),
          partnerId: '',
          description: `Transport — Room ${form.room}`,
        }),
      });
      const data = await res.json();
      if (data.ok && data.clientSecret) {
        setPendingRequestId(requestRow.id);
        setPaymentClientSecret(data.clientSecret);
        setSubmitting(false);
        return; // Wait for payment completion
      }
    }

    // No Stripe or payment failed — mark as room charge
    setSent(true);
  } catch (e) {
    setError('Something went wrong. Please try again.');
  }
  setSubmitting(false);
};
```

**Step 6: Add Stripe Elements wrapper and PaymentSheet to PrivateTransport**

At the top of the PrivateTransport component, import Stripe:

```tsx
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
```

Add the stripePromise (reuse from nearby/detail or define locally):

```tsx
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;
```

Add the PaymentSheet overlay at the top of the PrivateTransport return:

```tsx
{paymentClientSecret && stripePromise && (
  <Elements stripe={stripePromise} options={{ clientSecret: paymentClientSecret, appearance: { theme: 'stripe' } }}>
    <PaymentSheet
      clientSecret={paymentClientSecret}
      brandColor={brandColor}
      onCancel={() => { setPaymentClientSecret(null); setPendingRequestId(null); }}
      onSuccess={() => {
        setPaymentClientSecret(null);
        setSent(true);
      }}
      breakdown={{
        subtotal: parseFloat(price) || 0,
        attendaFee: (parseFloat(price) || 0) * 0.10,
        stripeFee: ((parseFloat(price) || 0) + (tipCustom ? parseFloat(tipCustom) || 0 : (parseFloat(price) || 0) * tipPercent / 100)) * 0.029 + 0.30,
        tip: tipCustom ? parseFloat(tipCustom) || 0 : (parseFloat(price) || 0) * tipPercent / 100,
        total: (parseFloat(price) || 0) + (tipCustom ? parseFloat(tipCustom) || 0 : (parseFloat(price) || 0) * tipPercent / 100),
      }}
    />
  </Elements>
)}
```

**Step 7: Extract PaymentSheet into a shared component**

Since both `nearby/detail/page.tsx` and `transport/page.tsx` now use the same PaymentSheet with breakdown, extract it to `src/components/PaymentSheet.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { CreditCard, Lock } from 'lucide-react';

interface FeeBreakdown {
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
      <div className="bg-white w-full max-w-md rounded-t-2xl p-5 pb-8">
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
```

**Step 8: Update nearby/detail/page.tsx to import shared PaymentSheet**

Remove the inline `PaymentSheet` function (lines 15-67) and replace with:

```tsx
import PaymentSheet from '@/components/PaymentSheet';
```

**Verification:** `npm run build` passes with 0 errors. Both food ordering and transport show the payment sheet with fee breakdown.

---

## Task 5: Create a test partner to verify the partner dashboard

**Objective:** Create a real partner row in Supabase so we can test the partner dashboard at `/partner?restaurant=<id>`.

**Files:**
- No code changes — this is a data operation via Supabase

**Step 1: Get the hotel ID for Best Western Fort Lauderdale**

```bash
# Query via Supabase CLI or dashboard
```

**Step 2: Insert a test partner**

```sql
INSERT INTO partners (id, hotel_id, name, category, phone, email, address, hours, description, pin_code, has_ordering, attenda_fee_percent, image_url)
VALUES (
  'test-ocean-grill',
  '<hotel_id>',
  'Ocean Grill Test',
  'restaurant',
  '(954) 555-0199',
  'ocean@test.com',
  '123 Seaside Dr, Fort Lauderdale, FL 33301',
  'Mon-Sun 11:00-22:00',
  'Test restaurant for verifying the partner dashboard.',
  '1234',
  true,
  10,
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&fit=crop'
);
```

**Step 3: Insert test menu items**

```sql
INSERT INTO partner_menu_items (partner_id, name, description, price, category, is_active)
VALUES
  ('test-ocean-grill', 'Fish Tacos', 'Grilled mahi-mahi with mango salsa', 14.99, 'Main', true),
  ('test-ocean-grill', 'Coconut Shrimp', 'Crispy fried with sweet chili sauce', 12.99, 'Starters', true),
  ('test-ocean-grill', 'Key Lime Pie', 'Classic Florida dessert', 8.99, 'Desserts', true);
```

**Step 4: Verify the partner dashboard**

Navigate to `https://attendaapp.com/partner?restaurant=test-ocean-grill`:
1. PIN login screen appears
2. Enter `1234` → dashboard loads
3. Kanban shows "Empty" in all 4 columns
4. Menu & Pricing tab shows the 3 items
5. Business Info tab shows partner details

**Step 5: Place a test order as a guest**

Navigate to `https://attendaapp.com/nearby/detail?id=test-ocean-grill`:
1. Menu items appear with +/- buttons
2. Add items to cart → tip selector appears
3. Hit Place Order → Stripe sheet appears with fee breakdown
4. Pay → redirected to /confirmation
5. Check partner dashboard → order appears in "New" column with sound alert

**Verification:** End-to-end flow works: guest orders → pays → partner sees order in kanban → can advance through statuses.

---

## Task 6: Build and deploy

**Step 1: Run the build**

```bash
cd /Users/thrilzco/Projects/attenda && npm run build
```

Expected: 0 errors, 0 warnings.

**Step 2: Deploy to Vercel**

```bash
cd /Users/thrilzco/Projects/attenda && vercel --prod
```

**Step 3: Verify on production**

- Check `attendaapp.com/nearby/detail?id=test-ocean-grill` — tip selector + fee breakdown
- Check `attendaapp.com/transport` — Private tab has price + Stripe
- Check `attendaapp.com/partner?restaurant=test-ocean-grill` — dashboard works

---

## Risks & Notes

- **Stripe fee display is approximate** — actual Stripe fee is 2.9% + 30¢ for US cards, but varies by card type and region. The breakdown shows "~2.9% + 30¢" to set expectations.
- **Tip goes 100% to vendor** — the 10% Attenda fee is only on the subtotal, not the tip. This is already handled in the payment-intent route (computeFees only on amountCents, not totalCents).
- **PaymentSheet extraction** — extracting the shared component means both pages must import from the same path. Verify the import works in both contexts.
- **Transport page doesn't have a partner_id** — private transport requests don't link to a specific partner. The payment-intent API accepts empty partnerId (Connect transfer is skipped). This is fine for now.
- **Partner dashboard already exists** — the `/partner` page is fully built with PIN auth, real-time kanban, menu view, and business info. Task 5 is purely about creating test data to verify it.
