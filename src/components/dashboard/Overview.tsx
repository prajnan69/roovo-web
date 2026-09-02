import { useState, useEffect, useMemo } from "react";
import { motion, useScroll, useTransform, AnimatePresence, MotionValue } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SlidingNumber } from "@/components/ui/shadcn-io/sliding-number";
import { 
  ChevronRight, CreditCard, ShieldCheck, MessageSquare, CheckCircle2, 
  Sparkles, KeyRound, AlertTriangle, Phone, Check, Clock, Bell, MessageCircle 
} from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { usePreloadedData } from "@/context/PreloadContext";
import supabase, { fetchHostState, fetchHostDrafts } from "@/services/api";
import { useNavigation } from "@/hooks/useNavigation";
import ImportListingPage from "../import/ImportListingPage";
import PaymentLinkDrawer from "./PaymentLinkDrawer";
import CheckInLinkDrawer from "./CheckInLinkDrawer";

interface ActionCardProps {
  title: string;
  description: string;
  buttonText: string;
  icon: any;
  onButtonClick: () => void;
  index: number;
  priority?: 'high' | 'normal';
}

interface Notification {
  title: string;
  description: string;
  buttonText: string;
  icon: any;
  action: () => void;
  priority?: 'high' | 'normal';
}

interface HostState {
  trial_remaining: number;
  kyc_verified: boolean;
  payout_method: string | null;
  payout_details: any;
  subscription_status: string;
  trial_started_at: string;
  pending_messages?: number;
}

// --- Components ---

