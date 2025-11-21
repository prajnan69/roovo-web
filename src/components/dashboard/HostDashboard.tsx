"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HostHeader from "./HostHeader";
import Overview from "./Overview";
import Calendar from "../Calendar";
import Messages from "./Messages";
import ManageListings from "./ManageListings";
import Bookings from "./Bookings";
import Payouts from "./Payouts";
import { useNavigation } from "@/hooks/useNavigation";
import supabase, { fetchConversationsByHostId } from "../../services/api";

interface HostDashboardProps {
  conversations: any[];
  selectedConversation: any;
  onConversationSelect: (conversation: any) => void;
}

const HostDashboard: React.FC<HostDashboardProps> = ({ conversations, selectedConversation, onConversationSelect }) => {
  const { pathname } = useNavigation();
  // Persist scroll position across renders/unmounts of HostHeader
  const scrollPosition = useRef(0);

  const renderContent = () => {
    if (pathname === "/hosting/calendar") {
      return <Calendar conversations={conversations} onConversationSelect={onConversationSelect} />;
    }
    if (pathname === "/hosting/messages") {
      return <Messages conversations={conversations} selectedConversation={selectedConversation} onConversationSelect={onConversationSelect} userType="host" />;
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
    return <Overview />;
  };

  return (
    <div className="h-screen flex flex-col">
      {!selectedConversation && (
        <HostHeader
          initialScroll={scrollPosition.current}
          onScroll={(pos) => scrollPosition.current = pos}
        />
      )}
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
