import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, KeyRound, Wifi, Phone, ShieldCheck, Share2, Copy, Check, 
    Info, Sparkles, Home, User, Calendar as CalendarIcon, Lock, 
    Key, Camera, Eye, Clock, ExternalLink 
} from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import supabase, { getListingsByHostId } from '@/services/api';
import { Share as CapShare } from '@capacitor/share';
import { useBackCloseable } from '@/hooks/useBackCloseable';
import RoovoLoader from '@/components/RoovoLoader';

interface CheckInLinkDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    hostId: string;
    initialTab?: 'create' | 'links';
}

export default function CheckInLinkDrawer({ isOpen, onClose, hostId, initialTab = 'create' }: CheckInLinkDrawerProps) {
    useBackCloseable(isOpen, onClose);

    const [listings, setListings] = useState<any[]>([]);
    const [loadingListings, setLoadingListings] = useState(false);

    // Tab State: Create Link vs Active Links
    const [drawerTab, setDrawerTab] = useState<'create' | 'links'>(initialTab || 'create');
    const [activeLinks, setActiveLinks] = useState<any[]>([]);
    const [loadingLinks, setLoadingLinks] = useState(false);
    const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<{ url: string; guestName: string; uploadedAt?: string } | null>(null);
    const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

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

    // Load Active Check-in Links for Host
    const loadActiveLinks = async () => {
        if (!hostId) return;
        setLoadingLinks(true);
        try {
            // 1. Try Backend API
            try {
                const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://roovo-backend.fly.dev';
                const res = await fetch(`${apiBase}/api/check-in/host/${hostId}/links`);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data.links)) {
                        setActiveLinks(data.links);
                        setLoadingLinks(false);
                        return;
                    }
                }
            } catch (e) {
                console.warn('Backend links fetch error, using Supabase fallback:', e);
            }

            // 2. Direct Supabase fallback
            const { data: dbLinks } = await supabase
                .from('check_in_links')
                .select('id, host_id, listing_id, guest_name, guest_phone, require_image_upload, guest_image_url, image_uploaded_at, start_date, end_date, status, checked_in_at, created_at')
                .eq('host_id', hostId)
                .order('created_at', { ascending: false });

            if (dbLinks) {
                setActiveLinks(dbLinks);
            }
        } catch (err) {
            console.error('Failed to load active check-in links:', err);
        } finally {
            setLoadingLinks(false);
        }
    };

    useEffect(() => {
        if (isOpen && hostId) {
            loadActiveLinks();
            if (initialTab) setDrawerTab(initialTab);

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

            // Realtime subscription for instant updates when guest uploads photo
            const channel = supabase
                .channel(`host_checkin_drawer_${hostId}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'check_in_links', filter: `host_id=eq.${hostId}` },
                    () => {
                        loadActiveLinks();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        } else if (!isOpen) {
            // Reset state
            setGeneratedLink('');
            setCreatedCheckIn(null);
            setError('');
            setCopied(false);
        }
    }, [isOpen, hostId, initialTab]);

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
                await loadActiveLinks();
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
                        {/* Drawer Header & Tabs */}
                        <div className="px-6 pt-6 pb-3 border-b border-slate-100 space-y-3">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                        <KeyRound size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Check-in & Verification</h2>
                                        <p className="text-xs text-slate-500">Create digital links & monitor guest verification photos</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { triggerHaptic(); onClose(); }}
                                    className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Segmented Control Tabs */}
                            <div className="flex bg-slate-100 p-1 rounded-2xl">
                                <button
                                    onClick={() => { triggerHaptic(); setDrawerTab('create'); }}
                                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                                        drawerTab === 'create'
                                            ? 'bg-white text-slate-900 shadow-xs'
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    Create Link
                                </button>
                                <button
                                    onClick={() => { triggerHaptic(); setDrawerTab('links'); loadActiveLinks(); }}
                                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                        drawerTab === 'links'
                                            ? 'bg-white text-slate-900 shadow-xs'
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    <span>Active Links & Photos</span>
                                    {activeLinks.length > 0 && (
                                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white leading-none">
                                            {activeLinks.length}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Scrollable Body */}
                        <div className="overflow-y-auto px-6 py-5 flex-1 pb-10">
                            {drawerTab === 'links' ? (
                                <div className="space-y-3 pb-8">
                                    {loadingLinks ? (
                                        <div className="py-16 flex flex-col items-center justify-center">
                                            <RoovoLoader className="w-10 h-auto" color="#4f46e5" />
                                            <p className="text-xs text-slate-400 mt-2 font-medium">Loading check-in links...</p>
                                        </div>
                                    ) : activeLinks.length === 0 ? (
                                        <div className="py-14 text-center space-y-3">
                                            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                                                <KeyRound size={24} />
                                            </div>
                                            <p className="text-sm font-bold text-slate-800">No Check-in Links Yet</p>
                                            <p className="text-xs text-slate-500 max-w-xs mx-auto">
                                                Generate digital check-in links for your guests with optional ID / selfie verification.
                                            </p>
                                            <button
                                                onClick={() => { triggerHaptic(); setDrawerTab('create'); }}
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-indigo-700"
                                            >
                                                Create Your First Link
                                            </button>
                                        </div>
                                    ) : (
                                        activeLinks.map((link) => {
                                            const isCheckedIn = link.status === 'checked_in';
                                            const hasPhoto = Boolean(link.guest_image_url);
                                            const matchedListing = listings.find(l => l.id === link.listing_id);
                                            const listingTitle = link.listing_title || matchedListing?.title || matchedListing?.name || 'Your Property';
                                            const origin = typeof window !== 'undefined' ? (window.location.origin.includes('localhost') ? 'https://roovo.in' : window.location.origin) : 'https://roovo.in';
                                            const linkUrl = `${origin}/check-in/${link.id}`;

                                            return (
                                                <div
                                                    key={link.id}
                                                    className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3"
                                                >
                                                    {/* Header Row */}
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 truncate block">
                                                                {listingTitle}
                                                            </span>
                                                            <h4 className="text-sm font-bold text-slate-900 truncate">
                                                                {link.guest_name || 'Guest'}
                                                            </h4>
                                                            <p className="text-xs text-slate-500 font-medium">
                                                                +91 {link.guest_phone}
                                                                {link.start_date && (
                                                                    <span> · {new Date(link.start_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                                                )}
                                                            </p>
                                                        </div>

                                                        {/* Status Badge */}
                                                        <div>
                                                            {isCheckedIn ? (
                                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 shadow-2xs">
                                                                    <Check size={11} strokeWidth={3} /> Checked In
                                                                </span>
                                                            ) : hasPhoto ? (
                                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1 shadow-2xs">
                                                                    <ShieldCheck size={11} /> Photo Verified
                                                                </span>
                                                            ) : link.require_image_upload ? (
                                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 shadow-2xs">
                                                                    <Clock size={11} /> Awaiting Photo
                                                                </span>
                                                            ) : (
                                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-200 text-slate-700">
                                                                    Pending Check-in
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Guest Photo Preview Section */}
                                                    <div className="p-3 bg-white rounded-xl border border-slate-100 flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            {hasPhoto ? (
                                                                <div
                                                                    onClick={() => {
                                                                        triggerHaptic();
                                                                        setSelectedPhotoPreview({
                                                                            url: link.guest_image_url,
                                                                            guestName: link.guest_name || 'Guest',
                                                                            uploadedAt: link.image_uploaded_at,
                                                                        });
                                                                    }}
                                                                    className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-emerald-400 shrink-0 cursor-pointer shadow-xs active:scale-95 group"
                                                                >
                                                                    <img
                                                                        src={link.guest_image_url}
                                                                        alt="Guest photo"
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                    <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                                                        <Eye size={14} />
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 shrink-0 flex flex-col items-center justify-center text-slate-400">
                                                                    <Camera size={16} />
                                                                </div>
                                                            )}

                                                            <div className="min-w-0">
                                                                <p className="text-xs font-bold text-slate-800">
                                                                    {hasPhoto ? 'Guest Photo Verified' : link.require_image_upload ? 'Photo Required' : 'No Photo Required'}
                                                                </p>
                                                                <p className="text-[11px] text-slate-500 truncate">
                                                                    {hasPhoto ? (
                                                                        link.image_uploaded_at ? `Uploaded ${new Date(link.image_uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Uploaded to Cloudflare R2'
                                                                    ) : link.require_image_upload ? (
                                                                        'Guest must upload selfie before check-in'
                                                                    ) : (
                                                                        'Host turned verification requirement off'
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {hasPhoto && (
                                                            <button
                                                                onClick={() => {
                                                                    triggerHaptic();
                                                                    setSelectedPhotoPreview({
                                                                        url: link.guest_image_url,
                                                                        guestName: link.guest_name || 'Guest',
                                                                        uploadedAt: link.image_uploaded_at,
                                                                    });
                                                                }}
                                                                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1 border border-emerald-200 transition-colors shrink-0"
                                                            >
                                                                <Eye size={12} />
                                                                <span>View</span>
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Actions Row */}
                                                    <div className="flex items-center gap-2 pt-1">
                                                        <button
                                                            onClick={async () => {
                                                                triggerHaptic();
                                                                try {
                                                                    await navigator.clipboard.writeText(linkUrl);
                                                                    setCopiedLinkId(link.id);
                                                                    setTimeout(() => setCopiedLinkId(null), 2000);
                                                                } catch (e) {
                                                                    console.error(e);
                                                                }
                                                            }}
                                                            className="flex-1 py-2 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                                                        >
                                                            {copiedLinkId === link.id ? (
                                                                <>
                                                                    <Check size={14} className="text-emerald-600" />
                                                                    <span className="text-emerald-600">Copied!</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Copy size={14} />
                                                                    <span>Copy Link</span>
                                                                </>
                                                            )}
                                                        </button>

                                                        <button
                                                            onClick={async () => {
                                                                triggerHaptic();
                                                                const shareText = `Hey ${link.guest_name || 'there'}! Here is your digital check-in link for ${listingTitle}: ${linkUrl}`;
                                                                try {
                                                                    await CapShare.share({
                                                                        title: `Check-in for ${listingTitle}`,
                                                                        text: shareText,
                                                                        url: linkUrl,
                                                                    });
                                                                } catch {
                                                                    const waUrl = `https://api.whatsapp.com/send?phone=91${link.guest_phone}&text=${encodeURIComponent(shareText)}`;
                                                                    window.open(waUrl, '_blank');
                                                                }
                                                            }}
                                                            className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                                                        >
                                                            <Share2 size={14} />
                                                            <span>WhatsApp</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            ) : (
                                /* Create Link Form & Success Screen */
                                <div className="space-y-5">
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
                                                    <label className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                                                        <span>Guest Mobile Number (Mandatory)</span>
                                                        <span className="text-[10px] text-indigo-600 font-bold">10 Digits</span>
                                                    </label>
                                                    <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-indigo-500">
                                                        <span className="text-xs font-bold text-slate-400 mr-2">+91</span>
                                                        <input
                                                            type="tel"
                                                            maxLength={10}
                                                            placeholder="9876543210"
                                                            value={guestPhone}
                                                            onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, ''))}
                                                            className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 3. Dates */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-bold text-slate-600 uppercase">Check-in Date</label>
                                                    <input
                                                        type="date"
                                                        value={startDate}
                                                        onChange={(e) => setStartDate(e.target.value)}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-bold text-slate-600 uppercase">Check-out Date</label>
                                                    <input
                                                        type="date"
                                                        value={endDate}
                                                        onChange={(e) => setEndDate(e.target.value)}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                                    />
                                                </div>
                                            </div>

                                            {/* 4. Verification Policy */}
                                            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center justify-between">
                                                <div className="space-y-0.5 pr-4">
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                                                        <ShieldCheck size={16} className="text-indigo-600" />
                                                        <span>Mandatory Guest Photo / Selfie</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500">
                                                        Guest must capture a live photo before digital check-in is unlocked.
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        triggerHaptic();
                                                        setRequireImageUpload(!requireImageUpload);
                                                    }}
                                                    className={`w-12 h-6 rounded-full transition-colors relative ${
                                                        requireImageUpload ? 'bg-indigo-600' : 'bg-slate-300'
                                                    }`}
                                                >
                                                    <motion.div
                                                        animate={{ x: requireImageUpload ? 26 : 2 }}
                                                        className="w-5 h-5 rounded-full bg-white shadow-xs absolute top-0.5"
                                                    />
                                                </button>
                                            </div>

                                            {/* 5. Wi-Fi Credentials */}
                                            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                                                        <Wifi size={14} className="text-indigo-600" /> Property Wi-Fi
                                                    </div>
                                                    <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full">Auto-saved for house</span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Network Name (SSID)</label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. Villa_5G"
                                                            value={wifiSsid}
                                                            onChange={(e) => setWifiSsid(e.target.value)}
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Password</label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. secret123"
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
                            )}
                        </div>
                    </motion.div>

                    {/* Fullscreen Photo Lightbox Modal */}
                    {selectedPhotoPreview && (
                        <div
                            className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4"
                            onClick={() => setSelectedPhotoPreview(null)}
                        >
                            <div
                                className="bg-white rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl space-y-3"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="relative aspect-4/3 bg-slate-100">
                                    <img
                                        src={selectedPhotoPreview.url}
                                        alt={selectedPhotoPreview.guestName}
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        onClick={() => setSelectedPhotoPreview(null)}
                                        className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                                <div className="p-4 pt-1 flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900">
                                            {selectedPhotoPreview.guestName}
                                        </h4>
                                        <p className="text-xs text-slate-500">
                                            Verified Guest Photo
                                            {selectedPhotoPreview.uploadedAt && ` · ${new Date(selectedPhotoPreview.uploadedAt).toLocaleDateString()}`}
                                        </p>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                        <Check size={12} strokeWidth={3} /> Verified
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </AnimatePresence>
    );
}
