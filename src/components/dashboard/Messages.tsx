import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronRight, ArrowLeft, LogIn, AlertTriangle, Sparkles, Bell, CheckCircle2 } from "lucide-react";
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
  hostConversations?: any[];
  isHost?: boolean;
}

const isStayIssue = (c: any) => {
  if (!c) return false;
  if (c.type === 'stay_issue' || c.metadata?.type === 'stay_issue') return true;
  if (c.last_message?.type === 'stay_issue') return true;
  const content = c.last_message_content || c.last_message?.content || '';
  if (
    content.includes('[Issue Reported') ||
    content.includes('🚨') ||
    content.includes('[Cleaning Requested') ||
    content.includes('🧹') ||
    content.includes('[Concierge Request') ||
    content.includes('🛎️') ||
    content.includes('[Issue Resolved]') ||
    content.includes('Guest reported an issue')
  ) {
    return true;
  }
  return false;
};

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
  const [activeTab, setActiveTab] = useState<'traveling' | 'hosting' | 'issues'>(
    userType === 'host' ? 'hosting' : 'traveling'
  );
  const initialSelectedRef = useRef(!!selectedConversation);
  const { setIsNavBarVisible } = useBottomNavBar();
  const { back, pathname } = useNavigation();

  const selectedContext: 'host' | 'guest' =
    selectedConversation?.__context === 'hosting' || selectedConversation?.__context === 'host'
      ? 'host'
      : activeTab === 'hosting' || userType === 'host'
      ? 'host'
      : 'guest';

  // Deep-linked / external selection handling
  useEffect(() => {
    if (selectedConversation?.__context) {
      if (selectedConversation.__context === 'issues') {
        setActiveTab('issues');
      } else if (selectedConversation.__context === 'host' || selectedConversation.__context === 'hosting') {
        setActiveTab('hosting');
      } else {
        setActiveTab('traveling');
      }
    }
  }, [selectedConversation]);

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
    const context = activeTab === 'hosting' ? 'host' : 'guest';
    onConversationSelect({ ...convo, __context: activeTab });

    // Mark as read in background
    try {
      await markConversationAsRead(convo.id, context);
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

  // Hardware back: close chat first if opened from inside the tab
  useBackCloseable(!!selectedConversation && !selectedConversation?.__fromExternal, () => onConversationSelect(null));

  const handleLoginClick = async () => {
    await triggerHaptic();
    if (onLoginClick) onLoginClick();
  };

  const handleSendOffer = async (offerDetails: { startDate: string, endDate: string, price: number }) => {
    if (!selectedConversation) return;

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

  // Lists filtered into 3 distinct sections
  const travelingList = (conversations || []).filter((c) => !isStayIssue(c));
  const hostingList = (
    hostConversations && hostConversations.length > 0
      ? hostConversations
      : userType === 'host'
      ? conversations
      : []
  ).filter((c) => !isStayIssue(c));

  // Combine stay issues without duplicate IDs
  const allConvos = [...(conversations || []), ...(hostConversations || [])];
  const seenIds = new Set<string>();
  const stayIssuesList = allConvos.filter((c) => {
    if (seenIds.has(c.id)) return false;
    seenIds.add(c.id);
    return isStayIssue(c);
  });

  const travelingUnread = travelingList.reduce((n: number, c: any) => n + (c.unread_count > 0 ? 1 : 0), 0);
  const hostingUnread = hostingList.reduce((n: number, c: any) => n + (c.unread_count > 0 ? 1 : 0), 0);
  const issuesUnread = stayIssuesList.reduce((n: number, c: any) => n + (c.unread_count > 0 ? 1 : 0), 0);

  const TABS = [
    { id: 'traveling', label: 'Traveling', count: travelingUnread },
    { id: 'hosting', label: 'Hosting', count: hostingUnread },
    { id: 'issues', label: 'Stay Issues', count: issuesUnread },
  ] as const;

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
      <motion.div
        initial={selectedConversation ? { opacity: 0 } : false}
        animate={{ opacity: selectedConversation ? 0 : 1 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        style={{ pointerEvents: selectedConversation ? 'none' : 'auto' }}
        className="flex-1 flex flex-col h-full bg-white"
      >
        {/* Native Header with Search and 3 Tabs */}
        <div className="pt-2 pb-2 px-4">
          <div className="text-2xl font-bold text-gray-900 mb-4 mt-2">Messages</div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search messages"
              className="w-full bg-gray-100 text-base rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-800 placeholder:text-gray-500 transition-all"
            />
          </div>

          {/* 3 Tabs: Traveling | Hosting | Stay Issues */}
          <div className="flex bg-gray-100 rounded-xl p-1 mt-3">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { triggerHaptic(); setActiveTab(tab.id); }}
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
                    {tab.label}
                    {tab.count > 0 && (
                      <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-black flex items-center justify-center ${tab.id === 'hosting' ? 'bg-emerald-500' : tab.id === 'issues' ? 'bg-amber-500' : 'bg-indigo-600'}`}>
                        {tab.count}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto">
              {(() => {
                if (activeTab === 'issues') {
                  if (stayIssuesList.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center h-[55vh] text-gray-400 space-y-2 px-6 text-center">
                        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-1">
                          <AlertTriangle className="w-7 h-7 text-amber-500" />
                        </div>
                        <p className="font-bold text-base text-slate-800">No Stay Issues</p>
                        <p className="text-xs text-slate-500 max-w-xs">
                          Active guest requests, maintenance issues, or housekeeping needs will be tracked here.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="pb-48 pt-2" key="issues">
                      {stayIssuesList.map((convo, i) => {
                        const otherUser = (userType === 'host' ? convo.guest : convo.host) || convo.guest || convo.host || {};
                        const isLast = i === stayIssuesList.length - 1;
                        const content = convo.last_message_content || convo.last_message?.content || '';
                        const isResolved = content.includes('[Issue Resolved]') || convo.status === 'resolved';
                        const isCleaning = content.includes('Cleaning Requested') || content.includes('Housekeeping');
                        const isConcierge = content.includes('Concierge Request');
                        const isIssue = !isCleaning && !isConcierge;

                        return (
                          <motion.div
                            key={convo.id}
                            onClick={() => handleConversationSelect({ ...convo, __context: 'issues' })}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut', delay: Math.min(i, 8) * 0.03 }}
                            className={`group active:bg-gray-50 transition-colors pl-4 pr-4 py-4 flex items-center gap-4 cursor-pointer ${!isLast ? 'border-b border-gray-50' : ''} ${!isResolved ? 'bg-amber-50/20' : ''}`}
                          >
                            {/* Icon Badge */}
                            <div className="relative flex-shrink-0">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                isResolved
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : isIssue
                                  ? 'bg-rose-100 text-rose-600'
                                  : isCleaning
                                  ? 'bg-indigo-100 text-indigo-600'
                                  : 'bg-amber-100 text-amber-600'
                              }`}>
                                {isResolved ? (
                                  <CheckCircle2 size={22} />
                                ) : isIssue ? (
                                  <AlertTriangle size={22} />
                                ) : isCleaning ? (
                                  <Sparkles size={22} />
                                ) : (
                                  <Bell size={22} />
                                )}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-baseline mb-1">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                    isResolved
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : isIssue
                                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                      : isCleaning
                                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}>
                                    {isResolved ? 'Resolved' : isIssue ? 'Guest Issue' : isCleaning ? 'Housekeeping' : 'Concierge'}
                                  </span>
                                  <span className="text-xs font-semibold text-slate-900 truncate">
                                    {otherUser.name || 'Guest'}
                                  </span>
                                </div>
                                <span className="text-[11px] font-medium text-gray-400 ml-2">
                                  {convo.last_message_at
                                    ? new Date(convo.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    : ''}
                                </span>
                              </div>

                              <div className="flex justify-between items-center">
                                <div className="flex-1 min-w-0 pr-2">
                                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide truncate mb-0.5">
                                    {convo.listing?.title || 'Listing'}
                                  </p>
                                  <p className="text-[13px] truncate text-slate-700 font-medium leading-snug">
                                    {content || 'View stay request details'}
                                  </p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 ml-2 flex-shrink-0" />
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  );
                }

                // Regular Traveling or Hosting List
                const list = activeTab === 'hosting' ? hostingList : travelingList;
                const isHostingTab = activeTab === 'hosting';

                if (list.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400 space-y-2">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                        <Search className="w-6 h-6 text-gray-300" />
                      </div>
                      <p className="font-medium">
                        {isHostingTab ? 'No hosting messages yet' : 'No traveling messages yet'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="pb-48 pt-2" key={activeTab}>
                    {list.map((convo, i) => {
                      const otherUser = (isHostingTab ? convo.guest : convo.host) || {};
                      const isLast = i === list.length - 1;
                      const hasUnread = convo.unread_count > 0 || (!convo.last_message?.is_read && convo.last_message?.sender_id !== otherUser.id);

                      return (
                        <motion.div
                          key={convo.id}
                          onClick={() => handleConversationSelect(convo)}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, ease: 'easeOut', delay: Math.min(i, 8) * 0.03 }}
                          className={`group active:bg-gray-50 transition-colors pl-4 pr-4 py-4 flex items-center gap-4 cursor-pointer ${!isLast ? 'border-b border-gray-50' : ''} ${hasUnread ? (isHostingTab ? 'bg-emerald-50/30' : 'bg-indigo-50/30') : ''}`}
                        >
                          <div className="relative flex-shrink-0">
                            <img
                              src={otherUser?.avatar_url || (convo.listing?.images_data?.[0]?.url) || (convo.listing?.all_image_urls?.[0]?.url) || "https://ui-avatars.com/api/?background=random"}
                              alt="Avatar"
                              className="w-14 h-14 rounded-full object-cover border border-gray-100 shadow-sm"
                            />
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
                                <p className={`text-[12px] font-medium uppercase tracking-wide truncate mb-0.5 ${isHostingTab ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                  {isHostingTab ? `Hosting · ${convo.listing?.title}` : convo.listing?.title}
                                </p>
                                <p className={`text-[14px] truncate leading-snug ${hasUnread ? 'font-medium text-slate-800' : 'text-gray-600'}`}>
                                  {convo.last_message?.content || <span className="italic opacity-60">Start a conversation...</span>}
                                </p>
                              </div>
                              {hasUnread && (
                                <div className={`w-2 h-2 rounded-full ml-2 shadow-sm ${isHostingTab ? 'bg-emerald-500 shadow-emerald-200' : 'bg-indigo-500 shadow-indigo-200'}`}></div>
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
          const otherUser =
            (selectedContext === 'host'
              ? selectedConversation.guest || selectedConversation.host
              : selectedConversation.host || selectedConversation.guest) || {};
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
                      {selectedContext === 'host' ? (
                        <span className="text-emerald-600 font-bold">Hosting · </span>
                      ) : selectedConversation.__context === 'issues' ? (
                        <span className="text-amber-600 font-bold">Stay Request · </span>
                      ) : null}
                      {selectedConversation.listing?.title || selectedConversation.listing_title || 'Stay'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Chat Body */}
              <div className="flex-1 relative bg-slate-50 overflow-hidden">
                <Chat
                  conversationId={selectedConversation.id}
                  otherUser={otherUser}
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