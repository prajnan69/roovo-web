import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar as CalendarIcon, DollarSign, ArrowRight, Share2, Copy, Check, Info } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import { getListingsByHostId } from '@/services/api';
import { Share as CapShare } from '@capacitor/share';

interface PaymentLinkDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    hostId: string;
}

export default function PaymentLinkDrawer({ isOpen, onClose, hostId }: PaymentLinkDrawerProps) {
    const [listings, setListings] = useState<any[]>([]);
    const [loadingListings, setLoadingListings] = useState(false);
    
    // Form State
    const [selectedListingId, setSelectedListingId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [priceStr, setPriceStr] = useState('');
    const [guests, setGuests] = useState(1);
    const [includeTax, setIncludeTax] = useState(true);
    const [expiresInHours, setExpiresInHours] = useState(12);

    // Results State
    const [generatedLink, setGeneratedLink] = useState('');
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    // Fetch host properties
    useEffect(() => {
        if (isOpen && hostId) {
            const loadProperties = async () => {
                setLoadingListings(true);
                setError('');
                try {
                    const data = await getListingsByHostId(hostId);
                    if (Array.isArray(data)) {
                        setListings(data);
                        if (data.length > 0) {
                            setSelectedListingId(data[0].id);
                        }
                    }
                } catch (err) {
                    console.error('Failed to load host listings:', err);
                    setError('Failed to load your listings. Please try again.');
                } finally {
                    setLoadingListings(false);
                }
            };
            loadProperties();
        }
    }, [isOpen, hostId]);

    const price = parseFloat(priceStr) || 0;

    // Nights Calculation
    const calculateNights = () => {
        if (!startDate || !endDate) return 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = end.getTime() - start.getTime();
        return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    };
    const nights = calculateNights();

    // Financial Breakdown
    const basePrice = price;
    const taxAmount = includeTax ? Math.round(basePrice * 0.12) : 0;
    const totalPrice = basePrice + taxAmount;
    const roovoFee = Math.round(basePrice * 0.03); // 3% fee
    const hostPayout = basePrice - roovoFee;

    const selectedListing = listings.find(l => l.id === selectedListingId);

    const copyToClipboard = async (text: string) => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                setCopied(true);
            } else {
                // Fallback for non-secure contexts / Capacitor custom schemes
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.top = "0";
                textArea.style.left = "0";
                textArea.style.position = "fixed";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (successful) {
                    setCopied(true);
                } else {
                    throw new Error('execCommand copy returned false');
                }
            }
        } catch (err) {
            console.error('Clipboard copy failed:', err);
            // Alert as fallback if copying fails completely
            alert(`Link generated: ${text}\n(Please copy it manually if it did not save to your clipboard)`);
        }
        setTimeout(() => setCopied(false), 2000);
    };

    const handleGenerate = async () => {
        if (!selectedListingId || !startDate || !endDate || price <= 0 || nights <= 0) return;
        
        triggerHaptic();
        setGenerating(true);
        setError('');
        
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/payment-links`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    listing_id: selectedListingId,
                    start_date: startDate,
                    end_date: endDate,
                    price: basePrice,
                    include_tax: includeTax,
                    guests,
                    expires_in_hours: expiresInHours
                })
            });

            const result = await response.json();

            if (response.ok) {
                const linkId = result.id;
                // If running on mobile/Capacitor, window.location.origin is capacitor://localhost or http://localhost.
                // We should use https://roovo.in for production links, and preserve local development URL for local testing.
                const origin = window.location.origin.includes('localhost') && !window.location.origin.includes('capacitor')
                    ? window.location.origin
                    : 'https://roovo.in';
                const link = `${origin}/pay-link/${linkId}`;
                setGeneratedLink(link);
                // Automatically copy to clipboard since button says "Generate & Copy Link"
                await copyToClipboard(link);
            } else {
                setError(result.error || 'Failed to generate payment link');
            }
        } catch (err) {
            console.error('Error generating link:', err);
            setError('Network error. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    const handleCopy = async () => {
        triggerHaptic();
        await copyToClipboard(generatedLink);
    };

    const handleShare = async () => {
        triggerHaptic();
        try {
            await CapShare.share({
                title: 'Roovo Stay Payment Link',
                text: `Complete your booking for ${selectedListing?.title || 'our property'}`,
                url: generatedLink,
            });
        } catch (err) {
            console.error('Error sharing:', err);
        }
    };

    const handleReset = () => {
        triggerHaptic();
        setGeneratedLink('');
        setStartDate('');
        setEndDate('');
        setPriceStr('');
        setGuests(1);
        setIncludeTax(true);
        setExpiresInHours(12);
        setError('');
    };

    // Auto-reset when drawer closes
    useEffect(() => {
        if (!isOpen) {
            setGeneratedLink('');
            setStartDate('');
            setEndDate('');
            setPriceStr('');
            setGuests(1);
            setIncludeTax(true);
            setExpiresInHours(12);
            setError('');
            setCopied(false);
        }
    }, [isOpen]);

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
                    
                    {/* Drawer */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] z-50 p-6 shadow-2xl pb-10 max-h-[92vh] overflow-y-auto"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold tracking-tight text-slate-900">
                                {generatedLink ? 'Link Generated!' : 'Send Booking Link'}
                            </h2>
                            <button 
                                onClick={() => { triggerHaptic(); onClose(); }} 
                                className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"
                            >
                                <X size={20} className="text-slate-600" />
                            </button>
                        </div>

                        {error && (
                            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-2 text-rose-700 text-sm font-semibold">
                                <Info size={18} className="shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        {!generatedLink ? (
                            <div className="space-y-5">
                                {/* Property Selection */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        Select Property
                                    </label>
                                    {loadingListings ? (
                                        <div className="h-12 w-full bg-slate-50 animate-pulse rounded-2xl border border-slate-100" />
                                    ) : listings.length === 0 ? (
                                        <div className="p-4 bg-amber-50 text-amber-800 text-sm font-semibold rounded-2xl border border-amber-100">
                                            No active properties found. You need at least one listing to generate booking links.
                                        </div>
                                    ) : (
                                        <select
                                            value={selectedListingId}
                                            onChange={(e) => {
                                                triggerHaptic();
                                                setSelectedListingId(e.target.value);
                                            }}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                                        >
                                            {listings.map(l => (
                                                <option key={l.id} value={l.id}>
                                                    {l.title} (₹{l.base_price_weekday || l.price_per_night}/night)
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* Dates */}
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                        <CalendarIcon size={14} /> Date Range
                                    </label>
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="text-[11px] font-medium text-slate-400 mb-1 block">Check-in</label>
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                min={new Date().toISOString().split('T')[0]}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[11px] font-medium text-slate-400 mb-1 block">Check-out</label>
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                min={startDate || new Date().toISOString().split('T')[0]}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Pricing and Tax */}
                                {nights > 0 && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                                <DollarSign size={14} /> Custom Price (₹) for {nights} Night{nights > 1 ? 's' : ''}
                                            </label>
                                            <input
                                                type="number"
                                                value={priceStr}
                                                onChange={(e) => setPriceStr(e.target.value)}
                                                placeholder={`e.g. ${(nights * (selectedListing?.base_price_weekday || 3000)).toLocaleString('en-IN')}`}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-lg font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            />
                                        </div>

                                        {/* Guests & Tax Toggles */}
                                        <div className="flex flex-col gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="text-sm font-bold text-slate-800">Include GST Tax (12%)</span>
                                                    <p className="text-[11px] text-slate-400">Add 12% tax to the final guest price</p>
                                                </div>
                                                <button
                                                    onClick={() => { triggerHaptic(); setIncludeTax(!includeTax); }}
                                                    className={`w-12 h-7 rounded-full transition-colors relative focus:outline-none ${includeTax ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                                >
                                                    <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all ${includeTax ? 'right-1' : 'left-1'}`} />
                                                </button>
                                            </div>

                                            <div className="h-px bg-slate-200 my-1" />

                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="text-sm font-bold text-slate-800">Number of Guests</span>
                                                    <p className="text-[11px] text-slate-400">Specify maximum guest count</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => { triggerHaptic(); setGuests(Math.max(1, guests - 1)); }}
                                                        className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center font-bold text-slate-700 bg-white"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="font-bold text-slate-900 w-4 text-center">{guests}</span>
                                                    <button
                                                        onClick={() => { triggerHaptic(); setGuests(Math.min(selectedListing?.max_guests || 10, guests + 1)); }}
                                                        className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center font-bold text-slate-700 bg-white"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Financial Summary */}
                                        {price > 0 && (
                                            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
                                                <h4 className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-3">Host & Guest Financial Summary</h4>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between items-center text-slate-600">
                                                        <span>Custom Base Price</span>
                                                        <span className="font-medium">₹{basePrice.toLocaleString('en-IN')}</span>
                                                    </div>
                                                    {includeTax && (
                                                        <div className="flex justify-between items-center text-slate-500 text-xs">
                                                            <span>GST Tax (12%)</span>
                                                            <span>+ ₹{taxAmount.toLocaleString('en-IN')}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between items-center text-slate-500 text-xs">
                                                        <span>Roovo Service Fee (3%)</span>
                                                        <span>- ₹{roovoFee.toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <div className="h-px bg-indigo-100/50 my-1" />
                                                    <div className="flex justify-between items-center text-slate-800 font-bold">
                                                        <span>Guest Pays</span>
                                                        <span>₹{totalPrice.toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-indigo-900 font-extrabold text-base">
                                                        <span>Host Payout (You Earn)</span>
                                                        <span>₹{hostPayout.toLocaleString('en-IN')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {/* Expiry Preset */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        Link Expiration
                                    </label>
                                    <select
                                        value={expiresInHours}
                                        onChange={(e) => {
                                            triggerHaptic();
                                            setExpiresInHours(Number(e.target.value));
                                        }}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                                    >
                                        <option value={12}>12 Hours (Recommended)</option>
                                        <option value={1}>1 Hour</option>
                                        <option value={6}>6 Hours</option>
                                        <option value={24}>24 Hours</option>
                                        <option value={48}>48 Hours</option>
                                    </select>
                                </div>

                                <div className="pt-4">
                                    <button
                                        onClick={handleGenerate}
                                        disabled={generating || !selectedListingId || !startDate || !endDate || price <= 0 || nights <= 0}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4.5 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:bg-slate-100 disabled:text-slate-400 transition-all active:scale-[0.98] shadow-lg shadow-indigo-100"
                                    >
                                        {generating ? 'Generating Link...' : 'Generate & Copy Link'} <ArrowRight size={18} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Success State */
                            <div className="space-y-6 py-4 text-center">
                                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                                    <Check size={32} strokeWidth={2.5} />
                                </div>
                                
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Custom Payment Link Ready</h3>
                                    <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                                        Send this link to the guest. It will automatically expire in <b>{expiresInHours} hours</b>.
                                    </p>
                                </div>

                                {/* Link Output Box */}
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between text-left gap-4">
                                    <span className="text-sm font-bold text-slate-700 truncate flex-1">
                                        {generatedLink}
                                    </span>
                                    <button 
                                        onClick={handleCopy}
                                        className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 shrink-0"
                                    >
                                        {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                                    </button>
                                </div>

                                {/* Share Buttons */}
                                <div className="flex gap-4 pt-2">
                                    <button
                                        onClick={handleShare}
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                    >
                                        <Share2 size={18} /> Share Link
                                    </button>
                                    <button
                                        onClick={handleReset}
                                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-4 rounded-2xl font-bold flex items-center justify-center transition-all active:scale-[0.98]"
                                    >
                                        Create New Link
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
