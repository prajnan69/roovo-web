"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HostBottomNavigation from "./HostBottomNavigation";
import Overview from "./Overview";
import Calendar from "./Calendar";
import Messages from "./Messages";
import ManageListings from "./ManageListings";
import Bookings from "./Bookings";
import Payouts from "./Payouts";
import PayoutMethods from "./PayoutMethods";
import { useNavigation } from "@/hooks/useNavigation";
import { usePreloadedData } from "@/context/PreloadContext";
import supabase, { fetchConversationsByHostId } from "../../services/api";

interface HostDashboardProps {
  conversations: any[];
  selectedConversation: any;
  onConversationSelect: (conversation: any) => void;
  guestConversations?: any[];
}

const HostDashboard: React.FC<HostDashboardProps> = ({ conversations, selectedConversation, onConversationSelect, guestConversations = [] }) => {
  const { pathname, navigate } = useNavigation();
  const { profileData } = usePreloadedData();

  // Client-side gate: the dashboard is host-only. Logged-out users and
  // non-host guests (e.g. arriving via /hosting after guest KYC) go home.
  // The backend must still enforce this on its own endpoints.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled && !session) navigate('/');
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (profileData && !profileData.is_host) navigate('/');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileData]);

  const renderContent = () => {
    if (pathname === "/hosting/calendar") {
      return <Calendar />;
    }
    if (pathname === "/hosting/messages") {
      return (
        <Messages
          conversations={guestConversations}
          hostConversations={conversations}
          selectedConversation={selectedConversation}
          onConversationSelect={onConversationSelect}
          userType="host"
          isHost={true}
        />
      );
    }
    if (pathname === "/hosting/listings") {
      return <ManageListings />;
    }
    if (pathname === "/hosting/bookings") {
      return <Bookings />;
    }
    if (pathname === "/hosting/payouts") {
      return <Payouts />;
    }
    if (pathname === "/hosting/payout-methods") {
      return <PayoutMethods />;
    }
    return <Overview />;
  };

  return (
    <div className="h-screen flex flex-col relative bg-gray-50">
      {pathname !== "/hosting/payout-methods" && !selectedConversation && <HostBottomNavigation />}
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-grow overflow-y-auto"
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default HostDashboard;
