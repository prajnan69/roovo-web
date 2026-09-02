import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, KeyRound, Wifi, Phone, ShieldCheck, Share2, Copy, Check, Info, Sparkles, Home, User, Calendar as CalendarIcon, Lock, Key } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import supabase, { getListingsByHostId } from '@/services/api';
import { Share as CapShare } from '@capacitor/share';
import { useBackCloseable } from '@/hooks/useBackCloseable';
import RoovoLoader from '@/components/RoovoLoader';

interface CheckInLinkDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    hostId: string;
}

export default function CheckInLinkDrawer({ isOpen, onClose, hostId }: CheckInLinkDrawerProps) {
    useBackCloseable(isOpen, onClose);

    const [listings, setListings] = useState<any[]>([]);
    const [loadingListings, setLoadingListings] = useState(false);

    // Form State
    const [selectedListingId, setSelectedListingId] = useState('');
    const [guestName, setGuestName] = useState('');
    const [guestPhone, setGuestPhone] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [requireImageUpload, setRequireImageUpload] = useState(true);
    const [wifiSsid, setWifiSsid] = useState('');
    const [wifiPassword, setWifiPassword] = useState('');
    const [accessMethod, setAccessMethod] = useState<'smart_lock' | 'lockbox' | 'caretaker' | 'door_code'>('smart_lock');
    const [accessCode, setAccessCode] = useState('');
    const [houseInstructions, setHouseInstructions] = useState('');

    // Result State
    const [generating, setGenerating] = useState(false);
    const [generatedLink, setGeneratedLink] = useState('');
    const [createdCheckIn, setCreatedCheckIn] = useState<any>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');

    // Load saved preferences for this property (Wi-Fi, access code, method, instructions)
    const loadListingPreferences = async (listingId: string) => {
        if (!listingId) return;

        // 1. Instant check from localStorage
        try {
            const cached = localStorage.getItem(`roovo_checkin_pref_${listingId}`);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed.wifiSsid !== undefined) setWifiSsid(parsed.wifiSsid);
                if (parsed.wifiPassword !== undefined) setWifiPassword(parsed.wifiPassword);
                if (parsed.accessMethod) setAccessMethod(parsed.accessMethod);
                if (parsed.accessCode !== undefined) setAccessCode(parsed.accessCode);
                if (parsed.houseInstructions !== undefined) setHouseInstructions(parsed.houseInstructions);
                if (parsed.requireImageUpload !== undefined) setRequireImageUpload(parsed.requireImageUpload);
            }
        } catch (e) {
            console.warn('Error reading cached preferences:', e);
        }

        // 2. Fetch the most recent check_in_link for this listing from Supabase
        try {
            const { data: latestLink } = await supabase
                .from('check_in_links')
                .select('wifi_ssid, wifi_password, access_code, house_instructions, require_image_upload')
                .eq('listing_id', listingId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (latestLink) {
                if (latestLink.wifi_ssid) setWifiSsid(latestLink.wifi_ssid);
                if (latestLink.wifi_password) setWifiPassword(latestLink.wifi_password);
                if (latestLink.access_code) setAccessCode(latestLink.access_code);
                if (latestLink.require_image_upload !== undefined) setRequireImageUpload(latestLink.require_image_upload);

                if (latestLink.house_instructions) {
                    const match = latestLink.house_instructions.match(/^\[Method:\s*([a-z_]+)\]\s*([\s\S]*)$/i);
                    if (match) {
                        setAccessMethod(match[1].toLowerCase() as any);
                        setHouseInstructions(match[2].trim());
                    } else {
                        setHouseInstructions(latestLink.house_instructions);
                    }
                }
            }
        } catch (dbErr) {
            console.warn('Error fetching latest link config:', dbErr);
        }
    };

    useEffect(() => {
        if (selectedListingId) {
            loadListingPreferences(selectedListingId);
        }
    }, [selectedListingId]);

    useEffect(() => {
        if (isOpen && hostId) {
            const loadProperties = async () => {
                setLoadingListings(true);
                setError('');
                try {
                    const data = await getListingsByHostId(hostId);
                    if (Array.isArray(data) && data.length > 0) {
                        setListings(data);
                        setSelectedListingId(data[0].id);
                    }
                } catch (err) {
                    console.error('Failed to load host listings:', err);
                    setError('Failed to load properties');
                } finally {
                    setLoadingListings(false);
                }
            };
            loadProperties();
        } else if (!isOpen) {
            // Reset state
            setGeneratedLink('');
            setCreatedCheckIn(null);
            setError('');
            setCopied(false);
        }
    }, [isOpen, hostId]);

    const handleGenerate = async () => {
        if (!selectedListingId) {
            setError('Please select a property');
            return;
        }

        const cleanedPhone = guestPhone.replace(/\D/g, '');
        if (cleanedPhone.length < 10) {
            setError('Please enter a valid 10-digit guest mobile number');
            return;
        }

        setGenerating(true);
        setError('');
        await triggerHaptic();

        try {
            let record: any = null;

            const formattedInstructions = `[Method: ${accessMethod}] ${houseInstructions.trim()}`;

            // 1. Try backend API first
            try {
                const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://roovo-backend.fly.dev';
                const response = await fetch(`${apiBase}/api/check-in/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        listing_id: selectedListingId,
                        guest_name: guestName.trim() || 'Guest',
                        guest_phone: cleanedPhone,
                        start_date: startDate || null,
                        end_date: endDate || null,
                        require_image_upload: requireImageUpload,
                        wifi_ssid: wifiSsid.trim(),
                        wifi_password: wifiPassword.trim(),
                        access_code: accessCode.trim(),
                        house_instructions: formattedInstructions,
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result && result.id) {
                        record = result;
                    }
                }
            } catch (apiErr) {
                console.warn('Backend API unavailable, using direct Supabase write:', apiErr);
            }

            // 2. Direct Supabase Fallback (guarantees instant success without server delay)
            if (!record) {
                const { data: directInsert, error: dbError } = await supabase
                    .from('check_in_links')
                    .insert({
                        host_id: hostId,
                        listing_id: selectedListingId,
                        guest_name: guestName.trim() || 'Guest',
                        guest_phone: cleanedPhone,
                        start_date: startDate || null,
                        end_date: endDate || null,
                        require_image_upload: requireImageUpload,
                        wifi_ssid: wifiSsid.trim(),
                        wifi_password: wifiPassword.trim(),
                        access_code: accessCode.trim(),
                        house_instructions: formattedInstructions,
                        status: 'pending_verification',
                        requests: []
                    })
                    .select()
                    .single();

                if (dbError) {
                    console.error('Direct Supabase insert error:', dbError);
                    throw dbError;
                }
                record = directInsert;
            }

            // Persist property preferences for subsequent links
            try {
                localStorage.setItem(`roovo_checkin_pref_${selectedListingId}`, JSON.stringify({
                    wifiSsid: wifiSsid.trim(),
                    wifiPassword: wifiPassword.trim(),
                    accessMethod,
                    accessCode: accessCode.trim(),
                    houseInstructions: houseInstructions.trim(),
                    requireImageUpload,
                }));
            } catch (saveErr) {
                console.warn('Could not cache property preferences:', saveErr);
            }

            if (record && record.id) {
                const origin = window.location.origin.includes('localhost') ? 'https://roovo.in' : window.location.origin;
                const linkUrl = `${origin}/check-in/${record.id}`;
                setGeneratedLink(linkUrl);
                setCreatedCheckIn(record);
                await triggerHaptic();
            } else {
                setError('Failed to create check-in link. Please try again.');
            }
        } catch (err: any) {
            console.error('Check-in link error:', err);
            setError(err.message || 'Connection error. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    const handleCopy = async () => {
        if (!generatedLink) return;
        await triggerHaptic();
        try {
            await navigator.clipboard.writeText(generatedLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    const handleShare = async () => {
        if (!generatedLink) return;
        await triggerHaptic();

        const selectedListing = listings.find(l => l.id === selectedListingId);
        const title = selectedListing?.title || selectedListing?.name || 'Your Stay';
        const shareText = `Hey ${guestName || 'there'}! Here is your digital check-in link for ${title}. Tap to complete check-in and access Wi-Fi & in-stay concierge: ${generatedLink}`;

        try {
            await CapShare.share({
                title: `Check-in for ${title}`,
                text: shareText,
                url: generatedLink,
                dialogTitle: 'Share Check-in Link with Guest',
            });
        } catch {
            const waUrl = `https://api.whatsapp.com/send?phone=91${guestPhone.replace(/\D/g, '').slice(-10)}&text=${encodeURIComponent(shareText)}`;
            window.open(waUrl, '_blank');
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
                        onClick={() => {
                            triggerHaptic();
                            onClose();
                        }}
                    />

                    {/* Drawer Content */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-50 max-h-[90vh] flex flex-col shadow-2xl"
                    >
                        {/* Drawer Header */}
                        <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <KeyRound size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">Generate Check-in Link</h2>
                                    <p className="text-xs text-slate-500">Create a digital check-in & in-stay hub for your guest</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { triggerHaptic(); onClose(); }}
                                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Scrollable Form Body */}
                        <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1 pb-10">
                            {error && (
                                <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-600 font-medium flex items-center gap-2">
                                    <Info size={16} className="shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {!generatedLink ? (
                                <>
                                    {/* 1. Property Selector */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                                            <Home size={14} className="text-indigo-500" /> Select Property
                                        </label>
                                        <select
                                            value={selectedListingId}
                                            onChange={(e) => setSelectedListingId(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                            disabled={loadingListings}
                                        >
                                            {listings.map((l) => (
                                                <option key={l.id} value={l.id}>
                                                    {l.title || l.name || 'Listing'} {l.place ? `· ${l.place}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* 2. Guest Info (Phone is locked for security) */}
                                    <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-3.5">
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            <User size={14} className="text-indigo-600" /> Guest Details
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[11px] font-semibold text-slate-500">Guest Name (Optional)</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Rahul Sharma"
                                                value={guestName}
                                                onChange={(e) => setGuestName(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[11px] font-semibold text-slate-500">
                                                Guest Phone Number <span className="text-indigo-600">* (Only this phone can access)</span>
                                            </label>
                                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-indigo-500">
                                                <span className="text-sm font-bold text-slate-400">+91</span>
                                                <input
                                                    type="tel"
                                                    maxLength={10}
                                                    placeholder="9876543210"
                                                    value={guestPhone}
                                                    onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, ''))}
                                                    className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3. Mandatory Image Upload Toggle */}
                                    <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 flex items-center justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-indigo-100/80 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                                                <ShieldCheck size={18} />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-indigo-950">Require Guest Photo / ID</div>
                                                <div className="text-[11px] text-indigo-700/80 mt-0.5">
                                                    Guest must take a selfie or upload ID before check-in unlocks.
                                                </div>
                                            </div>
                                        </div>

                                        {/* Toggle Switch */}
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={requireImageUpload}
                                            onClick={() => {
                                                triggerHaptic();
                                                setRequireImageUpload(!requireImageUpload);
                                            }}
                                            style={{
                                                width: 48,
                                                height: 28,
                                                borderRadius: 9999,
                                                backgroundColor: requireImageUpload ? '#4F46E5' : '#CBD5E1',
                                                position: 'relative',
                                                cursor: 'pointer',
                                                padding: '0 2px',
                                                transition: 'background-color 0.2s ease',
                                                display: 'flex',
                                                alignItems: 'center',
                                                flexShrink: 0,
                                                border: 'none',
                                                outline: 'none',
                                            }}
                                        >
                                            <motion.span
                                                animate={{
                                                    x: requireImageUpload ? 20 : 0,
                                                }}
                                                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                                                style={{
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: 9999,
                                                    backgroundColor: '#FFFFFF',
                                                    boxShadow: '0 2px 5px rgba(0,0,0,0.22)',
                                                    display: 'block',
                                                }}
                                            />
                                        </button>
                                    </div>

                                    {/* 4. Stay Dates (Optional) */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Check-in Date</label>
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Check-out Date</label>
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                    </div>

                                    {/* 5. Wi-Fi Details */}
                                    <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                                                <Wifi size={14} className="text-indigo-600" /> Wi-Fi Network
                                            </div>
                                            <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full">Auto-saved for house</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2.5">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Network Name (SSID)</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Villa-5G"
                                                    value={wifiSsid}
                                                    onChange={(e) => setWifiSsid(e.target.value)}
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Wi-Fi Password</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. guest2026"
                                                    value={wifiPassword}
                                                    onChange={(e) => setWifiPassword(e.target.value)}
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 6. Door Access Method & Instructions */}
                                    <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                                                <KeyRound size={14} className="text-indigo-600" /> Access Type
                                            </div>
                                            <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full">Auto-saved for house</span>
                                        </div>

                                        {/* Method Selector Pills */}
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'smart_lock', label: 'Smart Lock', icon: Lock },
                                                { id: 'lockbox', label: 'Lockbox Safe', icon: KeyRound },
                                                { id: 'door_code', label: 'Door PIN Code', icon: ShieldCheck },
                                                { id: 'caretaker', label: 'Key Handover', icon: Key },
                                            ].map((m) => {
                                                const Icon = m.icon;
                                                const active = accessMethod === m.id;
                                                return (
                                                    <button
                                                        key={m.id}
                                                        type="button"
                                                        onClick={() => {
                                                            triggerHaptic();
                                                            setAccessMethod(m.id as any);
                                                        }}
                                                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                                                            active
                                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        <Icon size={14} />
                                                        <span>{m.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {accessMethod !== 'caretaker' && (
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">
                                                    {accessMethod === 'lockbox' ? 'Lockbox Code / Combination' : accessMethod === 'smart_lock' ? 'Smart Lock PIN / Code' : 'Access Code'}
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder={accessMethod === 'lockbox' ? 'e.g. 4829' : 'e.g. 1234#'}
                                                    value={accessCode}
                                                    onChange={(e) => setAccessCode(e.target.value)}
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 mt-1"
                                                />
                                            </div>
                                        )}

                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">
                                                Instructions for Guest
                                            </label>
                                            <textarea
                                                rows={2}
                                                placeholder={
                                                    accessMethod === 'lockbox'
                                                        ? 'e.g. Lockbox is to the left of the door. Enter code and pull down black lever.'
                                                        : accessMethod === 'smart_lock'
                                                        ? 'e.g. Touch keypad to wake, enter PIN, then turn knob.'
                                                        : accessMethod === 'caretaker'
                                                        ? 'e.g. Caretaker Ramesh (+91 9876543210) will meet you at the gate.'
                                                        : 'e.g. Enter door code at intercom.'
                                                }
                                                value={houseInstructions}
                                                onChange={(e) => setHouseInstructions(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 mt-1 resize-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Error Display */}
                                    {error && (
                                        <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-600 font-medium flex items-center gap-2">
                                            <Info size={16} className="shrink-0" />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    {/* Submit Button */}
                                    <button
                                        onClick={handleGenerate}
                                        disabled={generating}
                                        className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                    >
                                        {generating ? (
                                            <RoovoLoader className="w-8 h-auto" color="#ffffff" />
                                        ) : (
                                            <>
                                                <Sparkles size={18} />
                                                <span>Generate Digital Check-in Link</span>
                                            </>
                                        )}
                                    </button>
                                </>
                            ) : (
                                /* Link Created Success Screen */
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-center py-4 space-y-5"
                                >
                                    <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center ring-8 ring-emerald-50/50">
                                        <Check size={32} />
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Check-in Link Ready!</h3>
                                        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                                            Locked for guest phone: <span className="font-bold text-slate-700">+91 {guestPhone}</span>
                                        </p>
                                    </div>

                                    {/* Link Box */}
                                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between gap-2">
                                        <span className="text-xs font-mono text-slate-600 truncate flex-1 text-left">
                                            {generatedLink}
                                        </span>
                                        <button
                                            onClick={handleCopy}
                                            className="p-2 bg-white rounded-xl shadow-xs border border-slate-200 text-slate-700 hover:bg-slate-100 shrink-0"
                                        >
                                            {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                                        </button>
                                    </div>

                                    {/* Share Actions */}
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <button
                                            onClick={handleShare}
                                            className="py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all"
                                        >
                                            <Share2 size={16} /> Share with Guest
                                        </button>

                                        <button
                                            onClick={handleCopy}
                                            className="py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all"
                                        >
                                            {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied!' : 'Copy Link'}
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => setGeneratedLink('')}
                                        className="text-xs font-semibold text-indigo-600 hover:underline pt-2 block mx-auto"
                                    >
                                        Create another link
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
