"use client";

import { useState, forwardRef, useEffect, useRef } from 'react';
import { triggerHaptic } from '@/lib/haptics';
import { Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BookingDrawerContentProps {
  onApply: (dates: { checkIn: Date | null; checkOut: Date | null }, guests: number) => void;
  max_guests: number;
  initialDates?: { checkIn: Date | null; checkOut: Date | null };
  initialGuests?: number;
  onChange?: (dates: { checkIn: Date | null; checkOut: Date | null }, guests: number) => void;
  bookings?: any[];
}

// ── Date strip (90 days) ──
const DateStrip = ({ selected, onSelect, isDateDisabled }: { selected: string; onSelect: (k: string) => void; isDateDisabled?: (k: string) => boolean }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  const days = Array.from({ length: 90 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  useEffect(() => {
    if (containerRef.current && selected) {
      const selectedEl = containerRef.current.querySelector(`[data-date="${selected}"]`) as HTMLElement;
      if (selectedEl) {
        const container = containerRef.current;
        const scrollLeft = selectedEl.offsetLeft - container.offsetWidth / 2 + selectedEl.offsetWidth / 2;
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  }, [selected]);

  return (
    <div 
      ref={containerRef}
      style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 0 4px', scrollbarWidth: 'none', scrollSnapType: 'x proximity' }}
    >
      {days.map((d) => {
        const key = d.toISOString().split('T')[0];
        const on = selected === key;
        const disabled = isDateDisabled ? isDateDisabled(key) : false;
        return (
          <button 
            key={key} 
            data-date={key}
            disabled={disabled}
            onClick={() => { triggerHaptic(); onSelect(key); }}
            style={{ 
              flexShrink: 0, width: 52, height: 72, borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, 
              border: on ? '1.5px solid #4F46E5' : '1.5px solid rgba(0,0,0,0.10)', 
              background: disabled ? '#EAE8E4' : (on ? '#4F46E5' : '#F8F7F4'), 
              opacity: disabled ? 0.38 : 1,
              transition: 'all .2s', 
              boxShadow: on ? '0 8px 32px rgba(79,70,229,.30)' : 'none', scrollSnapAlign: 'center',
              cursor: disabled ? 'not-allowed' : 'pointer'
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 600, color: on ? 'rgba(255,255,255,.8)' : (disabled ? '#BBBBB4' : '#888880'), letterSpacing: '.04em', textTransform: 'uppercase' }}>
              {d.toLocaleDateString('en-IN', { weekday: 'short' })}
            </span>
            <span style={{ fontSize: 20, fontWeight: 800, color: on ? '#fff' : (disabled ? '#BBBBB4' : '#0A0A09'), letterSpacing: '-.02em', lineHeight: 1 }}>
              {d.getDate()}
            </span>
            <span style={{ fontSize: 10, fontWeight: 500, color: on ? 'rgba(255,255,255,.7)' : (disabled ? '#BBBBB4' : '#888880') }}>
              {d.toLocaleDateString('en-IN', { month: 'short' })}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// ── Counter row ──
const CounterRow = ({ label, sub, val, setVal, min = 0, max = 20 }: { label: string; sub: string; val: number; setVal: (n: number) => void; min?: number; max?: number }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid rgba(0,0,0,0.065)' }}>
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#0A0A09' }}>{label}</div>
      <div style={{ fontSize: 12, color: '#888880', marginTop: 1 }}>{sub}</div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <button onClick={() => { triggerHaptic(); setVal(Math.max(min, val - 1)); }}
        style={{ width: 36, height: 36, borderRadius: '9999px', border: '1.5px solid rgba(0,0,0,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: val <= min ? '#F4F3F0' : '#fff', fontSize: 20, color: val <= min ? '#BBBBB4' : '#0A0A09', cursor: 'pointer' }}>
        −
      </button>
      <span style={{ fontSize: 18, fontWeight: 700, color: '#0A0A09', minWidth: 24, textAlign: 'center', letterSpacing: '-.02em' }}>{val}</span>
      <button onClick={() => { if (val < max) triggerHaptic(); setVal(Math.min(max, val + 1)); }}
        style={{ width: 36, height: 36, borderRadius: '9999px', border: val >= max ? '1.5px solid rgba(0,0,0,0.10)' : '1.5px solid #4F46E5', background: val >= max ? '#F4F3F0' : '#EEEEFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: val >= max ? '#BBBBB4' : '#4F46E5', cursor: val >= max ? 'not-allowed' : 'pointer' }}>
        +
      </button>
    </div>
  </div>
);

const BookingDrawerContent = forwardRef<HTMLDivElement, BookingDrawerContentProps>(
  ({ onApply, max_guests, initialDates, initialGuests, onChange, bookings = [] }, ref) => {
    const [step, setStep] = useState(0); // 0=dates, 1=guests
    const steps = ['Dates', 'Guests'];

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const isDateBooked = (dateStr: string) => {
      if (!bookings || bookings.length === 0) return false;
      return bookings.some((b: any) => {
        return dateStr >= b.start_date && dateStr < b.end_date;
      });
    };

    const isCheckInDisabled = (dateStr: string) => {
      return isDateBooked(dateStr);
    };

    const isCheckOutDisabled = (dateStr: string) => {
      if (dateStr <= checkIn) return true;
      if (!bookings || bookings.length === 0) return false;
      return bookings.some((b: any) => {
        return b.start_date >= checkIn && b.start_date < dateStr;
      });
    };

    const getFirstAvailableCheckIn = () => {
      const start = new Date();
      for (let i = 0; i < 90; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        if (!isDateBooked(dateStr)) {
          return dateStr;
        }
      }
      return today;
    };

    const getFirstAvailableCheckOut = (checkInStr: string) => {
      const dIn = new Date(checkInStr);
      const dOut = new Date(dIn);
      dOut.setDate(dIn.getDate() + 1);
      const dateStr = dOut.toISOString().split('T')[0];
      return dateStr;
    };

    const [checkIn, setCheckIn] = useState(() => {
      if (initialDates?.checkIn) {
        return initialDates.checkIn.toISOString().split('T')[0];
      }
      return getFirstAvailableCheckIn();
    });

    const [checkOut, setCheckOut] = useState(() => {
      if (initialDates?.checkOut) {
        return initialDates.checkOut.toISOString().split('T')[0];
      }
      return getFirstAvailableCheckOut(checkIn);
    });

    const [adults, setAdults] = useState(() => Math.max(1, Math.min(initialGuests || 2, max_guests || 1)));
    const [children, setChildren] = useState(0);

    const nights = Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)));

    // Sync checkOut when checkIn changes, ensuring we don't land on a booked or invalid checkout date
    useEffect(() => {
      if (checkIn && checkOut) {
        const dIn = new Date(checkIn);
        const dOut = new Date(checkOut);
        if (dOut <= dIn || isCheckOutDisabled(checkOut)) {
          const nextDay = new Date(dIn);
          nextDay.setDate(nextDay.getDate() + 1);
          setCheckOut(nextDay.toISOString().split('T')[0]);
        }
      }
    }, [checkIn]);

    // Handle updates when bookings load or initialDates changes.
    // Keyed on the date VALUES, not the initialDates object identity: the
    // parent re-creates initialDates every render, echoing our own onChange
    // one render late. Identity-keying made this effect adopt that stale
    // echo, fighting the checkout auto-correction effect above in an
    // infinite ping-pong (React #185).
    const toDateKey = (d?: Date | null) =>
      d && !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : null;
    const initCheckIn = toDateKey(initialDates?.checkIn);
    const initCheckOut = toDateKey(initialDates?.checkOut);
    useEffect(() => {
      if (initCheckIn && initCheckOut) {
        setCheckIn(initCheckIn);
        setCheckOut(initCheckOut);
      } else if (bookings && bookings.length > 0) {
        const availCheckIn = getFirstAvailableCheckIn();
        setCheckIn(availCheckIn);
        const availCheckOut = getFirstAvailableCheckOut(availCheckIn);
        setCheckOut(availCheckOut);
      }
    }, [bookings, initCheckIn, initCheckOut]);

    // Propagate changes up to parent component dynamically.
    // onChange is read through a ref so a new function identity from the
    // parent (re-created each render) can't re-trigger this effect — that
    // caused an infinite onChange -> setState -> render loop (React #185).
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    useEffect(() => {
      if (onChangeRef.current) {
        onChangeRef.current(
          { checkIn: new Date(checkIn), checkOut: new Date(checkOut) },
          adults + children
        );
      }
    }, [checkIn, checkOut, adults, children]);

    const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

    const handleConfirm = () => {
      triggerHaptic();
      onApply(
        { checkIn: new Date(checkIn), checkOut: new Date(checkOut) },
        adults + children
      );
    };

    return (
      <div ref={ref}>
        {/* Drag handle */}
        <div style={{ width: 44, height: 4, background: 'rgba(0,0,0,.17)', borderRadius: 99, margin: '14px auto 0', opacity: 0.5 }} />

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '18px 24px 0' }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 28, height: 28, borderRadius: '9999px', background: i <= step ? '#4F46E5' : '#EEEDE9', border: i === step ? '2px solid #4F46E5' : '2px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .3s' }}>
                  {i < step
                    ? <Check size={13} color="#fff" strokeWidth={3} />
                    : <span style={{ fontSize: 12, fontWeight: 700, color: i <= step ? '#fff' : '#888880' }}>{i + 1}</span>
                  }
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: i === step ? '#4F46E5' : '#BBBBB4', letterSpacing: '.03em', textTransform: 'uppercase' }}>{s}</span>
              </div>
              {i < steps.length - 1 && <div style={{ width: 32, height: 1.5, background: i < step ? '#4F46E5' : 'rgba(0,0,0,0.10)', borderRadius: 99, marginBottom: 18, transition: 'background .3s' }} />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div style={{ padding: '24px 24px 0' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              style={{ width: '100%' }}
            >
              {/* STEP 0 — DATES */}
              {step === 0 && (
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#0A0A09', letterSpacing: '-.03em', fontFamily: "'Playfair Display', Georgia, serif", marginBottom: 6 }}>When are you staying?</div>
                  <div style={{ fontSize: 13, color: '#888880', marginBottom: 20 }}>Prices vary by date — pick your window</div>
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#888880', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>Check in</div>
                    <DateStrip selected={checkIn} onSelect={setCheckIn} isDateDisabled={isCheckInDisabled} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#888880', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>Check out</div>
                    <DateStrip selected={checkOut} onSelect={setCheckOut} isDateDisabled={isCheckOutDisabled} />
                  </div>
                  <div style={{ marginTop: 20, padding: '14px 16px', background: '#EEEEFF', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: '#4F46E5', fontWeight: 600 }}>{fmtDate(checkIn)} → {fmtDate(checkOut)}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#4F46E5' }}>{nights} {nights === 1 ? 'night' : 'nights'}</span>
                  </div>
                </div>
              )}

              {/* STEP 1 — GUESTS */}
              {step === 1 && (
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#0A0A09', letterSpacing: '-.03em', fontFamily: "'Playfair Display', Georgia, serif", marginBottom: 6 }}>Who's coming?</div>
                  <div style={{ fontSize: 13, color: '#888880', marginBottom: 20 }}>Max {max_guests} guests</div>
                  {/* Each row's cap leaves room for the other, so adults+children can never exceed max_guests */}
                  <CounterRow label="Adults" sub="Age 13+" val={adults} setVal={setAdults} min={1} max={Math.max(1, max_guests - children)} />
                  <CounterRow label="Children" sub="Ages 2–12" val={children} setVal={setChildren} max={Math.max(0, max_guests - adults)} />
                  <div style={{ marginTop: 20, padding: '14px 16px', background: '#F4F3F0', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888880" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    <span style={{ fontSize: 13, color: '#3A3A37', fontWeight: 500 }}>{adults + children} guest{adults + children !== 1 ? 's' : ''} selected</span>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>


        {/* Action bar */}
        <div style={{ padding: '20px 24px 36px', display: 'flex', gap: 12, marginTop: 8 }}>
          {step > 0 && (
            <button onClick={() => { triggerHaptic(); setStep(s => s - 1); }}
              style={{ flex: 1, padding: 16, borderRadius: 18, background: '#F4F3F0', fontSize: 14, fontWeight: 600, color: '#3A3A37', border: '1px solid rgba(0,0,0,0.10)', cursor: 'pointer' }}>
              Back
            </button>
          )}
          <button onClick={() => {
            triggerHaptic();
            if (step < steps.length - 1) setStep(s => s + 1);
            else handleConfirm();
          }}
            style={{ flex: 2, padding: 16, borderRadius: 18, background: 'linear-gradient(135deg,#4F46E5,#6D28D9)', color: '#fff', fontWeight: 800, fontSize: 15, boxShadow: '0 8px 32px rgba(79,70,229,.30)', border: 'none', letterSpacing: '-.01em', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent)', transform: 'translateX(-100%)', animation: 'goldshine 3s ease 2s infinite' }} />
            <span style={{ position: 'relative' }}>
              {step === steps.length - 1 ? 'Check Availability' : 'Choose guests'}
            </span>
          </button>
        </div>
      </div>
    );
  }
);

BookingDrawerContent.displayName = "BookingDrawerContent";

export default BookingDrawerContent;
