"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Home, Search, MessageSquare, UserCircle2, Repeat, Building2 } from "lucide-react";
import { useNavigation } from "@/hooks/useNavigation";
import { triggerHaptic } from "@/lib/haptics";
import { usePreloadedData } from "@/context/PreloadContext";

interface BottomNavBarProps {
  show: boolean;
  isChatOpen?: boolean;
  onSearchClick: () => void;
  openLogin: () => void;
  onSwitchToHost?: () => void;
  onSwitchToTraveling?: () => void;
  onMessagesClick?: () => void;
  unreadCount?: number;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({
  show,
  onSearchClick,
  openLogin,
  onSwitchToHost,
  onSwitchToTraveling,
  onMessagesClick,
  unreadCount = 0,
}) => {
  const { pathname, navigate } = useNavigation();
  const { profileData } = usePreloadedData();

  const isLoggedIn = !!profileData;
  const isHost = profileData?.is_host || false;
  const isHostingPage = pathname.startsWith('/hosting');

  // Helper for click handling
  const handleItemClick = (item: any, e: any) => {
    triggerHaptic();
    if (item.action) {
      e.preventDefault();
      item.action();
    } else {
      navigate(item.href);
    }
  };

  // Define Items Groups
  const getItems = () => {
    if (isHostingPage) {
      // Hosting Mode - Only switch button
      return {
        left: [],
        center: { href: "#", label: "Travel", icon: Repeat, action: onSwitchToTraveling },
        right: []
      };
    } else {
      // Guest Mode
      return {
        left: [
          { href: "/", label: "Explore", icon: Home },
          { label: "Search", icon: Search, action: onSearchClick },
        ],
        center: isHost
          ? { href: "/hosting", label: "Hosting", icon: Repeat, action: onSwitchToHost }
          : { href: "/become-host", label: "Roovo your home", icon: Building2, action: () => navigate('/import-listing') },
        right: [
          { href: "/messages", label: "Messages", icon: MessageSquare, action: onMessagesClick },
          { href: isLoggedIn ? "/profile" : "/login", label: isLoggedIn ? "Profile" : "Log in", icon: UserCircle2, action: isLoggedIn ? undefined : openLogin },
        ]
      };
    }
  };

  const { left, center, right } = getItems();

  const renderItem = (item: any, isCenter = false) => {
    const isActive = pathname === item.href;
    return (
      <motion.button
        key={item.label}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => handleItemClick(item, e)}
        className={`relative flex flex-col items-center justify-center h-full px-1 ${isCenter ? '-mt-6' : 'flex-1 max-w-[80px]'}`}
      >
        {/* Add the label and active dot */}
        {isCenter ? (
          // Center Floating Button
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-[0_8px_30px_rgba(255,255,255,0.1),0_8px_30px_rgba(79,70,229,0.3)] ring-4 ring-white/50 backdrop-blur-md hover:scale-105 transition-transform duration-300">
              <item.icon size={26} strokeWidth={2.5} />
            </div>
          </div>
        ) : (
          // Standard Button
          <div className="flex flex-col items-center justify-center w-full h-full pt-1">
            <div className={`transition-all duration-300 ease-out ${isActive ? 'text-indigo-600 scale-110 drop-shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <div className="relative">
                <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                {item.label === 'Messages' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
            </div>
            <span className={`text-[10px] font-semibold mt-1 tracking-wide whitespace-nowrap transition-colors duration-300 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`}>
              {item.label}
            </span>
          </div>
        )}
      </motion.button>
    );
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          {isHostingPage ? (
            // Hosting Mode - Floating Icon Button at Bottom Right (above wheel)
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
              className="fixed bottom-[88px] right-4 z-50"
            >
              <button
                onClick={center.action}
                className="w-14 h-14 bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-4 ring-white active:scale-95 transition-all"
              >
                <center.icon size={24} strokeWidth={2} />
              </button>
            </motion.div>
          ) : (
            // Traveling Mode - Full nav bar with background
            <motion.div
              initial={{ y: 150, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 150, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
            >
              <nav className="pointer-events-auto w-full max-w-[420px] bg-white/85 backdrop-blur-3xl border border-white/80 rounded-full shadow-[0_8px_40px_rgba(0,0,0,0.12)] px-4 py-2.5">
                <div className="grid grid-cols-5 items-center justify-items-center h-14 relative w-full">
                  {/* Left Items */}
                  {left.map((item) => renderItem(item))}

                  {/* Center Space for Floating Button */}
                  {renderItem(center, true)}

                  {/* Right Items */}
                  {right.map((item) => renderItem(item))}
                </div>
              </nav>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
};

export default BottomNavBar;