const ActionCard: React.FC<ActionCardProps> = ({
  title,
  description,
  buttonText,
  icon: Icon,
  onButtonClick,
  index,
  priority = 'normal',
}) => {
  const handlePress = () => {
    triggerHaptic().catch(() => { });
    onButtonClick();
  };

  const isHighPriority = priority === 'high';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className={`relative overflow-hidden rounded-3xl p-5 mb-4 border transition-all duration-200 active:scale-[0.98] ${isHighPriority
        ? 'bg-white border-indigo-100 shadow-[0_8px_30px_rgb(79,70,229,0.12)]'
        : 'bg-white border-gray-100 shadow-sm'
        }`}
    >
      {isHighPriority && (
        <div className="absolute top-0 right-0 p-3">
          <span className="flex h-2 w-2">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-2xl ${isHighPriority ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-600'}`}>
          <Icon size={24} />
        </div>
        <div className="flex-1">
          <h3 className={`text-lg font-bold ${isHighPriority ? 'text-indigo-950' : 'text-gray-900'}`}>{title}</h3>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      <Button
        onClick={handlePress}
        className={`mt-5 w-full rounded-xl py-6 flex justify-between group shadow-none transition-all ${isHighPriority
          ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
          : 'bg-gray-900 text-white hover:bg-gray-800'
          }`}
      >
        <span className="font-semibold">{buttonText}</span>
        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </Button>
    </motion.div >
  );
};

const StatsSection = ({ scrollY, trialRemaining }: { scrollY: MotionValue<number>, trialRemaining: number | null }) => {
  // Parallax effects
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const scale = useTransform(scrollY, [0, 300], [1, 0.9]);
  const y = useTransform(scrollY, [0, 300], [0, 50]);

  const showFlatFee = trialRemaining !== null && trialRemaining <= 0;

  return (
    <motion.div
      style={{ opacity, scale, y }}
      className="fixed top-0 left-0 right-0 h-[60vh] flex flex-col items-center justify-center px-6 bg-linear-to-b from-indigo-50/80 via-white to-white z-0"
    >
      <div className="w-full max-w-md text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-indigo-100 rounded-full shadow-sm mb-8"
        >
          <div className={`w-2 h-2 rounded-full ${showFlatFee ? 'bg-emerald-500' : 'bg-indigo-500 animate-pulse'}`} />
          <span className="text-xs font-bold tracking-wide uppercase text-indigo-950">
            {showFlatFee ? 'Standard Plan Active' : 'Trial Active'}
          </span>
        </motion.div>

        <div className="flex flex-col items-center">
          <div className="relative flex items-center justify-center py-4">
            <span className="text-8xl font-black text-indigo-950 tracking-tighter tabular-nums leading-none">
              {/* @ts-ignore */}
              <SlidingNumber number={String(Math.max(0, trialRemaining ?? 20))} />
            </span>
            <span className="text-4xl text-indigo-200 font-bold self-end mb-2 ml-1">/20</span>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-indigo-900/60 font-medium mb-4"
          >
            bookings remaining
          </motion.p>

          {showFlatFee && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-2 p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs ring-4 ring-indigo-50">
                5%
              </div>
              <p className="text-sm font-bold text-indigo-950">
                Commission Active
              </p>
            </motion.div>
          )}

          {!showFlatFee && (
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs font-bold text-indigo-900/30 uppercase tracking-[0.2em]"
            >
              Zero Commission
            </motion.h2>
          )}
        </div>
      </div>
    </motion.div>
  );
};


const Overview = () => {
  const { scrollY } = useScroll();
  const { profileData } = usePreloadedData();
  const [hostState, setHostState] = useState<HostState | null>(null);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPaymentLinkDrawer, setShowPaymentLinkDrawer] = useState(false);
  const [showCheckInDrawer, setShowCheckInDrawer] = useState(false);
  const [checkInDrawerTab, setCheckInDrawerTab] = useState<'create' | 'links'>('create');
  const [checkInLinks, setCheckInLinks] = useState<any[]>([]);
  const { navigate } = useNavigation();

  useEffect(() => {
    const loadHostState = async () => {
      console.log('[Overview] profileData:', profileData);
      console.log('[Overview] profileData.id:', profileData?.id);

      if (profileData?.id) {
        try {
          const [data, draftsData] = await Promise.all([
            fetchHostState(profileData.id),
            fetchHostDrafts(profileData.id)
          ]);
          console.log('[Overview] Received hostState:', data);
          setHostState(data);

          if (Array.isArray(draftsData)) {
            setDrafts(draftsData);
          }
        } catch (error) {
          console.error("[Overview] Failed to load request data:", error);
        }
      }
    };
    loadHostState();
  }, [profileData]);

  // Guest Stay Requests & Issues State
  const [stayRequests, setStayRequests] = useState<any[]>([]);
  const [updatingReqId, setUpdatingReqId] = useState<string | null>(null);

  const loadHostRequests = async () => {
    if (!profileData?.id) return;
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://roovo-backend.fly.dev';
      const res = await fetch(`${apiBase}/api/check-in/host/${profileData.id}/requests`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.requests)) {
          setStayRequests(data.requests);
        }
      }
    } catch (e) {
      console.warn('Backend requests fetch warning:', e);
    }

    // Direct Supabase Fallback & Links Fetch
    try {
      const { data: links } = await supabase
        .from('check_in_links')
        .select('id, guest_name, guest_phone, listing_id, status, require_image_upload, guest_image_url, image_uploaded_at, checked_in_at, requests, created_at, listings_new(title, place)')
        .eq('host_id', profileData.id)
        .order('created_at', { ascending: false });

      if (links) {
        setCheckInLinks(links);
        const reqs: any[] = [];
        links.forEach((link: any) => {
          (link.requests || []).forEach((r: any) => {
            reqs.push({
              ...r,
              check_in_id: link.id,
              guest_name: link.guest_name,
              guest_phone: link.guest_phone,
              listing_id: link.listing_id,
              listing_title: link.listings_new?.title || 'Your Property',
              listing_place: link.listings_new?.place || '',
            });
          });
        });
        reqs.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        setStayRequests(reqs);
      }
    } catch (dbErr) {
      console.error('Error fetching stay requests from Supabase:', dbErr);
    }
  };

  useEffect(() => {
    if (!profileData?.id) return;
    loadHostRequests();

    // Live realtime updates for host: instantly receives new guest issues
    const channel = supabase
      .channel(`host_requests_live_${profileData.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'check_in_links', filter: `host_id=eq.${profileData.id}` },
        () => {
          loadHostRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileData?.id]);

  const handleUpdateStatus = async (checkInId: string, requestId: string, newStatus: string) => {
    setUpdatingReqId(requestId);
    await triggerHaptic();

    // Optimistic UI update
    setStayRequests(prev => prev.map(r => (r.id === requestId && r.check_in_id === checkInId ? { ...r, status: newStatus } : r)));

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://roovo-backend.fly.dev';
      const res = await fetch(`${apiBase}/api/check-in/${checkInId}/request/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        // Direct Supabase Fallback
        const { data: record } = await supabase.from('check_in_links').select('requests').eq('id', checkInId).single();
        if (record && Array.isArray(record.requests)) {
          const updated = record.requests.map((r: any) => r.id === requestId ? { ...r, status: newStatus } : r);
          await supabase.from('check_in_links').update({ requests: updated }).eq('id', checkInId);
        }
      }
    } catch (err) {
      console.error('Failed to update request status:', err);
    } finally {
      setUpdatingReqId(null);
    }
  };

  const [showResolved, setShowResolved] = useState(false);

  const activeStayRequests = useMemo(() => {
    return stayRequests.filter(r => r.status === 'pending' || r.status === 'in_progress');
  }, [stayRequests]);

  const resolvedStayRequests = useMemo(() => {
    return stayRequests.filter(r => r.status === 'resolved');
  }, [stayRequests]);

  const notifications = useMemo(() => {
    const list: Notification[] = [];

    if (hostState) {
      // 1. Priority Actions (High Priority)

      // KYC
      if (!hostState.kyc_verified) {
        console.log('[Overview] Adding KYC notification - kyc_verified is:', hostState.kyc_verified);
        list.push({
          title: "Complete Verification",
          description: "Upload your ID to activate your account and start receiving bookings.",
          buttonText: "Verify Identity",
          icon: ShieldCheck,
          action: () => navigate('hosting/verify'),
          priority: 'high',
        });
      }

      // Payout Method
      if (!hostState.payout_method) {
        console.log('[Overview] Adding Payout notification - payout_method is:', hostState.payout_method);
        list.push({
          title: "Add Payout Method",
          description: "Connect your bank account to receive payments from guests.",
          buttonText: "Add Bank Details",
          icon: CreditCard,
          action: () => navigate('hosting/payout-methods'),
          priority: 'high',
        });
      }

      // Messages
      if (hostState.pending_messages && hostState.pending_messages > 0) {
        list.push({
          title: `${hostState.pending_messages} Pending Messages`,
          description: "You have unread messages from potential guests.",
          buttonText: "View Messages",
          icon: MessageSquare,
          action: () => navigate('messages'),
          priority: 'normal',
        });
      }

      // 2. Check-in Link & Verification Photo Activity
      checkInLinks.slice(0, 3).forEach((link) => {
        if (link.guest_image_url && link.status !== 'checked_out') {
          list.push({
            title: `📸 Photo Verified: ${link.guest_name || 'Guest'}`,
            description: `${link.guest_name || 'Guest'} uploaded photo for ${link.listings_new?.title || 'your property'}.`,
            buttonText: "View Photo",
            icon: ShieldCheck,
            action: () => {
              setCheckInDrawerTab('links');
              setShowCheckInDrawer(true);
            },
            priority: 'high',
          });
        }
      });

    }

    console.log('[Overview] Generated notifications:', list);
    return list;
  }, [hostState, checkInLinks, navigate]);

  // Visual physics for the sheet
  const sheetBorderRadius = useTransform(scrollY, [0, 100], [32, 0]);

  return (
    <div className="relative min-h-screen bg-white font-sans">
      {/* 1. Background Stats Layer */}
      <StatsSection scrollY={scrollY} trialRemaining={hostState?.trial_remaining ?? null} />

      {/* 2. Scrollable Sheet Layer */}
      <div className="relative z-10">
        <div className="h-[55vh] w-full" style={{ pointerEvents: 'none', touchAction: 'none' }} /> {/* Transparent spacer */}

        <motion.div
          style={{
            borderTopLeftRadius: sheetBorderRadius,
            borderTopRightRadius: sheetBorderRadius
          }}
          className="bg-white min-h-screen shadow-[0_-10px_60px_-15px_rgba(0,0,0,0.1)] pb-48"
        >
          {/* Grab Handle */}
          <div className="w-full flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>

          {/* Sticky Header */}
          <div className="sticky top-0 bg-white/80 backdrop-blur-xl z-20 px-6 py-4 flex justify-between items-center border-b border-gray-50/50">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              Action Center
            </h2>
            <div className="flex items-center gap-1.5">
              {activeStayRequests.length > 0 && (
                <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs animate-pulse flex items-center gap-1">
                  <AlertTriangle size={10} /> {activeStayRequests.length} {activeStayRequests.length === 1 ? 'ISSUE' : 'ISSUES'}
                </span>
              )}
              {notifications.length > 0 ? (
                <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md shadow-indigo-200">
                  {notifications.length} NEW
                </span>
              ) : (
                activeStayRequests.length === 0 && (
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> ALL SET
                  </span>
                )
              )}
            </div>
          </div>

          {/* Content List */}
          <div className="px-4 py-6">

            {/* 🚨 Active Guest In-Stay Issues & Requests Section */}
            {activeStayRequests.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                    </span>
                    <h3 className="text-sm font-bold text-rose-600 uppercase tracking-wider">
                      Guest Issues & Requests
                    </h3>
                  </div>
                  <span className="text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full shadow-xs">
                    {activeStayRequests.length} Active
                  </span>
                </div>

                <div className="space-y-3">
                  {activeStayRequests.map((req: any) => {
                    const isIssue = req.type === 'issue';
                    const isCleaning = req.type === 'cleaning';
                    const isPending = req.status === 'pending';
                    const isUpdating = updatingReqId === req.id;

                    const formattedTime = req.created_at
                      ? new Date(req.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                      : 'Recently';

                    return (
                      <div
                        key={req.id}
                        className="bg-white rounded-3xl p-4 border border-rose-100 shadow-[0_4px_20px_rgb(244,63,94,0.08)] space-y-3"
                      >
                        {/* Header: Guest Name & Property */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <div className={`p-2.5 rounded-2xl shrink-0 ${
                              isIssue ? 'bg-rose-50 text-rose-600' : isCleaning ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'
                            }`}>
                              {isIssue ? <AlertTriangle size={18} /> : isCleaning ? <Sparkles size={18} /> : <Bell size={18} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-sm text-slate-900">{req.guest_name || 'Guest'}</span>
                                {req.listing_title && (
                                  <span className="text-[11px] text-slate-400 font-medium truncate max-w-[150px]">
                                    · {req.listing_title}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-semibold text-rose-600 mt-0.5">
                                {isIssue ? `Issue: ${req.category || 'Maintenance'}` : isCleaning ? `Cleaning Requested` : 'Concierge Request'}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              req.status === 'in_progress'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {req.status === 'in_progress' ? 'In Progress' : 'Pending'}
                            </span>
                            <span className="text-[10px] text-slate-400">{formattedTime}</span>
                          </div>
                        </div>

                        {/* Request Description */}
                        {req.description && (
                          <div className="bg-slate-50/80 rounded-2xl p-3 text-xs text-slate-700 leading-relaxed">
                            {req.description}
                          </div>
                        )}

                        {req.time_slot && (
                          <div className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl inline-block">
                            Preferred Slot: {req.time_slot}
                          </div>
                        )}

                        {/* Attached Image Preview */}
                        {req.photo_url && (
                          <div>
                            <a href={req.photo_url} target="_blank" rel="noreferrer" className="inline-block relative rounded-2xl overflow-hidden border border-slate-200 w-32 h-20 group">
                              <img src={req.photo_url} alt="Guest uploaded photo" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/40 transition-colors flex items-center justify-center">
                                <span className="text-[10px] text-white font-bold bg-slate-900/70 px-2 py-0.5 rounded-full">View Photo</span>
                              </div>
                            </a>
                          </div>
                        )}

                        {/* Actions for Host */}
                        <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-100 flex-wrap">
                          {/* Call & WhatsApp Buttons */}
                          <div className="flex items-center gap-1.5">
                            {req.guest_phone && (
                              <>
                                <a
                                  href={`tel:${req.guest_phone}`}
                                  className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-all"
                                >
                                  <Phone size={12} /> Call
                                </a>
                                <a
                                  href={`https://wa.me/91${req.guest_phone.replace(/\D/g, '').slice(-10)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="py-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-700 text-xs font-semibold flex items-center gap-1 transition-all"
                                >
                                  <MessageCircle size={12} /> WhatsApp
                                </a>
                                <button
                                  onClick={() => navigate('hosting/messages')}
                                  className="py-1.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                                >
                                  <MessageSquare size={12} /> Chat
                                </button>
                              </>
                            )}
                          </div>

                          {/* Status Buttons */}
                          <div className="flex items-center gap-1.5 ml-auto">
                            {isPending && (
                              <button
                                disabled={isUpdating}
                                onClick={() => handleUpdateStatus(req.check_in_id, req.id, 'in_progress')}
                                className="py-1.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-700 text-xs font-bold transition-all disabled:opacity-50"
                              >
                                {isUpdating ? 'Updating...' : 'Set In Progress'}
                              </button>
                            )}
                            <button
                              disabled={isUpdating}
                              onClick={() => handleUpdateStatus(req.check_in_id, req.id, 'resolved')}
                              className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1 transition-all shadow-xs disabled:opacity-50"
                            >
                              <Check size={12} /> {isUpdating ? 'Updating...' : 'Resolve'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {resolvedStayRequests.length > 0 && (
                  <div className="mt-3">
                    <button
                      onClick={() => setShowResolved(!showResolved)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1 cursor-pointer px-1"
                    >
                      <span>{showResolved ? 'Hide' : 'Show'} Resolved Requests ({resolvedStayRequests.length})</span>
                      <ChevronRight size={12} className={`transition-transform ${showResolved ? 'rotate-90' : ''}`} />
                    </button>
                    {showResolved && (
                      <div className="mt-2 space-y-2">
                        {resolvedStayRequests.map((req: any) => (
                          <div key={req.id} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-xs flex justify-between items-center text-slate-600">
                            <div>
                              <span className="font-bold text-slate-800">{req.guest_name || 'Guest'}: {req.category || req.type}</span>
                              <p className="text-[11px] text-slate-400 mt-0.5">{req.description}</p>
                            </div>
                            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Resolved</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Resolved section when no active requests */}
            {activeStayRequests.length === 0 && resolvedStayRequests.length > 0 && (
              <div className="mb-6">
                <button
                  onClick={() => setShowResolved(!showResolved)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1 cursor-pointer px-1"
                >
                  <Clock size={12} />
                  <span>Past In-Stay Requests ({resolvedStayRequests.length})</span>
                  <ChevronRight size={12} className={`transition-transform ${showResolved ? 'rotate-90' : ''}`} />
                </button>
                {showResolved && (
                  <div className="mt-2 space-y-2">
                    {resolvedStayRequests.map((req: any) => (
                      <div key={req.id} className="bg-white border border-slate-200/80 rounded-2xl p-3 text-xs flex justify-between items-center text-slate-600 shadow-xs">
                        <div>
                          <span className="font-bold text-slate-800">{req.guest_name || 'Guest'}: {req.category || req.type}</span>
                          <p className="text-[11px] text-slate-400 mt-0.5">{req.description}</p>
                        </div>
                        <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Resolved</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Drafts Section */}
            {drafts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">In Progress</h3>
                  <span className="text-xs font-semibold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{drafts.length} drafts</span>
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelectedDraftId(drafts[0].id);
                    setShowImportModal(true);
                  }}
                  className="w-full text-left bg-white border border-gray-200 rounded-3xl p-4 shadow-sm transition-transform cursor-pointer flex gap-4 appearance-none"
                >
                  <div className="w-20 h-20 rounded-2xl bg-gray-100 overflow-hidden shrink-0 relative">
                    {drafts[0].picture_url ? (
                      <img src={drafts[0].picture_url} className="w-full h-full object-cover" alt="Draft" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Sparkles size={20} />
                      </div>
                    )}
                    {/* Progress Indicator */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
                      <div className="h-full bg-indigo-500 w-1/2" />
                    </div>
                  </div>

                  <div className="flex-1 py-1">
                    <h4 className="font-bold text-gray-900 line-clamp-1">{drafts[0].public_name || "New Listing"}</h4>
                    <p className="text-xs text-gray-500 mt-1 mb-3 line-clamp-1">{drafts[0].property_type || "Entire home"} · Last edited today</p>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">Continue Setup &rarr;</span>
                  </div>
                </motion.button>
              </motion.div>
            )}

            {notifications.length > 0 ? (
              notifications.map((notif, index) => (
                <ActionCard
                  key={index}
                  index={index}
                  title={notif.title}
                  description={notif.description}
                  buttonText={notif.buttonText}
                  icon={notif.icon}
                  onButtonClick={notif.action}
                  priority={notif.priority}
                />
              ))
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center px-8 border-2 border-dashed border-gray-100 rounded-3xl mx-2">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-gray-900 font-bold mb-1">All Caught Up!</h3>
                <p className="text-gray-400 text-sm">
                  You have no pending actions. Your account is in good standing.
                </p>
              </div>
            )}

            {/* Quick Actions / Host Tools */}
            <div className="mb-6 mt-8 space-y-3">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Host Tools</h3>
              
              <ActionCard
                index={notifications.length}
                title="Check-in Links & Verification"
                description="Create digital check-in links and view guest verification photos & active stays."
                buttonText="Manage Links"
                icon={KeyRound}
                onButtonClick={() => {
                  setCheckInDrawerTab('create');
                  setShowCheckInDrawer(true);
                }}
                priority="high"
              />

              <ActionCard
                index={notifications.length + 1}
                title="Send Payment Link"
                description="Generate a custom booking link with a set price and date range to share directly with a guest."
                buttonText="Create Link"
                icon={Sparkles}
                onButtonClick={() => setShowPaymentLinkDrawer(true)}
                priority="normal"
              />
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showImportModal && (
          <ImportListingPage
            draftId={selectedDraftId || undefined}
            isAuthenticated={true}
            onClose={() => {
              setShowImportModal(false);
              setSelectedDraftId(null);
              // Refresh drafts logic could go here
            }}
            onSuccess={() => {
              setShowImportModal(false);
              navigate('hosting/listings');
            }}
          />
        )}
        {showPaymentLinkDrawer && (
          <PaymentLinkDrawer
            isOpen={showPaymentLinkDrawer}
            onClose={() => setShowPaymentLinkDrawer(false)}
            hostId={profileData?.id || ""}
          />
        )}
        {showCheckInDrawer && (
          <CheckInLinkDrawer
            isOpen={showCheckInDrawer}
            onClose={() => setShowCheckInDrawer(false)}
            hostId={profileData?.id || ""}
            initialTab={checkInDrawerTab}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Overview;
