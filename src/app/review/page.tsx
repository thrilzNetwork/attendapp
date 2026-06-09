'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Star, CheckCircle, ExternalLink } from 'lucide-react';
import { getHotelConfig } from '@/lib/supabase';
import { goBackToHotel } from '@/lib/guest-context';

export default function ReviewPage() {
  const router = useRouter();
  const [step, setStep] = useState<'rating' | 'feedback' | 'done'>('rating');
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [brandColor, setBrandColor] = useState('#6B1D3C');

  useEffect(() => {
    let cancelled = false;
    getHotelConfig().then(cfg => {
      if (cancelled) return;
      if (cfg?.brandColor) setBrandColor(cfg.brandColor);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleStarClick = (val: number) => {
    setRating(val);
    if (val <= 2) {
      setStep('feedback');
    } else {
      setStep('done');
    }
  };

  const handleSubmitFeedback = async () => {
    const hotel = await getHotelConfig();
    const email = hotel?.notificationEmail;
    const sesh = JSON.parse(localStorage.getItem('guestSession') || '{}');
    const body = `Low guest review.\nRating: ${rating} stars\nFeedback: ${feedback.trim() || 'None'}\nGuest: ${sesh.name || 'Unknown'} Room ${sesh.room || 'N/A'}\nDate: ${new Date().toLocaleString()}`;
    if (email) {
      window.location.href = `mailto:${email}?subject=Attenda - Guest Complaint ${rating} Stars&body=${encodeURIComponent(body)}`;
    }
    setStep('done');
  };

  const openReview = async (url: string) => {
    const hotel = await getHotelConfig();
    if (url === 'google') {
      if (hotel?.googleReviewUrl) window.open(hotel.googleReviewUrl, '_blank');
      else window.open('https://www.google.com/search?q=' + encodeURIComponent(hotel?.name || 'hotel') + '+reviews', '_blank');
    }
    if (url === 'tripadvisor') {
      if (hotel?.tripadvisorUrl) window.open(hotel.tripadvisorUrl, '_blank');
      else window.open('https://www.tripadvisor.com/Search?q=' + encodeURIComponent(hotel?.name || ''), '_blank');
    }
    if (url === 'yelp') {
      if (hotel?.yelpUrl) window.open(hotel.yelpUrl, '_blank');
      else window.open('https://www.yelp.com/search?find_desc=' + encodeURIComponent(hotel?.name || 'hotel'), '_blank');
    }
  };

  const labels = ['','Very Dissatisfied','Dissatisfied','Neutral','Satisfied','Very Satisfied'];
  const labelColors = ['','text-red-500','text-red-400','text-amber-400','text-amber-400',''];
  const getLabelStyle = (val: number) => val === 5 ? { color: brandColor } : {};

  return (
    <div className="h-dvh w-full bg-[#F4F4F5] flex flex-col overflow-hidden">
      <div className="shrink-0 px-5 pt-6 pb-3 flex items-center gap-3 bg-white">
        <button onClick={() => goBackToHotel(router)} className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center active:scale-95"><ArrowLeft size={18} className="text-gray-600" /></button>
        <h1 className="text-lg font-bold text-black">Leave a Review</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pt-4 pb-8">
          {step === 'rating' && (
            <div className="text-center py-8">
              <p className="text-[24px] font-bold text-black mb-2">How was your stay?</p>
              <p className="text-[13px] text-gray-400 mb-8">Tap a star to rate</p>

              <div className="flex justify-center gap-2 mb-6">
                {[1,2,3,4,5].map((s) => (
                  <button key={s} onClick={()=>handleStarClick(s)} onMouseEnter={()=>setHovered(s)} onMouseLeave={()=>setHovered(0)} className="active:scale-90 transition-transform"
                  >
                    <Star size={42} className={s <= (hovered||rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                  </button>
                ))}
              </div>

              {rating > 0 && <p className={`text-[13px] font-semibold ${labelColors[rating]}`} style={getLabelStyle(rating)}>{labels[rating]}</p>}
            </div>
          )}

          {step === 'feedback' && (
            <div className="py-6">
              <div className="text-center mb-6">
                <p className="text-[20px] font-bold text-black mb-1">We&apos;re sorry to hear that</p>
                <p className="text-[13px] text-gray-400">Tell us so we can make it right</p>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
                <textarea
                  value={feedback}
                  onChange={(e)=>setFeedback(e.target.value)}
                  placeholder="What went wrong?"
                  className="w-full bg-gray-50 rounded-xl p-3 text-[14px] text-gray-800 outline-none border border-gray-200 resize-none h-28 placeholder:text-gray-400"
                />
              </div>

              <button
                onClick={handleSubmitFeedback}
                className="w-full py-3.5 rounded-[14px] text-white font-bold text-[15px] active:scale-[0.98]"
                style={{ backgroundColor: brandColor }}
              >
                Submit Feedback to Manager
              </button>
            </div>
          )}

          {step === 'done' && rating >= 3 && (
            <div className="py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <p className="text-[22px] font-bold text-black mb-2">Thank you!</p>
              <p className="text-[13px] text-gray-400 mb-6 px-4">Your feedback helps others. Pick a platform to share your review.</p>

              <div className="space-y-3">
                {[
                  { label: 'Google', icon: 'G', url: 'google' },
                  { label: 'TripAdvisor', icon: 'T', url: 'tripadvisor' },
                  { label: 'Yelp', icon: 'Y', url: 'yelp' },
                ].map((platform) => (
                  <button
                    key={platform.label}
                    onClick={()=>openReview(platform.url)}
                    className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-gray-100 active:scale-[0.98]"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${brandColor}10` }}>
                      <span className="text-[14px] font-bold" style={{ color: brandColor }}>{platform.icon}</span>
                    </div>
                    <span className="flex-1 text-left text-[14px] font-bold text-gray-800">{platform.label}</span>
                    <ExternalLink size={16} className="text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'done' && rating <= 2 && (
            <div className="py-6 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${brandColor}10` }}>
                <CheckCircle size={32} style={{ color: brandColor }} />
              </div>
              <p className="text-[22px] font-bold text-black mb-2">Thank you</p>
              <p className="text-[13px] text-gray-400 mb-6">Your feedback has been sent to management.</p>
              <button
                onClick={()=>router.push('/')}
                className="w-full py-3.5 rounded-[14px] bg-gray-100 text-[15px] font-bold text-gray-700 active:scale-[0.98]"
              >
                Back to Home
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
