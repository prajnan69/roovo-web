"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronRight, ArrowLeft } from "lucide-react";
import supabase from "../../services/api";
import Chat from "../Chat";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

interface MessagesPageProps {
  conversations: any[];
  selectedConversation: any;
  onConversationSelect: (conversation: any) => void;
  userType: 'host' | 'guest';
}

const MessagesPage: React.FC<MessagesPageProps> = ({
  conversations: initialConversations,
  selectedConversation,
  onConversationSelect,
  userType,
}) => {
  const [conversations, setConversations] = useState<any[]>(initialConversations);

  // Handle real-time updates
  useEffect(() => {
    setConversations(initialConversations);
  }, [initialConversations]);

  useEffect(() => {
    const channel = supabase
      .channel("conversations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        (payload) => {
          setConversations((prev) => {
            const newConversations = [...prev];
            const index = newConversations.findIndex(
              (c) => c.id === (payload.new as any).id
            );
            if (index !== -1) newConversations.splice(index, 1);
            newConversations.unshift(payload.new as any);
            return newConversations;
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleConversationSelect = async (convo: any) => {
    await Haptics.impact({ style: ImpactStyle.Light });
    onConversationSelect(convo);
  };

  const handleBack = async () => {
    await Haptics.impact({ style: ImpactStyle.Light });
    onConversationSelect(null);
  };

  return (
    <div className="relative h-screen w-full bg-white overflow-hidden flex flex-col font-sans">
      <AnimatePresence initial={false} mode="popLayout">
        {/* --- Conversation List View --- */}
        {!selectedConversation && (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex-1 flex flex-col h-full bg-white"
          >
            {/* Native Header with Search */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2 px-4">
              <div className="text-2xl font-bold text-gray-900 mb-4 mt-2">Messages</div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search messages"
                  className="w-full bg-gray-100 text-base rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-800 placeholder:text-gray-500 transition-all"
                />
              </div>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400 space-y-2">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                    <Search className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="font-medium">No messages yet</p>
                </div>
              ) : (
                <div className="pb-24 pt-2">
                  {conversations.map((convo, i) => {
                    const otherUser = userType === 'host' ? convo.guest : convo.host;
                    const isLast = i === conversations.length - 1;

                    return (
                      <motion.div
                        key={convo.id}
                        onClick={() => handleConversationSelect(convo)}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`group active:bg-gray-50 transition-colors pl-4 pr-4 py-4 flex items-center gap-4 cursor-pointer ${!isLast ? 'border-b border-gray-50' : ''}`}
                      >
                        {/* Avatar with Image Fallback */}
                        <div className="relative flex-shrink-0">
                          <img
                            src={otherUser.avatar_url || convo.listing.primary_image_url || "https://ui-avatars.com/api/?background=random"}
                            alt="Avatar"
                            className="w-14 h-14 rounded-full object-cover border border-gray-100 shadow-sm"
                          />
                          {/* Online Dot Simulation */}
                          <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-1">
                            <h3 className="font-bold text-slate-900 truncate text-[16px]">
                              {otherUser.name || "User"}
                            </h3>
                            <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap ml-2">
                              {convo.last_message_at
                                ? new Date(convo.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : ''}
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="text-[12px] font-medium text-indigo-600 uppercase tracking-wide truncate mb-0.5">
                                {convo.listing.title}
                              </p>
                              <p className="text-[14px] text-gray-600 truncate leading-snug">
                                {convo.last_message?.content || <span className="italic opacity-60">Drafting...</span>}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* --- Chat Detail View --- */}
        {selectedConversation && (
          <motion.div
            key="chat"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
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
                  <img
                    src={selectedConversation.listing.primary_image_url}
                    className="w-full h-full object-cover"
                    alt="Listing"
                  />
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  <h2 className="text-sm font-bold text-slate-900 truncate leading-tight">
                    {userType === 'host' ? selectedConversation.guest.name : selectedConversation.host.name}
                  </h2>
                  <span className="text-[11px] text-gray-500 font-medium truncate">
                    {selectedConversation.listing.title}
                  </span>
                </div>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 relative bg-slate-50 overflow-hidden">
              <Chat conversationId={selectedConversation.id} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessagesPage;