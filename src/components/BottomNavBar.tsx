"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import supabase from "@/services/api";
import { Home, Search, MessageSquare, UserCircle2, LogIn, Repeat } from "lucide-react";
import { useNavigation } from "@/hooks/useNavigation";
import { triggerHaptic } from "@/lib/haptics";

// Define nav items with Lucide icons
const getNavItems = (isLoggedIn: boolean) => [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  isLoggedIn
    ? { href: "/profile", label: "Profile", icon: UserCircle2 }
    : { href: "/login", label: "Login", icon: LogIn },
];

interface BottomNavBarProps {
  show: boolean;
  isChatOpen?: boolean;
  onSearchClick: () => void;
  openLogin: () => void;
  onSwitchToHost?: () => void;
  onSwitchToTraveling?: () => void;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ show, isChatOpen, onSearchClick, openLogin, onSwitchToHost, onSwitchToTraveling }) => {
  const { pathname, navigate } = useNavigation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      if (session) {
        const { data: hostData } = await supabase
          .from('hosts')
          .select('id')
          .eq('user_id', session.user.id)
          .single();
        setIsHost(!!hostData);
      }
    };
    checkSession();
  }, []);

  const handleProfileClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    triggerHaptic();
    if (!isLoggedIn) {
      e.preventDefault();
      openLogin();
    } else {
      navigate("/profile");
    }
  };

  const isHostingPage = pathname.startsWith('/hosting');
  const navLinks = getNavItems(isLoggedIn);

  // Add Hosting link if applicable - Center it
  if (isHost && !isHostingPage) {
    if (!navLinks.find(item => item.label === 'Hosting')) {
      // Insert at index 2 (middle of 5 items: 0, 1, [2], 3, 4)
      navLinks.splice(2, 0, {
        href: "/hosting",
        label: "Hosting",
        icon: Repeat,
      });
    }
  }

  // Special Hosting Mode Footer - Glassmorphic
  if (isHostingPage) {
    if (!show) return null; // Respect the show prop
    return (
      <motion.footer
        initial={{ y: 100 }}
        animate={{ y: isChatOpen ? 100 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] left-1/2 -translate-x-1/2 z-50 md:hidden"
      >
        <button
          onClick={() => {
            triggerHaptic();
            if (onSwitchToTraveling) onSwitchToTraveling();
          }}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-slate-900 font-medium shadow-lg shadow-black/5 active:scale-95 transition-transform"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)' }} // Fallback/Adjustment for visibility
        >
          <Repeat className="w-4 h-4" />
          <span>Switch to Traveling</span>
        </button>
      </motion.footer>
    );
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.nav
          initial={{ y: 100, opacity: 0, x: "-50%" }}
          animate={{ y: 0, opacity: 1, x: "-50%" }}
          exit={{ y: 100, opacity: 0, x: "-50%" }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] left-1/2 z-50 w-[94%] max-w-md bg-white/90 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-2xl md:hidden"
        >
          <div className="flex items-center justify-around p-1.5">
            {navLinks.map((item) => {
              const isActive = pathname === item.href;
              const isSearchButton = item.label === "Search";
              const isHostingButton = item.label === "Hosting";

              const handleClick = (e: any) => {
                triggerHaptic();
                if (isSearchButton) {
                  onSearchClick();
                } else if (item.label === "Profile" || item.label === "Login") {
                  handleProfileClick(e);
                } else if (isHostingButton) {
                  if (onSwitchToHost) onSwitchToHost();
                } else {
                  navigate(item.href);
                }
              };

              return (
                <button
                  key={item.label}
                  onClick={handleClick}
                  className="relative flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors"
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-indigo-50 rounded-xl -z-10"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}

                  <motion.div
                    animate={{ scale: isActive ? 1 : 0.9 }}
                    whileTap={{ scale: 0.8 }}
                    className={`flex flex-col items-center justify-center ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}
                  >
                    <item.icon className={`${isHostingButton ? 'w-5 h-5' : 'w-6 h-6'} mb-0.5`} strokeWidth={isActive ? 2.5 : 2} />

                    <span className="text-[10px] font-medium tracking-tight">
                      {item.label}
                    </span>
                  </motion.div>
                </button>
              );
            })}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
};

export default BottomNavBar;
