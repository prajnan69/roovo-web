"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronRight, ArrowLeft, LogIn } from "lucide-react";
import supabase, { markConversationAsRead } from "../../services/api";
import Chat from "../Chat";
import { triggerHaptic } from "@/lib/haptics";
import { useBottomNavBar } from "@/context/BottomNavBarContext";
import { useNavigation } from "@/hooks/useNavigation";
import { useBackCloseable } from "@/hooks/useBackCloseable";
import SendOfferDrawer from "./SendOfferDrawer";
import { sendOfferMessage } from "../../services/api";

interface MessagesPageProps {
  conversations: any[];
  selectedConversation: any;
  onConversationSelect: (conversation: any) => void;
  userType: 'host' | 'guest';
  onLoginClick?: () => void;
  isAuthenticated?: boolean;
  // Unified mode: when the signed-in user is also a host, the guest messages
  // screen shows both their traveling and hosting conversations behind a
  // segmented toggle. Plain guests never see it.
  hostConversations?: any[];
  isHost?: boolean;
}

const MessagesPage: React.FC<MessagesPageProps> = ({
  conversations: initialConversations,
  selectedConversation,
  onConversationSelect,
  userType,
  onLoginClick,
  isAuthenticated = true,
  hostConversations = [],
  isHost = false,
}) => {
  const [conversations, setConversations] = useState<any[]>(initialConversations);
  const [isOfferDrawerOpen, setIsOfferDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'guest' | 'host'>('guest');
  const initialSelectedRef = useRef(!!selectedConversation);
  const { setIsNavBarVisible } = useBottomNavBar();
  const { back, pathname } = useNavigation();

  const unified = isHost && userType === 'guest';
  // The context a conversation was opened under decides how the chat behaves
  // (who the "other user" is, whether the offer drawer is available).
  const selectedContext: 'host' | 'guest' =
    selectedConversation?.__context || (unified ? 'guest' : userType);

  // A deep-linked/host conversation should land on the matching tab
  useEffect(() => {
    if (unified && selectedConversation?.__context) {
      setActiveTab(selectedConversation.__context);
    }
  }, [unified, selectedConversation]);

  useEffect(() => {
    if (selectedConversation) {
      setIsNavBarVisible(false);
    } else {
      setIsNavBarVisible(true);
    }
  }, [selectedConversation, setIsNavBarVisible]);

  useEffect(() => {
    return () => setIsNavBarVisible(true);
  }, [setIsNavBarVisible]);

  // Handle real-time updates
  useEffect(() => {
    setConversations(initialConversations);
  }, [initialConversations]);

  const handleConversationSelect = async (convo: any) => {
    initialSelectedRef.current = false;
    await triggerHaptic();
    const context = unified ? activeTab : userType;
    onConversationSelect(unified ? { ...convo, __context: context } : convo);

    // Mark as read in background
    try {
      await markConversationAsRead(convo.id, context);
      // locally update for immediate UI feedback
      convo.unread_count = 0;
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleBack = async () => {
    await triggerHaptic();
    if (selectedConversation?.__fromExternal) {
      onConversationSelect(null);
      back();
    } else if (selectedConversation) {
      onConversationSelect(null);
    } else if (!pathname.includes("/hosting")) {
      back();
    }
  };

  // Hardware back: close chat first if opened from inside the tab, or
  // let it pop to previous page if entered from listing/trips.
  useBackCloseable(!!selectedConversation && !selectedConversation?.__fromExternal, () => onConversationSelect(null));

  const handleLoginClick = async () => {
    await triggerHaptic();
    if (onLoginClick) onLoginClick();
  };

  const handleSendOffer = async (offerDetails: { startDate: string, endDate: string, price: number }) => {
    if (!selectedConversation) return;

    // Use current session context or host ID. The host relies on session.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      await sendOfferMessage(
        selectedConversation.id,
        session.user.id,
        `I'd like to offer you a special price for your stay.`,
        {
          ...offerDetails,
          listing_id: selectedConversation.listing_id || selectedConversation.listing?.id
        }
      );
    } catch (error) {
      console.error('Failed to send offer:', error);
      alert('Failed to send offer. Please try again.');
    }
  };

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="relative h-screen w-full bg-white overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <div className={`sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100 ${userType === 'guest' ? 'pt-[calc(env(safe-area-inset-top)+0.5rem)]' : 'pt-2'} pb-2 px-4`}>
          <div className="text-2xl font-bold text-gray-900 mb-2 mt-2">Messages</div>
        </div>

        {/* Login Prompt */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-48">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
            <LogIn className="w-10 h-10 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3 text-center">
            Log in to view your messages
          </h2>
          <p className="text-slate-500 text-center mb-8 max-w-sm">
            Sign in to access your conversations and connect with hosts or guests.
          </p>
          <button
            onClick={handleLoginClick}
            className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-full shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all"
          >
            Log in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full bg-white overflow-hidden flex flex-col font-sans">
      {/* --- Conversation List View — always mounted, never unmounts.
          It used to be conditionally rendered ({!selectedConversation && ...})
          inside the same AnimatePresence as the chat detail view, in
          "popLayout" mode. That unmounted/remounted the entire list on every
          chat open/close (rebuilding every row from scratch — the flash), and
          popLayout also force-switches an exiting element from normal layout
          flow to position:absolute mid-animation, which visibly snaps if its
          measured box doesn't match exactly. Matches the same fix already
          applied to the app's root Router for the home page. */}
      <motion.div
        initial={selectedConversation ? { opacity: 0 } : false}
        animate={{ opacity: selectedConversation ? 0 : 1 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        style={{ pointerEvents: selectedConversation ? 'none' : 'auto' }}
        className="flex-1 flex flex-col h-full bg-white"
      >
        {/* Native Header with Search */}
            <div className={`pt-2 pb-2 px-4`}>
              <div className="text-2xl font-bold text-gray-900 mb-4 mt-2">Messages</div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search messages"
                  className="w-full bg-gray-100 text-base rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-800 placeholder:text-gray-500 transition-all"
                />
              </div>

              {/* Traveling / Hosting toggle — hosts only */}
              {unified && (
                <div className="flex bg-gray-100 rounded-xl p-1 mt-3">
                  {(['guest', 'host'] as const).map((tab) => {
                    const label = tab === 'guest' ? 'Traveling' : 'Hosting';
                    const list = tab === 'guest' ? conversations : hostConversations;
                    const unread = list.reduce((n: number, c: any) => n + (c.unread_count > 0 ? 1 : 0), 0);
                    const active = activeTab === tab;
                    return (
                      <button
                        key={tab}
                        onClick={() => { triggerHaptic(); setActiveTab(tab); }}
                        className={`relative flex-1 py-2 rounded-lg text-[13px] font-bold transition-colors ${active ? 'text-slate-900' : 'text-gray-400'}`}
                      >
                        {active && (
                          <motion.div
                            layoutId="messages-tab-pill"
                            className="absolute inset-0 bg-white rounded-lg shadow-sm"
                            transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                          />
                        )}
                        <span className="relative z-10 flex items-center justify-center gap-1.5">
                          {label}
                          {unread > 0 && (
                            <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-black flex items-center justify-center ${tab === 'host' ? 'bg-emerald-500' : 'bg-indigo-600'}`}>
                              {unread}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto">
              {(() => {
                const rowType: 'host' | 'guest' = unified ? activeTab : userType;
                const list = unified && activeTab === 'host' ? hostConversations : conversations;
                if (list.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400 space-y-2">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                        <Search className="w-6 h-6 text-gray-300" />
                      </div>
                      <p className="font-medium">
                        {rowType === 'host' ? 'No guest messages yet' : 'No messages yet'}
                      </p>
                    </div>
                  );
                }
                return (
                <div className="pb-48 pt-2" key={rowType}>
                  {list.map((convo, i) => {
                    const otherUser = (rowType === 'host' ? convo.guest : convo.host) || {};
                    const isLast = i === list.length - 1;
                    const isHostingRow = rowType === 'host';

                    // Simple unread detection: if the last message wasn't sent by us (we don't have user id here easily without prop drilling, but we can assume bolding until opened)
                    // Let's just use a more subtle styling for the last message
                    const hasUnread = convo.unread_count > 0 || (!convo.last_message?.is_read && convo.last_message?.sender_id !== otherUser.id);

                    return (
                      <motion.div
                        key={convo.id}
                        onClick={() => handleConversationSelect(convo)}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut', delay: Math.min(i, 8) * 0.03 }}
                        className={`group active:bg-gray-50 transition-colors pl-4 pr-4 py-4 flex items-center gap-4 cursor-pointer ${!isLast ? 'border-b border-gray-50' : ''} ${hasUnread ? (isHostingRow ? 'bg-emerald-50/30' : 'bg-indigo-50/30') : ''}`}
                      >
                        {/* Avatar with Image Fallback */}
                        <div className="relative flex-shrink-0">
                          <img
                            src={otherUser?.avatar_url || (convo.listing?.images_data?.[0]?.url) || (convo.listing?.all_image_urls?.[0]?.url) || "https://ui-avatars.com/api/?background=random"}
                            alt="Avatar"
                            className="w-14 h-14 rounded-full object-cover border border-gray-100 shadow-sm"
                          />
                          {/* Online Dot Simulation */}
                          <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-1">
                            <h3 className={`truncate text-[16px] ${hasUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>
                              {otherUser?.name || "User"}
                            </h3>
                            <span className={`text-[11px] font-medium whitespace-nowrap ml-2 ${hasUnread ? 'text-indigo-600' : 'text-gray-400'}`}>
                              {convo.last_message_at
                                ? new Date(convo.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : ''}
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <div className="flex-1 min-w-0 pr-2">
                              <p className={`text-[12px] font-medium uppercase tracking-wide truncate mb-0.5 ${isHostingRow ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                {isHostingRow ? `Hosting · ${convo.listing.title}` : convo.listing.title}
                              </p>
                              <p className={`text-[14px] truncate leading-snug ${hasUnread ? 'font-medium text-slate-800' : 'text-gray-600'}`}>
                                {convo.last_message?.content || <span className="italic opacity-60">Start a conversation...</span>}
                              </p>
                            </div>
                            {hasUnread && (
                              <div className={`w-2 h-2 rounded-full ml-2 shadow-sm ${isHostingRow ? 'bg-emerald-500 shadow-emerald-200' : 'bg-indigo-500 shadow-indigo-200'}`}></div>
                            )}
                            <ChevronRight className="w-4 h-4 text-gray-300 ml-2" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                );
              })()}
            </div>
      </motion.div>

      {/* --- Chat Detail View --- */}
      <AnimatePresence initial={false}>
        {selectedConversation && (() => {
          const otherUser = (selectedContext === 'host' ? selectedConversation.guest : selectedConversation.host) || {};
          return (
            <motion.div
              key="chat"
              initial={initialSelectedRef.current ? { x: 0 } : { x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              className="absolute inset-0 z-20 bg-white h-full flex flex-col shadow-2xl"
            >
              {/* Chat Header */}
              <div className="bg-white/90 backdrop-blur-md border-b border-gray-100 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 px-4 flex items-center gap-3 z-20 sticky top-0 shadow-sm">
                <button
                  onClick={handleBack}
                  className="p-2 -ml-2 rounded-full text-gray-800 hover:bg-gray-100 active:scale-90 transition-transform"
                >
                  <ArrowLeft size={22} />
                </button>

                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100 flex-shrink-0">
                    {otherUser?.avatar_url ? (
                      <img
                        src={otherUser.avatar_url}
                        className="w-full h-full object-cover"
                        alt="Avatar"
                      />
                    ) : (
                      <img
                        src={`https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(otherUser?.name || 'User')}`}
                        className="w-full h-full object-cover"
                        alt="Avatar"
                      />
                    )}
                  </div>
                  <div className="flex flex-col justify-center min-w-0">
                    <h2 className="text-sm font-bold text-slate-900 truncate leading-tight">
                      {otherUser.name || (selectedContext === 'host' ? 'Guest' : 'Host')}
                    </h2>
                    <span className="text-[11px] text-gray-500 font-medium truncate">
                      {selectedContext === 'host' && unified && (
                        <span className="text-emerald-600 font-bold">Hosting · </span>
                      )}
                      {selectedConversation.listing?.title || selectedConversation.listing_title || 'Stay'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Chat Body */}
              <div className="flex-1 relative bg-slate-50 overflow-hidden">
                <Chat
                  conversationId={selectedConversation.id}
                  otherUser={selectedContext === 'host' ? selectedConversation.guest : selectedConversation.host}
                  onShowOfferDrawer={selectedContext === 'host' ? () => setIsOfferDrawerOpen(true) : undefined}
                />
              </div>

              {selectedContext === 'host' && (
                <SendOfferDrawer
                  isOpen={isOfferDrawerOpen}
                  onClose={() => setIsOfferDrawerOpen(false)}
                  onSend={handleSendOffer}
                  guestName={selectedConversation.guest?.name || 'Guest'}
                />
              )}
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};

export default MessagesPage;