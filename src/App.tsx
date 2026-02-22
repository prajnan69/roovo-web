import { useState, useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { LiveUpdate } from '@capawesome/capacitor-live-update';
import { StatusBar, Style } from '@capacitor/status-bar';
import { preloadAllGuestChats } from './services/chatService';
import supabase, { fetchConversationsByHostId, fetchConversationsByGuestId, fetchBookingsByGuestId } from './services/api';
import HomeFeed from './components/HomeFeed';
import ListingDetailsPage from './components/ListingDetailsPage';
import Profile from './components/Profile';
import HostDashboard from './components/dashboard/HostDashboard';
import Messages from './components/dashboard/Messages';
import VerifyIdentity from './components/VerifyIdentity';
import Router from './components/Router';
import Route from './components/Route';
import BottomNavBar from './components/BottomNavBar';
import MessagesDrawer from './components/MessagesDrawer';
import MobileSearchBar from './components/MobileSearchBar';
import SearchPage from './components/SearchPage';
import Login from './components/Login';
import { useNavigation } from './hooks/useNavigation';
import { PreloadProvider } from './context/PreloadContext';
import { BottomNavBarProvider, useBottomNavBar } from './context/BottomNavBarContext';
import SwitchingToHostLoader from './components/SwitchingToHostLoader';
import SwitchingToTravelingLoader from './components/SwitchingToTravelingLoader';
import SplashScreen from './components/SplashScreen';
import './index.css';
import NotificationToast from './components/NotificationToast';
import PaymentStatus from './components/PaymentStatus';

import ImportListingPage from './components/import/ImportListingPage';
import CohostInvitationPage from './components/invitation/CohostInvitationPage';
import HomeOptionsPills from './components/HomeOptionsPills';
import ContactUs from './components/legal/ContactUs';
import TermsAndConditions from './components/legal/TermsAndConditions';
import RefundsPolicy from './components/legal/RefundsPolicy';
import TripsPage from './components/TripsPage';

function AppContent() {
  const { isNavBarVisible } = useBottomNavBar();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginSubtitle, setLoginSubtitle] = useState<string | undefined>(undefined);
  const [isSwitchingToHost, setIsSwitchingToHost] = useState(false);
  const [isHostStatusResolved, setIsHostStatusResolved] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'host' | 'traveling'>('host');
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [isMessagesDrawerOpen, setIsMessagesDrawerOpen] = useState(false);
  const [hostConversations, setHostConversations] = useState<any[]>([]);
  const [guestConversations, setGuestConversations] = useState<any[]>([]);
  const [upcomingBooking, setUpcomingBooking] = useState<any>(null);
  const [showSplash, setShowSplash] = useState(!window.location.pathname.startsWith('/payment/status'));
  const [isHomeLoading, setIsHomeLoading] = useState(true);

  const { pathname, back, navigate } = useNavigation();
  const isPushInitialized = useRef(false);

  const showBottomNavBar =
    !pathname.startsWith('/listing/') &&
    !pathname.startsWith('/search') &&
    !pathname.startsWith('/import-listing') &&
    !pathname.startsWith('/verify-identity') &&
    !pathname.startsWith('/verify-identity') &&
    !pathname.startsWith('/hosting/verify') &&
    !pathname.startsWith('/hosting/payout-methods') &&
    !isSwitchingToHost &&
    !selectedConversation &&
    !isSearchOpen &&
    isNavBarVisible &&
    isHostStatusResolved;

  // Close search modal when navigating (e.g. to search results)
  useEffect(() => {
    setIsSearchOpen(false);
  }, [pathname]);

  // ✅ Self-hosted LiveUpdate logic
  useEffect(() => {
    const checkForSelfHostedUpdate = async () => {
      try {
        if (!Capacitor.isNativePlatform()) return;
        if (!Capacitor.isPluginAvailable('LiveUpdate')) {
          console.warn('LiveUpdate plugin not available on this platform');
          return;
        }

        console.log('[LiveUpdate] Checking for updates from self-hosted server...');

        const manifestUrl =
          'https://roovo-backend.fly.dev/v1/apps/94f0b6fd-9585-427d-839f-c09989a1ceaf/bundles/latest';

        const response = await fetch(manifestUrl);
        if (!response.ok) throw new Error(`Manifest fetch failed: ${response.status}`);
        const manifest = await response.json();

        const bundleId = manifest.bundleId || manifest.version;
        const bundleUrl = manifest.url;

        if (!bundleUrl) {
          throw new Error('Manifest does not contain a valid "url" field.');
        }

        console.log(`[LiveUpdate] Remote bundle: ${bundleId}, url: ${bundleUrl}`);

        const current = await LiveUpdate.getCurrentBundle();
        const currentId = current?.bundleId || 'none';
        console.log(`[LiveUpdate] Current bundle: ${currentId}`);

        if (currentId !== bundleId) {
          console.log(`[LiveUpdate] New bundle detected → downloading ${bundleId} ...`);


          await LiveUpdate.downloadBundle({
            url: bundleUrl,
            bundleId,
          });

          console.log('[LiveUpdate] Download complete.');
          console.log(bundleId);
          await LiveUpdate.setNextBundle({ bundleId });
          await LiveUpdate.ready();

          console.log('[LiveUpdate] Reloading app with new bundle...');
          // await LiveUpdate.reload();
        } else {
          console.log('[LiveUpdate] App is already up to date.');
          await LiveUpdate.ready();
        }
      } catch (error) {
        console.error('[LiveUpdate] Self-hosted update check failed:', error);
      }
    };

    checkForSelfHostedUpdate();
  }, []);

  // ✅ Configure Status Bar
  useEffect(() => {
    const configureStatusBar = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          await StatusBar.setStyle({ style: Style.Light });
          if (Capacitor.getPlatform() === 'android') {
            // Transparency handled via styles.xml + overlay
            await StatusBar.setOverlaysWebView({ overlay: true });
          }
        }
      } catch (e) {
        console.error('Failed to configure status bar:', e);
      }
    };

    configureStatusBar();
  }, []);

  const handleOpenLogin = (subtitle?: string) => {
    setLoginSubtitle(subtitle);
    setIsLoginOpen(true);
  };

  // ✅ Handle Android back button
  useEffect(() => {
    CapacitorApp.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
      if (pathname === '/hosting') {
        CapacitorApp.exitApp();
        return;
      }
      if (canGoBack) {
        back();
      } else {
        CapacitorApp.exitApp();
      }
    });
  }, [back, pathname]);

  // ✅ Persist current route for app restart
  useEffect(() => {
    if (pathname) {
      localStorage.setItem('last_route', pathname);
    }
  }, [pathname]);

  // ✅ Handle Deep Links (Invite Acceptance)
  useEffect(() => {
    CapacitorApp.addListener('appUrlOpen', async (data) => {
      // Example: roovo://invite/abcdef123 or https://roovo.in/invite/abcdef123
      console.log('Deep link opened:', data.url);
      const url = new URL(data.url);

      // Check for invite
      if (url.pathname.includes('/invite/')) {
        const parts = url.pathname.split('/invite/');
        const token = parts[1];
        if (token) {
          console.log('Invite token detected:', token);

          // Check auth
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user?.id) {
            // Logged in: Process invite immediately
            handleInviteProcessing(token, session.user.id);
          } else {
            // Not logged in: Store token and urge login
            localStorage.setItem('pending_invite_token', token);
            setIsLoginOpen(true);
            alert("Please log in to accept the co-host invitation.");
          }
        }
      }
    });
  }, []);

  const handleInviteProcessing = async (token: string, userId: string) => {
    try {
      const { acceptInvitationByCode } = await import('./services/api');
      alert('Processing invitation... ⏳');
      await acceptInvitationByCode(token, userId);
      alert('🎉 Invitation Accepted! You are now a co-host.');
      // Use existing logic to force refresh if not automatic
      window.location.reload();
    } catch (error: any) {
      console.error('Invite error:', error);
      alert(`Failed to accept invitation: ${error.message}`);
    }
  };

  // ✅ Process pending invite after login
  useEffect(() => {
    const checkPendingInvite = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const pendingToken = localStorage.getItem('pending_invite_token');
        if (pendingToken) {
          localStorage.removeItem('pending_invite_token');
          handleInviteProcessing(pendingToken, session.user.id);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        checkPendingInvite();
      }
    });

    // Also check on mount if already signed in
    checkPendingInvite();

    return () => {
      subscription.unsubscribe();
    }
  }, []);


  // ✅ Preload chats, profile data, and images
  useEffect(() => {
    const init = async () => {
      await Promise.all([preloadAllGuestChats()]);
      const imagesToPreload = [
        '/bengaluru.png',
        '/chennai.png',
        '/goa.png',
        '/logo.png',
        '/mumbai.png',
        '/pondicherry.png',
      ];
      imagesToPreload.forEach((image) => {
        new Image().src = image;
      });
    };
    init();
  }, []);

  // ✅ Fetch host and guest conversations
  useEffect(() => {
    const getConversations = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const { data: host } = await supabase
          .from('hosts')
          .select('id')
          .eq('user_id', session.user.id)
          .single();

        if (host) {
          try {
            const data = await fetchConversationsByHostId(host.id);
            if (Array.isArray(data)) {
              setHostConversations(
                data.sort(
                  (a, b) =>
                    new Date(b.last_message_at).getTime() -
                    new Date(a.last_message_at).getTime(),
                ),
              );
            }
          } catch (err) {
            console.error('Error fetching host conversations:', err);
          }
        }

        try {
          const data = await fetchConversationsByGuestId(session.user.id);
          if (Array.isArray(data)) {
            setGuestConversations(
              data.sort(
                (a, b) =>
                  new Date(b.last_message_at).getTime() -
                  new Date(a.last_message_at).getTime(),
              ),
            );
          }
        } catch (err) {
          console.error('Error fetching guest conversations:', err);
        }

        // Fetch Real-time Bookings
        try {
          const bookings = await fetchBookingsByGuestId(session.user.id);
          if (Array.isArray(bookings)) {
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            const confirmed = bookings
              .filter((b: any) => b.status === 'confirmed')
              .filter((b: any) => new Date(b.start_date) >= now)
              .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

            if (confirmed.length > 0) {
              setUpcomingBooking(confirmed[0]);
            } else {
              setUpcomingBooking(null);
            }
          }
        } catch (err) {
          console.error('Error fetching guest bookings:', err);
        }
      } else {
        setHostConversations([]);
        setGuestConversations([]);
        setUpcomingBooking(null);
      }
      setIsHostStatusResolved(true);
    };

    getConversations();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        getConversations();
        if (session?.user?.id && !isPushInitialized.current) {
          isPushInitialized.current = true;
          import('./services/PushNotificationService').then(({ initPushNotifications }) => {
            initPushNotifications(session.user.id);
          });
        }
      } else if (event === 'SIGNED_OUT') {
        setHostConversations([]);
        setGuestConversations([]);
        setUpcomingBooking(null);
        setIsHostStatusResolved(true);
      }
    });

    // Initial check for authentication state
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        getConversations();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Global Banner logic removed for now in favor of integrated Search UI
  useEffect(() => {
    const handleGlobalBannerEvent = (e: any) => {
      console.log('Global banner requested:', e.detail);
    };

    window.addEventListener('show-global-banner', handleGlobalBannerEvent);
    return () => window.removeEventListener('show-global-banner', handleGlobalBannerEvent);
  }, []);

  const handleSwitchToHost = () => {
    setAnimationDirection('host');
    setIsSwitchingToHost(true);
    import('./components/dashboard/HostDashboard');
    import('./components/Calendar');
    import('./components/dashboard/Messages');
    import('./components/dashboard/ManageListings');
  };

  const handleSwitchToTraveling = () => {
    setAnimationDirection('traveling');
    setIsSwitchingToHost(true);
  };

  if (isSwitchingToHost) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-white">
        {animationDirection === 'host' ? (
          <SwitchingToHostLoader
            to="host"
            onAnimationComplete={() => {
              setIsSwitchingToHost(false);
              navigate('/hosting');
            }}
            onTransitionStart={() => { }}
          />
        ) : (
          <SwitchingToTravelingLoader
            onAnimationComplete={() => {
              setIsSwitchingToHost(false);
              navigate('/');
            }}
            onTransitionStart={() => { }}
          />
        )}
      </div>
    );
  }

  if (showSplash) {
    return <SplashScreen onAnimationComplete={() => setShowSplash(false)} />;
  }

  return (
    <div className="w-screen h-dvh overflow-x-hidden">
      <Router>
        <Route
          path="/"
          render={() => (
            <HomeFeed
              onSwitchToHost={handleSwitchToHost}
              showBottomNavBar={showBottomNavBar}
              onLoadingChange={setIsHomeLoading}
              upcomingBooking={upcomingBooking}
            />
          )}
        />
        <Route path="/listing/:id" render={(props) => (
          <ListingDetailsPage
            {...props}
            onOpenChat={(conversation) => {
              setSelectedConversation(conversation);
              navigate('/messages');
            }}
            onOpenLogin={handleOpenLogin}
          />
        )} />
        <Route path="/search" render={() => <SearchPage />} />
        <Route path="/profile" render={() => <Profile />} />
        <Route path="/messages" render={() => (
          <Messages
            conversations={guestConversations}
            selectedConversation={selectedConversation}
            onConversationSelect={setSelectedConversation}
            userType="guest"
          />
        )} />
        <Route path="/verify-identity" render={() => <VerifyIdentity />} />
        <Route path="/hosting/verify" render={() => <VerifyIdentity />} />
        <Route path="/import-listing" render={() => <ImportListingPage />} />
        <Route path="/invite/cohost" render={() => <CohostInvitationPage />} />
        <Route path="/payment/status" render={() => <PaymentStatus />} />
        <Route path="/trips" render={() => (
          <TripsPage
            onOpenChat={(conversation) => {
              setSelectedConversation(conversation);
              navigate('/messages');
            }}
          />
        )} />
        <Route path="/past-trips" render={() => (
          <TripsPage
            onOpenChat={(conversation) => {
              setSelectedConversation(conversation);
              navigate('/messages');
            }}
          />
        )} />

        {/* Hosting Routes */}
        <Route
          path="/hosting"
          render={() => (
            <HostDashboard
              conversations={hostConversations}
              selectedConversation={selectedConversation}
              onConversationSelect={setSelectedConversation}
            />
          )}
        />
        <Route
          path="/hosting/calendar"
          render={() => (
            <HostDashboard
              conversations={hostConversations}
              selectedConversation={selectedConversation}
              onConversationSelect={setSelectedConversation}
            />
          )}
        />
        <Route
          path="/hosting/messages"
          render={() => (
            <HostDashboard
              conversations={hostConversations}
              selectedConversation={selectedConversation}
              onConversationSelect={setSelectedConversation}
            />
          )}
        />
        <Route
          path="/hosting/listings"
          render={() => (
            <HostDashboard
              conversations={hostConversations}
              selectedConversation={selectedConversation}
              onConversationSelect={setSelectedConversation}
            />
          )}
        />
        <Route
          path="/hosting/bookings"
          render={() => (
            <HostDashboard
              conversations={hostConversations}
              selectedConversation={selectedConversation}
              onConversationSelect={setSelectedConversation}
            />
          )}
        />
        <Route
          path="/hosting/payouts"
          render={() => (
            <HostDashboard
              conversations={hostConversations}
              selectedConversation={selectedConversation}
              onConversationSelect={setSelectedConversation}
            />
          )}
        />
        <Route
          path="/hosting/payout-methods"
          render={() => (
            <HostDashboard
              conversations={hostConversations}
              selectedConversation={selectedConversation}
              onConversationSelect={setSelectedConversation}
            />
          )}
        />

        {/* Legal Pages */}
        <Route path="/contact-us" render={() => <ContactUs />} />
        <Route path="/terms" render={() => <TermsAndConditions />} />
        <Route path="/refund-policy" render={() => <RefundsPolicy />} />
      </Router>

      <BottomNavBar
        show={showBottomNavBar}
        isChatOpen={!!selectedConversation}
        onSearchClick={() => setIsSearchOpen(true)}
        openLogin={() => handleOpenLogin()}
        onSwitchToHost={handleSwitchToHost}
        onSwitchToTraveling={handleSwitchToTraveling}
        onMessagesClick={() => setIsMessagesDrawerOpen(true)}
      />

      <MessagesDrawer
        isOpen={isMessagesDrawerOpen}
        onClose={() => setIsMessagesDrawerOpen(false)}
        guestConversations={guestConversations}
        hostConversations={hostConversations}
      />

      {isSearchOpen && <MobileSearchBar onClose={() => setIsSearchOpen(false)} />}
      {isLoginOpen && (
        <Login
          isOpen={isLoginOpen}
          subtitle={loginSubtitle}
          onClose={() => {
            setIsLoginOpen(false);
            setLoginSubtitle(undefined);
          }}
          onLoginSuccess={() => {
            setIsLoginOpen(false);
            setLoginSubtitle(undefined);
          }}
        />
      )}

      {/* Floating Pills - Only on Home */}
      {pathname === '/' && !isSearchOpen && !isSwitchingToHost && !selectedConversation && !isLoginOpen && !isHomeLoading && (
        <div className="fixed bottom-22 right-4 z-100">
          <HomeOptionsPills />
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <PreloadProvider>
      <BottomNavBarProvider>
        <AppContent />
        <NotificationToast />
      </BottomNavBarProvider>
    </PreloadProvider>
  );
}

export default App;
