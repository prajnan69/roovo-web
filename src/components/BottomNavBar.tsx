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

// Nav background — matches prototype's var(--nav)
const NAV_BG = 'rgba(255,255,255,0.88)';

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

  const handleClick = (item: any) => {
    triggerHaptic();
    if (item.action) item.action();
    else navigate(item.href);
  };

  // 5 items (always): Explore | Search | [FAB] | Messages | Profile
  const items = isHostingPage
    ? [
        { id: '_hosting_back', label: 'Back', icon: Home, action: onSwitchToTraveling },
        { id: '_sp1', label: '', icon: null },
        { id: '_fab', label: '', icon: Repeat, action: onSwitchToTraveling },
        { id: '_sp2', label: '', icon: null },
        { id: '_sp3', label: '', icon: null },
      ]
    : [
        { id: 'home', href: '/', label: 'Explore', icon: Home },
        { id: 'search', label: 'Search', icon: Search, action: onSearchClick },
        {
          id: '_fab', label: '', icon: isHost ? Repeat : Building2,
          action: isHost ? onSwitchToHost : () => navigate('/import-listing')
        },
        { id: 'messages', href: '/messages', label: 'Messages', icon: MessageSquare, action: onMessagesClick },
        {
          id: 'profile',
          href: isLoggedIn ? '/profile' : '/login',
          label: isLoggedIn ? 'Profile' : 'Login',
          icon: UserCircle2,
          action: isLoggedIn ? undefined : openLogin,
          badge: unreadCount > 0 && false, // future
        },
      ];

  return (
    <AnimatePresence>
      {show && (
        <>
          {isHostingPage ? (
            // Hosting: small floating FAB only
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
              className="fixed bottom-24 right-4 z-50"
            >
              <button
                onClick={() => { triggerHaptic(); onSwitchToTraveling?.(); }}
                style={{ width: 56, height: 56, borderRadius: 9999, background: '#4F46E5', border: '4px solid rgba(255,255,255,.88)', boxShadow: '0 8px 30px rgba(79,70,229,.35),0 4px 14px rgba(0,0,0,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Repeat size={22} strokeWidth={2.2} color="#fff" />
              </button>
            </motion.div>
          ) : (
            // Guest mode — full pill nav matching prototype exactly
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              style={{
                position: 'fixed',
                bottom: 24,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                padding: '0 20px',
                zIndex: 50,
                pointerEvents: 'none',
              }}
            >
              <nav
                style={{
                  pointerEvents: 'all',
                  width: '100%',
                  maxWidth: 360,
                  background: NAV_BG,
                  backdropFilter: 'blur(32px)',
                  WebkitBackdropFilter: 'blur(32px)',
                  border: '1px solid rgba(0,0,0,0.10)',
                  borderRadius: 9999,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                  padding: '10px 20px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5,1fr)',
                  alignItems: 'center',
                }}
              >
                {items.map((item, i) => {
                  const anyItem = item as any;
                  const isActive = !!anyItem.href && pathname === anyItem.href;
                  const isFab = item.id === '_fab';
                  const isBlank = !item.icon;

                  if (isBlank) return <div key={i} />;

                  if (isFab) {
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'center', marginTop: -28 }}>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleClick(item)}
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: 9999,
                            background: '#4F46E5',
                            // Use the nav bg color for border so it blends seamlessly
                            border: `4px solid ${NAV_BG}`,
                            boxShadow: '0 8px 30px rgba(79,70,229,.35),0 4px 14px rgba(0,0,0,.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <item.icon
                            size={28}
                            strokeWidth={2}
                            color="#fff"
                            style={{ width: 28, height: 28, flexShrink: 0 }}
                          />
                        </motion.button>
                      </div>
                    );
                  }

                  return (
                    <motion.button
                      key={i}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleClick(item)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 3,
                        padding: '4px 0',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        transform: isActive ? 'scale(1.12)' : 'scale(1)',
                        transition: 'transform .22s cubic-bezier(.34,1.56,.64,1)',
                        position: 'relative',
                      }}
                    >
                      <div style={{ position: 'relative' }}>
                        <item.icon
                          size={22}
                          strokeWidth={isActive ? 2.4 : 1.8}
                          color={isActive ? '#4F46E5' : '#888880'}
                        />
                        {item.id === 'messages' && unreadCount > 0 && (
                          <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 9999, background: '#EF4444', fontSize: 9, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </div>
                      {item.label ? (
                        <span style={{ fontSize: 10, fontWeight: 600, color: isActive ? '#4F46E5' : '#888880', letterSpacing: '.02em', whiteSpace: 'nowrap' }}>
                          {item.label}
                        </span>
                      ) : null}
                    </motion.button>
                  );
                })}
              </nav>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
};

export default BottomNavBar;
