"use client";

import { useNavigation } from "@/hooks/useNavigation";
import { motion } from "framer-motion";
import { useRef, useEffect, useState, useLayoutEffect } from "react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

interface HostHeaderProps {
  initialScroll?: number;
  onScroll?: (scrollLeft: number) => void;
}

const HostHeader: React.FC<HostHeaderProps> = ({ initialScroll = 0, onScroll }) => {
  const { navigate, pathname } = useNavigation();
  const [activeTab, setActiveTab] = useState(pathname);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveTab(pathname);
  }, [pathname]);

  // Restore scroll position on mount
  useLayoutEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = initialScroll;
    }
  }, []); // Only run on mount

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (onScroll) {
      onScroll(e.currentTarget.scrollLeft);
    }
  };

  const handleTabClick = async (path: string) => {
    await Haptics.impact({ style: ImpactStyle.Light });
    navigate(path);
  };

  const navItems = [
    { id: "overview", label: "Overview", path: "/hosting" },
    { id: "calendar", label: "Calendar", path: "/hosting/calendar" },
    { id: "listings", label: "Listings", path: "/hosting/listings" },
    { id: "messages", label: "Messages", path: "/hosting/messages" },
    { id: "bookings", label: "Bookings", path: "/hosting/bookings" },
    { id: "payouts", label: "Payouts", path: "/hosting/payouts" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 pt-safe-top">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="max-w-7xl mx-auto flex items-center overflow-x-auto scrollbar-hide px-4 h-[52px]"
      >
        <nav className="flex space-x-1 relative min-w-full">
          {navItems.map((item) => {
            const isActive = activeTab === item.path || (item.path === "/hosting" && activeTab === "/hosting/");

            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.path)}
                className={`relative px-4 py-2 rounded-full text-sm font-semibold transition-colors z-10 whitespace-nowrap ${isActive ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="hostHeaderActiveTab"
                    className="absolute inset-0 bg-gray-100 rounded-full -z-10"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default HostHeader;
