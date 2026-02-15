"use client";

import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/services/api";
import supabase from "@/services/api";
import type { User } from "@supabase/supabase-js";
import { useNavigation } from "@/hooks/useNavigation";
import { formatLastMessageAt } from "@/lib/utils";
import Login from "./Login";

export interface Conversation {
  id: number;
  guest_id: string;
  host_id: string;
  listing_id: number;
  last_message_at: string;
  guest: {
    name: string;
  };
  host: {
    name: string;
  };
  listing: {
    title: string;
    primary_image_url: string;
  };
}

interface ConversationListProps {
  guestConversations?: Conversation[];
  hostConversations?: Conversation[];
  isDrawerMode?: boolean;
}

const ConversationList: React.FC<ConversationListProps> = ({ 
  guestConversations: propGuestConversations, 
  hostConversations: propHostConversations,
  isDrawerMode 
}) => {
  const [internalGuestConversations, setInternalGuestConversations] = useState<Conversation[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const { navigate } = useNavigation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'traveling' | 'hosting'>('traveling');

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      if (session) {
        setUser(session.user);
      }
    };
    checkSession();
  }, []);

  // Fetch only if props are not provided
  useEffect(() => {
    const fetchConversations = async () => {
      if (!user || propGuestConversations) return;
      try {
        const response = await fetch(`${API_BASE_URL}/api/chat/conversations/guest/${user.id}`);
        if (response.ok) {
           const data = await response.json();
           setInternalGuestConversations(data);
        }
      } catch (e) {
        console.error("Failed to fetch conversations", e);
      }
    };
    if (user) {
      fetchConversations();
    }
  }, [user, propGuestConversations]);

  const guestData = propGuestConversations || internalGuestConversations;
  const hostData = propHostConversations || []; // Internal fetching for host not implemented here to avoid complexity, App.tsx handles it

  const currentConversations = activeTab === 'traveling' ? guestData : hostData;

  if (!isLoggedIn) {
    return (
      <div className={`bg-white text-black flex flex-col items-center justify-center ${isDrawerMode ? 'h-full' : 'h-screen'}`}>
        <h2 className="text-xl font-bold mb-3">Please Login</h2>
        <p className="text-slate-500 mb-6 text-sm text-center px-6">Login to view your messages.</p>
        <button
          onClick={() => setIsLoginOpen(true)}
          className="bg-indigo-600 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
        >
          Login
        </button>
        <Login
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          onLoginSuccess={() => {
            setIsLoginOpen(false);
            setIsLoggedIn(true);
          }}
        />
      </div>
    );
  }

  return (
    <div className={`bg-white text-black ${isDrawerMode ? 'h-full' : 'h-screen'}`}>
      {!isDrawerMode && (
        <div className="p-4">
          <div className="text-xl font-bold">Messages</div>
        </div>
      )}
      
      {/* Tabs */}
      <div className="flex border-b border-slate-100 px-4">
        <button
          onClick={() => setActiveTab('traveling')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === 'traveling' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Traveling
        </button>
        <button
          onClick={() => setActiveTab('hosting')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === 'hosting' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Hosting
        </button>
      </div>

      <div className="divide-y divide-slate-100 overflow-y-auto h-[calc(100%-50px)]">
        {currentConversations.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-12 text-slate-400">
             <p>No messages yet.</p>
           </div>
        ) : (
          currentConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => navigate(`/messages/${conversation.id}`)}
              className="p-4 flex items-center space-x-3 cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <img
                src={conversation.listing.primary_image_url}
                alt={conversation.listing.title}
                className="w-12 h-12 rounded-full object-cover border border-slate-100"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h2 className="font-semibold text-sm truncate pr-2 text-slate-900">{conversation.listing.title}</h2>
                  <p className="text-[10px] text-slate-400 shrink-0">
                    {formatLastMessageAt(conversation.last_message_at)}
                  </p>
                </div>
                <p className="text-xs text-slate-500 truncate">
                  {user?.id === conversation.guest_id
                    ? `Host: ${conversation.host.name}`
                    : `Guest: ${conversation.guest.name}`}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationList;
