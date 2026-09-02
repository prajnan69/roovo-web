import { useState, useEffect, useLayoutEffect, useRef, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";
import supabase from "../services/api";
import { Spinner } from "./ui/shadcn-io/spinner";
import { Plus, Sparkles, AlertCircle, ShieldCheck, AlertTriangle, Bell, Clock, Check, CheckCircle2 } from "lucide-react";
import AcceptOfferDrawer from "./dashboard/AcceptOfferDrawer";
import { API_BASE_URL } from "../services/api";
import { createPaytmOrder, initiatePaytmCheckout } from "../services/paytmService";

const formatNiceDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const formatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const parts = formatter.formatToParts(date);
  const day = parts.find(p => p.type === 'day')?.value;
  const month = parts.find(p => p.type === 'month')?.value.toLowerCase();
  const year = parts.find(p => p.type === 'year')?.value;
  return `${day} ${month} ${year}`; // e.g., 12 jun 2026
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// Label for the sticky separator above a run of same-day messages.
const getDayLabel = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, yesterday)) return 'Yesterday';
  return formatNiceDate(dateString);
};

export interface ChatProps {
  conversationId: string;
  otherUser?: any;
  onShowOfferDrawer?: () => void;
}

const Chat = ({ conversationId, otherUser, onShowOfferDrawer }: ChatProps) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  // Messages present on the first load of a conversation. Those render in
  // place with no enter animation — animating a whole screenful of bubbles
  // up from y:12 while the chat panel is itself sliding in is the jitter.
  // Only messages that arrive afterwards (sent/received live) animate.
  const initialMessageIdsRef = useRef<Set<string>>(new Set());
  const [session, setSession] = useState<any>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Offer State
  const [selectedOffer, setSelectedOffer] = useState<{ id: string, startDate: string, endDate: string, price: number, listingId: string } | null>(null);
  const [isAcceptDrawerOpen, setIsAcceptDrawerOpen] = useState(false);
  const [convoDetails, setConvoDetails] = useState<{ listing_id: string; host_id: string } | null>(null);
  const [resolvingIssueId, setResolvingIssueId] = useState<string | null>(null);

  const handleResolveIssue = async (msg: any) => {
    const meta = msg.metadata || {};
    const req = meta.request || {};
    const requestId = req.id || meta.requestId || meta.id;
    const checkInId = meta.checkInId || meta.check_in_id;

    setResolvingIssueId(msg.id);
    await triggerHaptic();

    // 1. Optimistic UI update on messages
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msg.id) {
          return {
            ...m,
            metadata: {
              ...m.metadata,
              status: 'resolved',
              request: {
                ...(m.metadata?.request || {}),
                status: 'resolved',
              },
            },
          };
        }
        return m;
      })
    );

    try {
      // 2. Update check_in_links if checkInId exists
      if (checkInId) {
        try {
          const apiBase = API_BASE_URL || 'https://roovo-backend.fly.dev';
          if (requestId) {
            await fetch(`${apiBase}/api/check-in/${checkInId}/request/${requestId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'resolved' }),
            }).catch(() => {});
          }

          // Direct fallback
          const { data: record } = await supabase
            .from('check_in_links')
            .select('requests')
            .eq('id', checkInId)
            .single();

          if (record && Array.isArray(record.requests)) {
            const updated = record.requests.map((r: any) =>
              r.id === requestId || (!requestId && r.status !== 'resolved')
                ? { ...r, status: 'resolved' }
                : r
            );
            await supabase
              .from('check_in_links')
              .update({ requests: updated })
              .eq('id', checkInId);
          }
        } catch (e) {
          console.warn('Failed to update check_in_links request:', e);
        }
      }

      // 3. Update message record in Supabase
      await supabase
        .from('messages')
        .update({
          metadata: {
            ...meta,
            status: 'resolved',
            request: {
              ...(meta.request || {}),
              status: 'resolved',
            },
          },
        })
        .eq('id', msg.id);

      // 4. Send a system confirmation message in chat
      if (session?.user?.id) {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: session.user.id,
          content: '✅ [Resolved] This issue has been marked as resolved.',
          type: 'text',
        });
      }
    } catch (err) {
      console.error('Failed to resolve issue:', err);
    } finally {
      setResolvingIssueId(null);
    }
  };
  useEffect(() => {
    // Keyboard occlusion = how much of the layout viewport the keyboard
    // covers. Two independent signals, take whichever reports more:
    //  - visualViewport: reports it on platforms where the window keeps its
    //    size and only the visual viewport shrinks under the keyboard.
    //  - native Keyboard events: cover WebViews where NEITHER the window nor
    //    visualViewport react to the keyboard (Android 15 edge-to-edge — the
    //    visualViewport-only version of this code read 0 there and left the
    //    input buried). The native height is reduced by however much the
    //    window itself shrank, so platforms where adjustResize still works
    //    never double-compensate.
    const vv = window.visualViewport;
    let nativeKeyboard = 0;
    let baselineInnerHeight = window.innerHeight;

    const update = () => {
      if (nativeKeyboard === 0) baselineInnerHeight = window.innerHeight;
      const vvOcclusion = vv
        ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
        : 0;
      const windowShrank = Math.max(0, baselineInnerHeight - window.innerHeight);
      const nativeOcclusion = Math.max(0, nativeKeyboard - windowShrank);
      setKeyboardHeight(Math.max(vvOcclusion, nativeOcclusion));
    };

    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('resize', update);

    const listeners: Promise<{ remove: () => Promise<void> }>[] = [];
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Keyboard')) {
      listeners.push(Keyboard.addListener('keyboardWillShow', (info) => {
        nativeKeyboard = info.keyboardHeight || 0;
        update();
      }));
      listeners.push(Keyboard.addListener('keyboardWillHide', () => {
        nativeKeyboard = 0;
        update();
      }));
    }
    update();
    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      listeners.forEach(l => l.then(h => h.remove()).catch(() => {}));
    };
  }, []);

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    };
    getSession();
  }, []);

  useEffect(() => {
    const fetchConvoDetails = async () => {
      try {
        const { data } = await supabase
          .from('conversations')
          .select('listing_id, host_id')
          .eq('id', conversationId)
          .single();
        if (data) {
          setConvoDetails(data);
        }
      } catch (err) {
        console.error("Failed to fetch conversation details:", err);
      }
    };
    fetchConvoDetails();
  }, [conversationId]);

  // --- Data Fetching ---
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      initialMessageIdsRef.current = new Set((data || []).map((m: any) => m.id));
      setMessages(data || []);
      setLoading(false);
    };
    fetchMessages();

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const newMsg = payload.new;
          setMessages((prev) => {
            // Deduplication logic:
            // 1. Check if message with same ID exists
            if (prev.some(m => m.id === newMsg.id)) return prev;

            // 2. Check for optimistic message match (same content, sender, and recent)
            // We assume if content matches and it's sending, it's the one.
            const optimisticIndex = prev.findIndex(m =>
              m.isSending &&
              m.content === newMsg.content &&
              m.sender_id === newMsg.sender_id
            );

            if (optimisticIndex !== -1) {
              // Replace optimistic message with real one, but keep the
              // optimistic id as the render key — swapping keys makes framer
              // unmount/remount the bubble, so every sent message visibly
              // re-animated ("pop" jitter).
              const updated = [...prev];
              updated[optimisticIndex] = { ...newMsg, clientKey: prev[optimisticIndex].id };
              return updated;
            }

            return [...prev, newMsg];
          });
          triggerHaptic(); // Haptic on receive
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  // --- Scroll & Send ---
  // Scroll the message container directly rather than via
  // messagesEndRef.scrollIntoView(): scrollIntoView walks up and scrolls
  // EVERY scrollable ancestor to bring the element into view, which fights
  // the chat panel's own slide-in transform (x:100% -> 0) and shows up as a
  // jitter/kick when opening a conversation. Setting scrollTop only touches
  // this one container and is immune to that.
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (behavior === "smooth") {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  };

  // True until the first messages for this conversation have rendered.
  // Native chat apps open already pinned to the latest message — animating
  // that first scroll instead makes the screen look like it "scrolls up"
  // right after opening. Only messages added after that (new sends/
  // receives while the chat is already open) get the smooth scroll.
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    isInitialLoadRef.current = true;
  }, [conversationId]);

  useLayoutEffect(() => {
    if (messages.length === 0) return;
    const el = scrollContainerRef.current;
    if (isInitialLoadRef.current) {
      if (el) el.scrollTop = el.scrollHeight;
      isInitialLoadRef.current = false;
    } else {
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  // Keyboard open/close: jump instantly — a smooth scroll here fights the
  // 260ms padding transition and reads as jitter. Re-pin once the
  // transition has finished so we always end at the true bottom.
  useEffect(() => {
    scrollToBottom("auto");
    const t = setTimeout(() => scrollToBottom("auto"), 280);
    return () => clearTimeout(t);
  }, [keyboardHeight]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !session) return;

    triggerHaptic(); // Haptic on send

    const tempId = Date.now().toString();
    const optimisticMsg = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: session.user.id,
      content: newMessage,
      created_at: new Date().toISOString(),
      isSending: true
    };

    // Optimistic UI
    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage("");

    // Send via backend so the recipient gets the FCM push + notification row
    // (a direct supabase insert skips those, and the moderation check too).
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          sender_id: session.user.id,
          content: optimisticMsg.content,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setNewMessage(optimisticMsg.content); // restore the draft
        alert(err.error === 'Message contains contact information'
          ? 'Sharing contact details is not allowed in chat.'
          : 'Message failed to send. Please try again.');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(optimisticMsg.content);
      alert('Message failed to send. Please check your connection.');
    }
  };

  const handleAcceptOffer = async () => {
    if (!selectedOffer || !session || !otherUser) return;

    // Calculate final amounts for the offer
    const start = new Date(selectedOffer.startDate);
    const end = new Date(selectedOffer.endDate);
    const nights = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    const pricePerNight = nights > 0 ? selectedOffer.price / nights : 0;
    const gstRate = pricePerNight < 7500 ? 0.12 : 0.18;
    const gstAmount = selectedOffer.price * gstRate;
    const orderAmount = selectedOffer.price + gstAmount;

    // Host payout logic
    const roovoFee = selectedOffer.price * 0.05;
    const gstOnFee = roovoFee * 0.18;
    const hostPayout = selectedOffer.price - roovoFee - gstOnFee;
    const ourFees = roovoFee + gstOnFee;

    try {
      // Get conversation details for listing_id / host_id
      const convo = convoDetails || await (async () => {
        const { data } = await supabase.from('conversations').select('listing_id, host_id').eq('id', conversationId).single();
        return data;
      })();
      if (!convo) throw new Error("Can't find conversation details");

      // 1. Validate offer availability
      const validateRes = await fetch(`${API_BASE_URL}/api/bookings/validate-offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: convo.listing_id,
          message_id: selectedOffer.id,
          start_date: selectedOffer.startDate,
          end_date: selectedOffer.endDate,
          price: selectedOffer.price
        })
      });

      const validateData = await validateRes.json();
      if (!validateRes.ok || !validateData.valid) {
        alert(validateData.error || "This offer is no longer valid or available.");
        return;
      }

      const guestPhone = session.user.identities?.[0]?.identity_data?.phone || "9999999999";
      const bookingData = {
        listing_id: convo.listing_id,
        guest_id: session.user.id,
        host_id: convo.host_id,
        start_date: selectedOffer.startDate,
        end_date: selectedOffer.endDate,
        total_price: parseFloat(orderAmount.toFixed(2)),
        host_payout: parseFloat(hostPayout.toFixed(2)),
        taxes: parseFloat(gstAmount.toFixed(2)),
        our_fees: parseFloat(ourFees.toFixed(2)),
        host_fees: 0,
        auto_bookable: true,
        is_special_offer: true,
        message_id: selectedOffer.id
      };

      // 2. Create Paytm order & store intent
      const order = await createPaytmOrder({
        order_amount: parseFloat(orderAmount.toFixed(2)),
        customer_details: {
          customer_id: session.user.id,
          customer_phone: guestPhone,
          customer_name: session.user.user_metadata?.name || 'Guest',
          customer_email: 'guest@roovo.in',
        },
        order_meta: {
          return_url: `${window.location.origin}/payment/status?order_id=ROOVO_PLACEHOLDER`,
        },
        bookingData,
      });

      // Store pending booking locally as fallback
      localStorage.setItem(`pending_booking_${order.order_id}`, JSON.stringify(bookingData));

      // 3. Open Paytm checkout
      await initiatePaytmCheckout(order);
      // Paytm redirects to /payment/status after payment

    } catch (error: any) {
      console.error(error);
      if (!error?.message?.includes('cancelled')) {
        alert('Failed to initiate payment.');
      }
    }
  };

  // NOTE: no early return for `loading`. Returning a different tree while
  // loading meant the entire chat shell (background, input bar, message
  // container) unmounted and remounted the moment messages arrived — a
  // visible flash mid-open. The shell now renders immediately and stays put;
  // only the message area fills in.

  return (
    <div
      className="flex flex-col h-full bg-slate-50 relative overflow-hidden"
      style={{ paddingBottom: keyboardHeight, transition: 'padding-bottom 260ms cubic-bezier(0.33, 1, 0.68, 1)' }}
    >
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-100/40 rounded-full blur-[80px]" />
        <div className="absolute bottom-[20%] left-[-10%] w-[60%] h-[60%] bg-rose-50/50 rounded-full blur-[80px]" />
      </div>

      {/* Messages Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4 z-10 scrollbar-hide overscroll-contain relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 z-20 pointer-events-none">
            <Spinner />
          </div>
        )}
        <div className="space-y-1 pb-32">
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => {
              const isMe = msg.sender_id === session?.user?.id;

              // Grouping Logic
              const prevMsg = messages[index - 1];
              const isSequence = prevMsg && prevMsg.sender_id === msg.sender_id;
              const timeGap = prevMsg ? (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) > 60000 * 5 : false; // 5 mins

              const showAvatar = !isMe && (!isSequence || timeGap);

              // Messages from the conversation's first load render in place;
              // only live sends/receives animate in.
              const skipEnterAnim = initialMessageIdsRef.current.has(msg.id);

              // One separator per calendar day, above the first message of that day
              const isNewDay = !prevMsg || !isSameDay(new Date(msg.created_at), new Date(prevMsg.created_at));
              const dateSeparator = isNewDay ? (
                <div className="flex justify-center py-6 sticky top-0 z-20">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/70 backdrop-blur-md px-4 py-1.5 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-white">
                    {getDayLabel(msg.created_at)}
                  </span>
                </div>
              ) : null;

              // Dynamic border radius
              const roundedTop = isMe
                ? (isSequence && !timeGap ? 'rounded-tr-md' : 'rounded-tr-2xl')
                : (isSequence && !timeGap ? 'rounded-tl-md' : 'rounded-tl-2xl');

              const marginBottom = isSequence && !timeGap ? 'mb-1.5' : 'mb-3';

              if (msg.type === 'activity') {
                let displayContent = msg.content;
                // Reformat legacy M/D/YYYY or MM/DD/YYYY dates to nice format dynamically
                if (displayContent) {
                  displayContent = displayContent.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g, (match: string, m: string, d: string, y: string) => {
                    try {
                      return formatNiceDate(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T12:00:00Z`);
                    } catch {
                      return match;
                    }
                  });
                }

                let title = displayContent;
                let subtitle = null;

                if (displayContent && displayContent.includes(':')) {
                  const parts = displayContent.split(':');
                  title = parts[0].trim();
                  subtitle = parts.slice(1).join(':').trim();
                }

                return (
                  <Fragment key={msg.clientKey || msg.id}>
                    {dateSeparator}
                    <motion.div
                      initial={skipEnterAnim ? false : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                      className="flex justify-center my-6 px-4 relative"
                    >
                      <div className="bg-white/60 backdrop-blur-md px-5 py-3 rounded-2xl border border-white shadow-sm max-w-[90%] flex flex-col items-center justify-center gap-1.5 min-w-[200px]">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                          <span className="text-[11px] font-bold text-slate-600 text-center uppercase tracking-widest">
                            {title}
                          </span>
                        </div>
                        {subtitle && (
                          <span className="text-[11px] font-black text-indigo-600 bg-indigo-50/80 border border-indigo-100 px-3 py-1 rounded-lg w-full text-center whitespace-nowrap shadow-sm">
                            {subtitle}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  </Fragment>
                );
              }

              if (msg.type === 'stay_issue' || msg.type === 'issue' || msg.type === 'cleaning' || msg.type === 'concierge') {
                const meta = msg.metadata || {};
                const req = meta.request || {};
                const type = req.type || meta.type || meta.request_type || (msg.type === 'stay_issue' ? 'issue' : msg.type);
                const isIssue = type === 'issue' || msg.content?.includes('Issue');
                const isCleaning = type === 'cleaning' || msg.content?.includes('Cleaning');
                const photo = req.photo_url || meta.photo_url;
                const status = (req.status || meta.status || 'pending').toLowerCase();
                const isResolved = status === 'resolved';
                const category = req.category || meta.category || (isIssue ? 'Maintenance' : isCleaning ? 'Cleaning' : 'Concierge');

                return (
                  <Fragment key={msg.clientKey || msg.id}>
                    {dateSeparator}
                    <motion.div
                      initial={skipEnterAnim ? false : { opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                      className={`flex w-full mt-2 mb-6 relative group ${isMe ? "justify-end pl-12" : "justify-start pr-12"}`}
                    >
                      {!isMe && (
                        <div className="w-8 mr-2 flex-shrink-0 flex flex-col justify-end">
                          {showAvatar ? (
                            <div className="w-8 h-8 rounded-full bg-indigo-50 border-2 border-white shadow-sm overflow-hidden">
                              {otherUser?.avatar_url ? (
                                <img src={otherUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                              ) : (
                                <img src={`https://ui-avatars.com/api/?background=c7d2fe&color=3730a3&name=${encodeURIComponent(otherUser?.name || 'User')}`} alt="avatar" />
                              )}
                            </div>
                          ) : <div className="w-8" />}
                        </div>
                      )}
                      <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-md overflow-hidden max-w-sm w-full">
                        {/* Banner */}
                        <div className={`p-4 flex items-center justify-between text-white ${
                          isResolved
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600'
                            : isIssue 
                            ? 'bg-gradient-to-r from-rose-600 to-rose-500' 
                            : isCleaning 
                            ? 'bg-gradient-to-r from-indigo-600 to-indigo-500' 
                            : 'bg-gradient-to-r from-amber-600 to-amber-500'
                        }`}>
                          <div className="flex items-center gap-2">
                            {isResolved ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                            ) : isIssue ? (
                              <AlertTriangle className="w-4 h-4 text-rose-100" />
                            ) : isCleaning ? (
                              <Sparkles className="w-4 h-4 text-indigo-100" />
                            ) : (
                              <Bell className="w-4 h-4 text-amber-100" />
                            )}
                            <span className="font-bold text-xs uppercase tracking-wider">
                              {isIssue ? `Guest Issue: ${category}` : isCleaning ? 'Cleaning Request' : 'Concierge Request'}
                            </span>
                          </div>
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase ${
                            isResolved
                              ? 'bg-white text-emerald-700 shadow-xs'
                              : 'bg-white/20 backdrop-blur-md text-white'
                          }`}>
                            {isResolved ? '✓ Resolved' : status}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-3 bg-white">
                          <p className="text-sm text-slate-800 font-medium whitespace-pre-line leading-relaxed">
                            {meta.description || req.description || msg.content}
                          </p>

                          {meta.time_slot && (
                            <div className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl inline-block">
                              Requested Slot: {meta.time_slot}
                            </div>
                          )}

                          {photo && (
                            <div className="rounded-2xl overflow-hidden border border-slate-200 w-full h-40 relative group">
                              <a href={photo} target="_blank" rel="noreferrer">
                                <img src={photo} alt="Issue evidence" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              </a>
                            </div>
                          )}

                          {/* Resolution Action / Status Pill */}
                          <div className="pt-2 border-t border-slate-100">
                            {isResolved ? (
                              <div className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>Issue Marked as Resolved</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleResolveIssue(msg)}
                                disabled={resolvingIssueId === msg.id}
                                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                              >
                                {resolvingIssueId === msg.id ? (
                                  <Spinner size={16} className="text-white" />
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Mark as Resolved</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </Fragment>
                );
              }

              if (msg.type === 'special_offer') {
                const offer = msg.metadata || {};
                const checkInDate = formatNiceDate(offer.startDate);
                const checkOutDate = formatNiceDate(offer.endDate);
                const nights = offer.startDate && offer.endDate ? Math.ceil((new Date(offer.endDate).getTime() - new Date(offer.startDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;

                const isAccepted = offer.status === 'accepted';
                const isExpired = !isAccepted && (Date.now() - new Date(msg.created_at).getTime() > 24 * 60 * 60 * 1000);

                return (
                  <Fragment key={msg.clientKey || msg.id}>
                  {dateSeparator}
                  <motion.div
                    initial={skipEnterAnim ? false : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                    className={`flex w-full mt-2 mb-6 relative group ${isMe ? "justify-end pl-12" : "justify-start pr-12"}`}
                  >
                    {!isMe && (
                      <div className="w-8 mr-2 flex-shrink-0 flex flex-col justify-end">
                        {showAvatar ? (
                          <div className="w-8 h-8 rounded-full bg-indigo-50 border-2 border-white shadow-sm overflow-hidden">
                            {otherUser?.avatar_url ? (
                              <img src={otherUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                              <img src={`https://ui-avatars.com/api/?background=c7d2fe&color=3730a3&name=${encodeURIComponent(otherUser?.name || 'User')}`} alt="avatar" />
                            )}
                          </div>
                        ) : <div className="w-8" />}
                      </div>
                    )}
                    <div className="bg-white/80 backdrop-blur-xl rounded-[1.5rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden max-w-sm w-full transition-shadow duration-300 hover:shadow-[0_8px_40px_rgb(79,70,229,0.12)]">
                      <div className="relative overflow-hidden bg-[length:200%_200%] animate-gradient px-5 py-4"
                        style={{ backgroundImage: 'linear-gradient(120deg, #4f46e5 0%, #7c3aed 50%, #4f46e5 100%)' }}>
                        {/* Shimmer overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] animate-shimmer" />

                        <div className="relative z-10 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-indigo-200" />
                          <h3 className="text-white font-bold text-[13px] tracking-wider uppercase">
                            {isAccepted ? 'Offer Accepted' : isExpired ? 'Offer Expired' : isMe ? 'Special Offer Sent' : 'Special Offer'}
                          </h3>
                        </div>
                        <p className="text-indigo-100 text-[15px] mt-1 relative z-10 tracking-tight leading-snug">{msg.content}</p>
                      </div>
                      <div className="p-5 bg-white/50">
                        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-5 relative overflow-hidden group-hover:border-indigo-100 transition-colors">
                          <div className="text-center flex-1">
                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Check-in</span>
                            <span className="block font-bold text-slate-800 tracking-tight">{checkInDate}</span>
                          </div>
                          <div className="w-px h-8 bg-slate-100 mx-1"></div>
                          <div className="text-center flex-1">
                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Check-out</span>
                            <span className="block font-bold text-slate-800 tracking-tight">{checkOutDate}</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-end mb-6 px-1">
                          <div className="flex flex-col">
                            <span className="inline-flex items-center justify-center bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2.5 py-1 rounded-md mb-1 w-fit uppercase tracking-widest">
                              {nights} Night{nights > 1 ? 's' : ''}
                            </span>
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-black text-3xl tracking-tighter text-slate-900">₹{offer.price?.toLocaleString('en-IN') || 0}</span>
                              {!isMe && <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">+ GST</span>}
                            </div>
                          </div>
                        </div>

                        {!isMe && !isAccepted && !isExpired && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            className="w-full py-3.5 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl shadow-[0_4px_15px_rgb(0,0,0,0.1)] transition-all flex items-center justify-center gap-2"
                            onClick={() => {
                              setSelectedOffer({
                                id: msg.id,
                                startDate: msg.metadata?.startDate || msg.metadata?.start_date || '',
                                endDate: msg.metadata?.endDate || msg.metadata?.end_date || '',
                                price: msg.metadata?.price || 0,
                                listingId: msg.metadata?.listingId || msg.metadata?.listing_id || convoDetails?.listing_id || ''
                              });
                              setIsAcceptDrawerOpen(true);
                            }}
                          >
                            Review & Accept <AlertCircle className="w-4 h-4 text-white/70" />
                          </motion.button>
                        )}
                        {!isMe && isAccepted && (
                          <div className="text-center mt-3 bg-green-50/50 border border-green-100 py-3 rounded-xl font-bold text-green-700 text-[13px] flex items-center justify-center gap-2">
                            <ShieldCheck className="w-4 h-4" /> Offer Accepted
                          </div>
                        )}
                        {!isMe && isExpired && (
                          <div className="text-center mt-3 bg-red-50/50 border border-red-100 py-2.5 rounded-xl text-[11px] font-bold text-red-500 uppercase tracking-widest">
                            Expired
                          </div>
                        )}
                        {isMe && !isAccepted && !isExpired && (
                          <div className="text-center mt-3 bg-slate-50 border border-slate-100 py-2.5 rounded-xl">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                              Waiting for response
                            </span>
                          </div>
                        )}
                        {isMe && isAccepted && (
                          <div className="text-center mt-3 bg-green-50/50 border border-green-100 py-2.5 rounded-xl text-[10px] font-bold text-green-600 uppercase tracking-widest flex items-center justify-center gap-1.5">
                            Accepted by guest
                          </div>
                        )}
                        {isMe && isExpired && (
                          <div className="text-center mt-3 bg-red-50/50 border border-red-100 py-2.5 rounded-xl text-[10px] font-bold text-red-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
                            Offer Expired
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                  </Fragment>
                );
              }

              return (
                <Fragment key={msg.clientKey || msg.id}>
                {dateSeparator}
                <motion.div
                  initial={skipEnterAnim ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
                  className={`flex w-full ${marginBottom} ${isMe ? "justify-end" : "justify-start"}`}
                >
                  {!isMe && (
                    <div className="w-8 flex-shrink-0 flex flex-col justify-end">
                      {showAvatar ? (
                        <div className="w-7 h-7 -translate-x-1 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden z-10">
                          {otherUser?.avatar_url ? (
                            <img src={otherUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                          ) : (
                            <img
                              src={`https://ui-avatars.com/api/?background=cbd5e1&color=334155&name=${encodeURIComponent(otherUser?.name || 'User')}`}
                              alt="avatar"
                            />
                          )}
                        </div>
                      ) : <div className="w-8" />}
                    </div>
                  )}

                  <div className={`relative max-w-[75%] px-4 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] text-[15px] leading-relaxed border
                        ${isMe
                      ? `bg-indigo-500 border-indigo-500 text-white rounded-l-3xl ${roundedTop} rounded-br-md`
                      : `bg-white border-white text-slate-800 rounded-r-3xl ${roundedTop} rounded-bl-md`
                    }
                    `}>
                    <p className="tracking-tight">{msg.content}</p>
                    <div className={`text-[9px] text-right mt-1 font-bold tracking-widest uppercase ${isMe ? "text-indigo-200" : "text-slate-300"}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                </motion.div>
                </Fragment>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating Input Bar — bottom offset tracks the keyboard: absolute
          children don't move with the container's padding compensation */}
      <div
        className="absolute left-0 right-0 z-20 pt-6 px-4 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent pointer-events-none"
        style={{
          bottom: keyboardHeight,
          paddingBottom: keyboardHeight > 0 ? '0.75rem' : 'calc(env(safe-area-inset-bottom) + 1rem)',
          transition: 'bottom 260ms cubic-bezier(0.33, 1, 0.68, 1)',
        }}
      >
        <form
          onSubmit={handleSendMessage}
          className="flex items-center gap-2 bg-white/80 backdrop-blur-2xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-full p-1.5 pointer-events-auto transition-shadow focus-within:shadow-[0_8px_40px_rgb(79,70,229,0.12)]"
        >
          {onShowOfferDrawer && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => { triggerHaptic(); onShowOfferDrawer(); }}
              className="p-2.5 rounded-full bg-indigo-50 text-indigo-600 transition-colors flex-shrink-0"
            >
              <Plus className="w-5 h-5" />
            </motion.button>
          )}

          <div className="flex-1 flex items-center min-h-[44px] px-2 min-w-0">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Message..."
              enterKeyHint="send"
              autoComplete="off"
              autoCapitalize="sentences"
              className="flex-1 bg-transparent border-none outline-none ring-0 focus:ring-0 focus:outline-none px-2 py-2 text-slate-800 font-medium placeholder:text-slate-400 min-w-0 tracking-tight text-[16px]"
            />
          </div>

          <motion.button
            type="submit"
            whileTap={{ scale: 0.85 }}
            disabled={!newMessage.trim()}
            className={`p-3 rounded-full shadow-sm transition-all duration-300 flex-shrink-0 ${newMessage.trim()
              ? 'bg-slate-900 text-white hover:bg-black hover:shadow-lg hover:shadow-slate-900/20'
              : 'bg-slate-100 text-slate-300'
              }`}
          >
            <Send className="w-[18px] h-[18px] translate-x-[-1px] translate-y-[1px]" />
          </motion.button>
        </form>
      </div>

      {/* Accept Offer Drawer */}
      <AcceptOfferDrawer
        isOpen={isAcceptDrawerOpen}
        onClose={() => setIsAcceptDrawerOpen(false)}
        onAccept={handleAcceptOffer}
        offer={selectedOffer || { id: '', startDate: '', endDate: '', price: 0 }}
        listingTitle={otherUser?.name ? `Stay with ${otherUser.name}` : 'Special Offer'}
        guestId={session?.user?.id || ''}
        guestPhone={session?.user?.phone || ''}
        listingId={selectedOffer?.listingId || convoDetails?.listing_id || ''}
        hostId={otherUser?.id || convoDetails?.host_id || ''}
      />
    </div>
  );
};

export default Chat;