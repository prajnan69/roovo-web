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
  onMessagesClick: () => void;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({
  show,
  onSearchClick,
  openLogin,
  onSwitchToHost,
  onSwitchToTraveling,
  onMessagesClick
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
          { label: "Messages", icon: MessageSquare, action: onMessagesClick },
          { href: isLoggedIn ? "/profile" : "/login", label: isLoggedIn ? "Profile" : "Log in", icon: UserCircle2, action: isLoggedIn ? undefined : openLogin },
        ]
      };
    }
  };

  const { left, center, right } = getItems();

  const renderItem = (item: any, isCenter = false, isPill = false) => {
    const isActive = pathname === item.href;
    return (
      <motion.button
        key={item.label}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => handleItemClick(item, e)}
        className={`relative flex flex-col items-center justify-center h-full ${isCenter ? 'w-16 -mt-6' : 'flex-1'}`}
      >
        {isCenter ? (
          // Center Floating Button
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-4 ring-white">
              <item.icon size={22} strokeWidth={2} />
            </div>
            <span className="text-[10px] font-medium text-slate-500 mt-1">{item.label}</span>
          </div>
        ) : (
          // Standard Button
          <>
            <div className={`transition-colors duration-200 ${isActive ? 'text-black' : 'text-slate-400'}`}>
              <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] font-medium mt-0.5 ${isActive ? 'text-black' : 'text-slate-400'}`}>
              {item.label}
            </span>
            {isActive && !isCenter && (
              <motion.div
                layoutId="active-indicator"
                className="absolute top-1 w-1 h-1 bg-black rounded-full"
              />
            )}
          </>
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
            <motion.nav
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 pb-[env(safe-area-inset-bottom)] md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.03)]"
            >
              <div className="flex items-center justify-between h-16 px-2 max-w-md mx-auto relative">
                {/* Left Items */}
                <div className="flex flex-1 justify-around">
                  {left.map((item) => renderItem(item))}
                </div>

                {/* Center Space for Floating Button */}
                <div className="w-16 flex justify-center">
                  {renderItem(center, true)}
                </div>

                {/* Right Items */}
                <div className="flex flex-1 justify-around">
                  {right.map((item) => renderItem(item))}
                </div>
              </div>
            </motion.nav>
          )}
        </>
      )}
    </AnimatePresence>
  );
};

export default BottomNavBar;
