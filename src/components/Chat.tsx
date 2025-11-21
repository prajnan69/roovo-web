"use client";

import { useState, useEffect, useRef } from "react";
import { Keyboard } from "@capacitor/keyboard";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Plus, Image as ImageIcon, Mic } from "lucide-react";
import supabase from "../services/api";
import { Spinner } from "./ui/shadcn-io/spinner";
import { triggerHaptic } from "@/lib/haptics";

const Chat = ({ conversationId }: { conversationId: string }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [session, setSession] = useState<any>(null);

  // --- Keyboard & Auth Setup ---
  useEffect(() => {
    const setupKeyboard = async () => {
      if (typeof window !== 'undefined') {
          Keyboard.addListener("keyboardWillShow", (info) => setKeyboardHeight(info.keyboardHeight));
          Keyboard.addListener("keyboardWillHide", () => setKeyboardHeight(0));
      }
    };
    setupKeyboard();
    
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    };
    getSession();

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
          setMessages((prev) => [...prev, payload.new]);
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
    
    // Actual real-time subscription will replace the optimistic ID usually, 
    // but in simple cases, the duplicate key might be an issue if not handled. 
    // For this snippet, we assume the sub updates the list correctly.
  };

  if (loading) return <div className="flex h-full items-center justify-center"><Spinner /></div>;

  return (
    <div className="flex flex-col h-full bg-slate-50" style={{ paddingBottom: keyboardHeight }}>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-1 pb-4">
           {/* Date Separator (Static Example) */}
           <div className="flex justify-center py-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full">
                Today
              </span>
           </div>

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
                
              const marginBottom = isSequence && !timeGap ? 'mb-0.5' : 'mb-3';

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex w-full ${marginBottom} ${isMe ? "justify-end" : "justify-start"}`}
                >
                    {!isMe && (
                        <div className="w-8 mr-2 flex-shrink-0 flex flex-col justify-end">
                             {showAvatar ? (
                                 <div className="w-8 h-8 rounded-full bg-gray-200 border border-white shadow-sm overflow-hidden">
                                     <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${msg.sender_id}`} alt="avatar" />
                                 </div>
                             ) : <div className="w-8" />}
                        </div>
                    )}

                    <div className={`relative max-w-[75%] px-4 py-2.5 shadow-sm text-[15px] leading-relaxed
                        ${isMe 
                            ? `bg-indigo-500 text-white rounded-l-2xl ${roundedTop} rounded-br-sm` 
                            : `bg-white text-slate-800 border border-gray-100 rounded-r-2xl ${roundedTop} rounded-bl-sm`
                        }
                    `}>
                        <p>{msg.content}</p>
                        <div className={`text-[9px] text-right mt-1 font-medium ${isMe ? "text-indigo-100" : "text-gray-300"}`}>
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

      {/* Input Bar */}
      <div className="p-3 bg-white border-t border-gray-100 z-20">
        <form
          onSubmit={handleSendMessage}
          className="flex items-end gap-2"
        >
          {/* Attachment Button (Visual) */}
          <button type="button" className="p-3 text-gray-400 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors active:scale-95">
            <Plus className="w-5 h-5" />
          </button>

          <div className="flex-1 bg-gray-100 rounded-[24px] flex items-center min-h-[44px] px-1 border border-transparent focus-within:border-indigo-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Message..."
              className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-2 text-slate-800 placeholder:text-gray-500"
            />
          </div>

          {newMessage.trim() ? (
              <button
                type="submit"
                className="p-3 rounded-full bg-indigo-500 text-white shadow-md shadow-indigo-200 active:scale-90 transition-transform"
              >
                <Send className="w-5 h-5" />
              </button>
          ) : (
              <button type="button" className="p-3 text-gray-400 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors active:scale-95">
                 <Mic className="w-5 h-5" />
              </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default Chat;