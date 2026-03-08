"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send } from "lucide-react";
import supabase from "../services/api";
import { Spinner } from "./ui/shadcn-io/spinner";
import { triggerHaptic } from "@/lib/haptics";
import { Keyboard } from "@capacitor/keyboard";
import { Plus, Sparkles, AlertCircle } from "lucide-react";
import AcceptOfferDrawer from "./dashboard/AcceptOfferDrawer";
import { load } from '@cashfreepayments/cashfree-js';
import { API_BASE_URL } from "../services/api";

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
  const [session, setSession] = useState<any>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [cashfree, setCashfree] = useState<any>(null);

  // Offer State
  const [selectedOffer, setSelectedOffer] = useState<{ startDate: string, endDate: string, price: number } | null>(null);
  const [isAcceptDrawerOpen, setIsAcceptDrawerOpen] = useState(false);

  // --- Keyboard & Auth Setup ---
  useEffect(() => {
    const setupKeyboard = async () => {
      if (typeof window !== 'undefined') {
        // Re-enabling manual keyboard handling as native resize wasn't effective
        Keyboard.addListener("keyboardWillShow", (info) => {
          setKeyboardHeight(info.keyboardHeight);
        });
        Keyboard.addListener("keyboardWillHide", () => {
          setKeyboardHeight(0);
        });
      }
    };
    setupKeyboard();

    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    };
    getSession();

    const initializeCashfree = async () => {
      try {
        const cf = await load({
          mode: "production", // or sandbox based on env
        });
        setCashfree(cf);
      } catch (error) {
        console.error("Failed to load Cashfree SDK:", error);
      }
    };
    initializeCashfree();

    return () => { Keyboard.removeAllListeners(); };
  }, []);

  // --- Data Fetching ---
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      setMessages(data || []);
      setLoading(false);
      setTimeout(scrollToBottom, 100);
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
              // Replace optimistic message with real one
              const updated = [...prev];
              updated[optimisticIndex] = newMsg;
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
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, keyboardHeight]);

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

    await supabase.from("messages").insert([{
      conversation_id: conversationId,
      sender_id: session.user.id,
      content: optimisticMsg.content,
    }]);
  };

  const handleAcceptOffer = async () => {
    if (!selectedOffer || !session || !cashfree || !otherUser) return;

    // Calculate final amounts for the offer
    const start = new Date(selectedOffer.startDate);
    const end = new Date(selectedOffer.endDate);
    const nights = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    const pricePerNight = nights > 0 ? selectedOffer.price / nights : 0;
    const gstRate = pricePerNight < 7500 ? 0.12 : 0.18;
    const gstAmount = selectedOffer.price * gstRate;
    const orderAmount = selectedOffer.price + gstAmount;

    // Host payout logic exactly as planned:
    const roovoFee = selectedOffer.price * 0.05;
    const gstOnFee = roovoFee * 0.18;
    const hostPayout = selectedOffer.price - roovoFee - gstOnFee;
    const ourFees = roovoFee + gstOnFee;

    try {
      // 1. Create order
      const guestPhone = session.user.identities?.[0]?.identity_data?.phone || "9999999999";

      const orderRes = await fetch(`${API_BASE_URL}/api/cashfree/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_amount: orderAmount,
          customer_details: {
            customer_id: session.user.id,
            customer_phone: guestPhone,
            customer_name: session.user.user_metadata?.name || 'Guest',
          },
          order_meta: {
            return_url: `${window.location.origin}/payment/status?order_id={order_id}`
          }
        })
      });

      if (!orderRes.ok) throw new Error("Failed to create cashfree order");
      const orderData = await orderRes.json();

      // We must get listing ID from conversation to create the booking
      const { data: convo } = await supabase.from('conversations').select('listing_id, host_id').eq('id', conversationId).single();
      if (!convo) throw new Error("Can't find conversation details");

      // Store pending booking
      localStorage.setItem(`pending_booking_${orderData.order_id}`, JSON.stringify({
        listing_id: convo.listing_id,
        guest_id: session.user.id,
        host_id: convo.host_id, // Host ID
        start_date: selectedOffer.startDate,
        end_date: selectedOffer.endDate,
        total_price: parseFloat(orderAmount.toFixed(2)),
        host_payout: parseFloat(hostPayout.toFixed(2)),
        taxes: parseFloat(gstAmount.toFixed(2)),
        our_fees: parseFloat(ourFees.toFixed(2)),
        host_fees: 0,
        auto_bookable: true, // Offers are auto confirmed
        is_special_offer: true
      }));

      // 2. Checkout
      cashfree.checkout({
        paymentSessionId: orderData.payment_session_id,
        redirectTarget: "_self",
        returnUrl: `${window.location.origin}/payment/status?order_id={order_id}`
      });

    } catch (error) {
      console.error(error);
      alert('Failed to initiate payment.');
    }
  };

  if (loading) return <div className="flex h-full items-center justify-center"><Spinner /></div>;

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden" style={{ paddingBottom: keyboardHeight }}>
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-100/40 rounded-full blur-[80px]" />
        <div className="absolute bottom-[20%] left-[-10%] w-[60%] h-[60%] bg-rose-50/50 rounded-full blur-[80px]" />
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 z-10 scrollbar-hide">
        <div className="space-y-1 pb-[20px]">
          {/* Date Separator */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center py-6 sticky top-0 z-20"
          >
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/70 backdrop-blur-md px-4 py-1.5 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-white">
              Today
            </span>
          </motion.div>

          <AnimatePresence initial={false}>
            {messages.map((msg, index) => {
              const isMe = msg.sender_id === session?.user?.id;

              // Grouping Logic
              const prevMsg = messages[index - 1];
              const isSequence = prevMsg && prevMsg.sender_id === msg.sender_id;
              const timeGap = prevMsg ? (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) > 60000 * 5 : false; // 5 mins

              const showAvatar = !isMe && (!isSequence || timeGap);

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
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
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
                );
              }

              if (msg.type === 'special_offer') {
                const offer = msg.metadata || {};
                const checkInDate = formatNiceDate(offer.startDate);
                const checkOutDate = formatNiceDate(offer.endDate);
                const nights = offer.startDate && offer.endDate ? Math.ceil((new Date(offer.endDate).getTime() - new Date(offer.startDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className={`flex w-full mt-2 mb-6 relative group ${isMe ? "justify-end pl-12" : "justify-start pr-12"}`}
                  >
                    {!isMe && (
                      <div className="w-8 mr-2 flex-shrink-0 flex flex-col justify-end">
                        {showAvatar ? (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-8 h-8 rounded-full bg-indigo-50 border-2 border-white shadow-sm overflow-hidden"
                          >
                            {otherUser?.avatar_url ? (
                              <img src={otherUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                              <img src={`https://ui-avatars.com/api/?background=c7d2fe&color=3730a3&name=${encodeURIComponent(otherUser?.name || 'User')}`} alt="avatar" />
                            )}
                          </motion.div>
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
                            {isMe ? 'Special Offer Sent' : 'Special Offer'}
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

                        {!isMe && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            className="w-full py-3.5 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl shadow-[0_4px_15px_rgb(0,0,0,0.1)] transition-all flex items-center justify-center gap-2"
                            onClick={() => {
                              setSelectedOffer({
                                startDate: offer.startDate,
                                endDate: offer.endDate,
                                price: offer.price
                              });
                              setIsAcceptDrawerOpen(true);
                            }}
                          >
                            Review & Accept <AlertCircle className="w-4 h-4 text-white/70" />
                          </motion.button>
                        )}
                        {isMe && (
                          <div className="text-center mt-3 bg-slate-50 border border-slate-100 py-2.5 rounded-xl">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                              Waiting for response
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  className={`flex w-full ${marginBottom} ${isMe ? "justify-end" : "justify-start"}`}
                >
                  {!isMe && (
                    <div className="w-8 flex-shrink-0 flex flex-col justify-end">
                      {showAvatar ? (
                        <motion.div
                          className="w-7 h-7 -translate-x-1 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden z-10"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", bounce: 0.4 }}
                        >
                          {otherUser?.avatar_url ? (
                            <img src={otherUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                          ) : (
                            <img
                              src={`https://ui-avatars.com/api/?background=cbd5e1&color=334155&name=${encodeURIComponent(otherUser?.name || 'User')}`}
                              alt="avatar"
                            />
                          )}
                        </motion.div>
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
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating Input Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-6 px-4 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent pointer-events-none">
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
              className="flex-1 bg-transparent border-none outline-none ring-0 focus:ring-0 focus:outline-none px-2 py-2 text-slate-800 font-medium placeholder:text-slate-400 min-w-0 tracking-tight"
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
        offer={selectedOffer || { startDate: '', endDate: '', price: 0 }}
        listingTitle={otherUser?.name ? `Stay with ${otherUser.name}` : 'Special Offer'}
      />
    </div>
  );
};

export default Chat;