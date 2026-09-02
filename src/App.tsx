import { useState, useEffect, useRef, useCallback } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { LiveUpdate } from '@capawesome/capacitor-live-update';
import { StatusBar, Style } from '@capacitor/status-bar';
import { preloadAllGuestChats } from './services/chatService';
import supabase, { fetchConversationsByHostId, fetchConversationsByGuestId, fetchBookingsByGuestId, API_BASE_URL } from './services/api';
import HomeFeed from './components/HomeFeed';
import ListingDetailsPage from './components/ListingDetailsPage';
import Profile from './components/Profile';
import HostDashboard from './components/dashboard/HostDashboard';
import Notifications from './components/Notifications';
import GlobalPreferences from './components/profile/GlobalPreferences';
import Messages from './components/dashboard/Messages';
import VerifyIdentity from './components/VerifyIdentity';
import Router from './components/Router';
import Route from './components/Route';
import BottomNavBar from './components/BottomNavBar';
import MobileSearchBar from './components/MobileSearchBar';
import SearchPage from './components/SearchPage';
import Login from './components/Login';
import { useNavigation } from './hooks/useNavigation';
import { closeTopmostOverlay } from './hooks/useBackCloseable';
import { PreloadProvider } from './context/PreloadContext';
import { BottomNavBarProvider, useBottomNavBar } from './context/BottomNavBarContext';
import SwitchingToHostLoader from './components/SwitchingToHostLoader';
import SwitchingToTravelingLoader from './components/SwitchingToTravelingLoader';
import SplashScreen from './components/SplashScreen';
import { AnimatePresence } from 'framer-motion';
import './index.css';
import NotificationToast from './components/NotificationToast';
import PaymentStatus from './components/PaymentStatus';
import { useWebPush } from './hooks/useWebPush';
import NotificationPromptDrawer from './components/NotificationPromptDrawer';
import PaymentLinkPage from './components/PaymentLinkPage';
import CheckInPage from './components/checkin/CheckInPage';

import ImportListingPage from './components/import/ImportListingPage';
import CohostInvitationPage from './components/invitation/CohostInvitationPage';
import HomeOptionsPills from './components/HomeOptionsPills';
import ContactUs from './components/legal/ContactUs';
import TermsAndConditions from './components/legal/TermsAndConditions';
import RefundsPolicy from './components/legal/RefundsPolicy';
import PrivacyPolicy from './components/legal/PrivacyPolicy';
import TripsPage from './components/TripsPage';
import SplitPayPage from './components/SplitPayPage';
import AboutUs from './components/legal/AboutUs';
import Catalogue from './components/legal/Catalogue';
import BookingFlow from './components/legal/BookingFlow';

// getConversations re-runs on every auth event and realtime change. Fresh
// object identities for data that hasn't actually changed re-render the whole
// app tree (HomeFeed, Messages, HostDashboard all take these as props), so
// keep the previous state object when the refetched payload is identical.
const keepIfUnchanged = <T,>(next: T) => (prev: T): T =>
  JSON.stringify(prev) === JSON.stringify(next) ? prev : next;

function AppContent() {
  const { isNavBarVisible } = useBottomNavBar();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginSubtitle, setLoginSubtitle] = useState<string | undefined>(undefined);
  const [loginAsDrawer, setLoginAsDrawer] = useState(false);
  const [isSwitchingToHost, setIsSwitchingToHost] = useState(false);
  const [isHostStatusResolved, setIsHostStatusResolved] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'host' | 'traveling'>('host');
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [hostConversations, setHostConversations] = useState<any[]>([]);
  const [guestConversations, setGuestConversations] = useState<any[]>([]);
  const [isUserHost, setIsUserHost] = useState(false);
  const [upcomingBooking, setUpcomingBooking] = useState<any>(null);
  const [pendingSplit, setPendingSplit] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentHostId, setCurrentHostId] = useState<string | null>(null);
  const isNative = Capacitor.isNativePlatform() && !window.location.pathname.startsWith('/payment/status');
  let isPostUpdate = false;
  try {
    isPostUpdate = localStorage.getItem('_ota_reload') === '1';
  } catch (e) {
    console.warn("localStorage.getItem('_ota_reload') failed:", e);
  }
  const [showSplash, setShowSplash] = useState(isNative && !isPostUpdate);
  const [splashAnimDone, setSplashAnimDone] = useState(!isNative || isPostUpdate);
  const [otaDone, setOtaDone] = useState(!isNative || isPostUpdate);
  const [otaState, setOtaState] = useState<'idle' | 'downloading' | 'updated'>('idle');
  const [isHomeLoading, setIsHomeLoading] = useState(true);

  // Remove the flag once — do NOT do this on the render path or it can run multiple times
  useEffect(() => {
    // React is painting now — tear down the static boot screen from index.html
    document.getElementById('boot-splash')?.remove();
    if (isPostUpdate) {
      try {
        localStorage.removeItem('_ota_reload');
      } catch (e) {
        console.warn("localStorage.removeItem('_ota_reload') failed:", e);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { pathname, back, navigate } = useNavigation();
  const isPushInitialized = useRef(false);

  const { requestPermissionAndGetToken } = useWebPush();
  const [isWebPushPromptOpen, setIsWebPushPromptOpen] = useState(false);
  const [isWebPushPromptLoading, setIsWebPushPromptLoading] = useState(false);

  const showBottomNavBar =
    !pathname.startsWith('/listing/') &&
    !pathname.startsWith('/search') &&
    !pathname.startsWith('/import-listing') &&
    !pathname.startsWith('/verify-identity') &&
    !pathname.startsWith('/verify-identity') &&
    !pathname.startsWith('/hosting/verify') &&
    !pathname.startsWith('/hosting/payout-methods') &&
    !pathname.startsWith('/pay-link/') &&
    !pathname.startsWith('/check-in/') &&
    !isSwitchingToHost &&
    !selectedConversation &&
    !isSearchOpen &&
    isNavBarVisible &&
    isHostStatusResolved;

  // Close search modal when navigating (e.g. to search results)
  useEffect(() => {
    setIsSearchOpen(false);
  }, [pathname]);

  // Hide splash only when both animation and OTA check are done
  useEffect(() => {
    if (splashAnimDone && otaDone) setShowSplash(false);
  }, [splashAnimDone, otaDone]);

  // OTA check runs during splash — reload if update found, otherwise signal done
  useEffect(() => {
    const checkForUpdate = async () => {
      let willReload = false;
      try {
        if (!Capacitor.isNativePlatform()) return;
        if (!Capacitor.isPluginAvailable('LiveUpdate')) return;

        // Mark the running bundle stable IMMEDIATELY — before any network I/O.
        // The plugin auto-rolls back readyTimeout (10s) after launch if ready()
        // hasn't been called. It used to wait on the manifest fetch below, so a
        // slow response (cold fly machine) let the timer expire and the plugin
        // reloaded the WebView mid-session — seen as a long white-screen gap.
        await LiveUpdate.ready();

        if (isPostUpdate) {
          console.log('[LiveUpdate] Post-update boot — bundle marked ready.');
          return;
        }

        const manifestUrl = 'https://roovo-backend.fly.dev/v1/apps/94f0b6fd-9585-427d-839f-c09989a1ceaf/bundles/latest';
        // Abort if the backend is slow (cold start) — a missed update check is
        // better than a stuck splash; the next launch will catch the update.
        const manifestAbort = new AbortController();
        const manifestTimer = setTimeout(() => manifestAbort.abort(), 6000);
        let response: Response;
        try {
          response = await fetch(manifestUrl, { signal: manifestAbort.signal });
        } finally {
          clearTimeout(manifestTimer);
        }
        if (!response.ok) throw new Error(`Manifest fetch failed: ${response.status}`);
        const manifest = await response.json();

        const bundleId = manifest.bundleId || manifest.version;
        const bundleUrl = manifest.url;
        if (!bundleUrl) throw new Error('No bundle url in manifest');

        const current = await LiveUpdate.getCurrentBundle();
        const currentId = current?.bundleId || 'none';

        if (currentId !== bundleId) {
          console.log(`[LiveUpdate] Downloading ${bundleId} during splash...`);
          setOtaState('downloading');
          try {
            await LiveUpdate.downloadBundle({ url: bundleUrl, bundleId });
          } catch (dlErr: any) {
            if (!dlErr?.message?.includes('bundle already exists')) throw dlErr;
          }
          await LiveUpdate.setNextBundle({ bundleId });
          setOtaState('updated');
          try {
            localStorage.setItem('_ota_reload', '1');
          } catch (e) {
            console.warn("localStorage.setItem('_ota_reload') failed:", e);
          }
          await new Promise(r => setTimeout(r, 1200));
          console.log('[LiveUpdate] Reloading with new bundle...');
          willReload = true;
          await LiveUpdate.reload();
          // Freeze — WebView will restart and this code is dead
          await new Promise(() => {});
        }
        // Already on the latest bundle — ready() was called up front.
      } catch (error) {
        console.error('[LiveUpdate] Update check failed:', error);
      } finally {
        // Don't unblock splash if reload is in flight — WebView restart handles it
        if (!willReload) setOtaDone(true);
      }
    };

    checkForUpdate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleOpenLogin = (subtitle?: string, asDrawer: boolean = false) => {
    setLoginSubtitle(subtitle);
    setLoginAsDrawer(asDrawer);
    setIsLoginOpen(true);
  };

  // Handle ?login=1 redirect from split payment share links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('login') === '1') {
      handleOpenLogin('Login to pay your share');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // After login, redirect back to stored split URL if any
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        const returnUrl = sessionStorage.getItem('split_return_url');
        if (returnUrl) {
          sessionStorage.removeItem('split_return_url');
          window.location.href = returnUrl;
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ✅ Handle Android back button — must register exactly once. This effect
  // used to re-run on every render (no cleanup, unstable deps), stacking
  // listeners so a single back press fired history.back() many times and
  // jumped straight to the homepage instead of the previous page.
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  useEffect(() => {
    const handle = CapacitorApp.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
      // An open overlay (drawer, login, search) consumes the back press and
      // closes itself instead of navigating.
      if (closeTopmostOverlay()) return;
      if (pathnameRef.current === '/hosting') {
        CapacitorApp.exitApp();
        return;
      }
      if (canGoBack) {
        const pathBeforeBack = window.location.pathname;
        window.history.back();
        // Safety net: some Android WebView configurations silently no-op
        // history.back() when the only prior entry is a client-side
        // pushState (not a real page load), leaving the user stuck on the
        // page they tried to leave via the hardware back button.
        setTimeout(() => {
          if (window.location.pathname === pathBeforeBack) {
            window.history.pushState({}, '', '/');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        }, 400);
      } else if (pathnameRef.current !== '/') {
        // canGoBack is false when the app was opened straight into this page
        // with no prior history — a shared listing link, a push notification,
        // a deep link. That has nothing to do with whether the app itself
        // should exit; it only means there's no page to pop back to. Land on
        // home instead of quitting the app out from under the user.
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else {
        CapacitorApp.exitApp();
      }
    });
    return () => { handle.then(h => h.remove()); };
  }, []);

  // ✅ Persist current route for app restart
  useEffect(() => {
    if (pathname) {
      try {
        localStorage.setItem('last_route', pathname);
      } catch (e) {
        console.warn("localStorage.setItem('last_route') failed:", e);
      }
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
            try {
              localStorage.setItem('pending_invite_token', token);
            } catch (e) {
              console.warn("localStorage.setItem('pending_invite_token') failed:", e);
            }
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
      let session = null;
      try {
        const { data } = await supabase.auth.getSession();
        session = data?.session;
      } catch (e) {
        console.warn("checkPendingInvite: getSession failed:", e);
      }
      if (session?.user?.id) {
        let pendingToken = null;
        try {
          pendingToken = localStorage.getItem('pending_invite_token');
        } catch (e) {}
        if (pendingToken) {
          try {
            localStorage.removeItem('pending_invite_token');
          } catch (e) {}
          handleInviteProcessing(pendingToken, session.user.id);
        }
      }
    };

    let subscription: any = null;
    try {
      const { data } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN') {
          checkPendingInvite();
        }
      });
      subscription = data.subscription;
    } catch (err) {
      console.warn("Failed to subscribe to auth state change in pending invite:", err);
    }

    // Also check on mount if already signed in
    checkPendingInvite();

    return () => {
      if (subscription) subscription.unsubscribe();
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
        '/icons/globe_t.png',
        '/icons/man_t.png',
        '/icons/man_h.png',
      ];
      imagesToPreload.forEach((image) => {
        new Image().src = image;
      });
    };
    init();
  }, []);

  const getConversations = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      const { data: host } = await supabase
        .from('hosts')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      setIsUserHost(!!host);
      setCurrentUser(session.user);
      setCurrentHostId(host?.id || null);

      if (host) {
        try {
          const data = await fetchConversationsByHostId(host.id);
          if (Array.isArray(data)) {
            setHostConversations(
              keepIfUnchanged(
                data.sort(
                  (a, b) =>
                    new Date(b.last_message_at).getTime() -
                    new Date(a.last_message_at).getTime(),
                ),
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
            keepIfUnchanged(
              data.sort(
                (a, b) =>
                  new Date(b.last_message_at).getTime() -
                  new Date(a.last_message_at).getTime(),
              ),
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

          setUpcomingBooking(keepIfUnchanged(confirmed.length > 0 ? confirmed[0] : null));
        }
      } catch (err) {
        console.error('Error fetching guest bookings:', err);
      }

      // Fetch Pending Split Payments
      try {
        let phone = session.user?.phone || session.user?.user_metadata?.phone || '';

        // Fallback: Fetch from public.users if not in session
        if (!phone) {
          console.log('App.tsx - Phone missing from session, fetching from public.users...');
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('phone')
            .eq('id', session.user.id)
            .single();

          if (!userError && userData?.phone) {
            phone = userData.phone;
            console.log('App.tsx - Phone retrieved from public.users:', phone);
          }
        }

        console.log('App.tsx - Final Phone for Split Fetch:', phone);
        if (phone) {
          const encodedPhone = encodeURIComponent(phone);
          const res = await fetch(`${API_BASE_URL}/api/payment-splits/pending/${encodedPhone}`);
          console.log('App.tsx - Split Fetch Result Status:', res.status);
          if (res.ok) {
            const splits = await res.json();
            setPendingSplit(keepIfUnchanged(splits && splits.length > 0 ? splits[0] : null));
          }
        } else {
          console.warn('App.tsx - Still no phone number found for split check');
        }
      } catch (err) {
        console.error('App.tsx - Split fetch error:', err);
      }
    } else {
      setCurrentUser(null);
      setCurrentHostId(null);
      setHostConversations([]);
      setGuestConversations([]);
      setIsUserHost(false);
      setUpcomingBooking(null);
      setPendingSplit(null);
    }
    setIsHostStatusResolved(true);
  }, []);

  // Open a conversation deep-linked from a push-notification tap
  // (?conversation=<id> set by PushNotificationService).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const convId = params.get('conversation');
    if (!convId) return;
    const inGuest = guestConversations.find((c: any) => String(c.id) === convId);
    const inHost = hostConversations.find((c: any) => String(c.id) === convId);
    if (!inGuest && !inHost) return;
    setSelectedConversation(inGuest || { ...inHost, __context: 'host' });
    window.history.replaceState({}, '', '/messages');
    if (pathname !== '/messages') navigate('/messages');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestConversations, hostConversations]);

  // ✅ Global Subscription for Conversations
  useEffect(() => {
    if (!currentUser) return;

    let channel: any;
    let refetchTimer: ReturnType<typeof setTimeout> | undefined;

    const setupSubscription = () => {
      let subChannel = supabase.channel(`conversations_user_${currentUser.id}`);

      subChannel = subChannel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `guest_id=eq.${currentUser.id}`,
        },
        () => {
          clearTimeout(refetchTimer);
          refetchTimer = setTimeout(() => {
            console.log('Guest conversation change detected, refetching...');
            getConversations();
          }, 1000);
        }
      );

      if (currentHostId) {
        subChannel = subChannel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversations',
            filter: `host_id=eq.${currentHostId}`,
          },
          () => {
            clearTimeout(refetchTimer);
            refetchTimer = setTimeout(() => {
              console.log('Host conversation change detected, refetching...');
              getConversations();
            }, 1000);
          }
        );
      }

      channel = subChannel.subscribe();
    };

    setupSubscription();

    return () => {
      clearTimeout(refetchTimer);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [currentUser, currentHostId, getConversations]);

  useEffect(() => {
    // Don't call getConversations() directly here — Supabase always fires
    // INITIAL_SESSION immediately via onAuthStateChange, which calls it.
    // Calling it here too causes every fetch to run twice on every page load.

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        getConversations();
        if (session?.user?.id && !isPushInitialized.current) {
          isPushInitialized.current = true;
          if (Capacitor.isNativePlatform()) {
            import('./services/PushNotificationService').then(({ initPushNotifications }) => {
              initPushNotifications(session.user.id);
            });
          } else {
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
              setIsWebPushPromptOpen(true);
            }
          }
        }
      } else if (event === 'SIGNED_OUT') {
        getConversations(); // This will clear state now
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [getConversations]);

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

  return (
    <div className="w-screen h-dvh overflow-hidden relative">
      <AnimatePresence>
        {showSplash && (
          <SplashScreen onAnimationComplete={() => setSplashAnimDone(true)} otaState={otaState} otaDone={otaDone} />
        )}
      </AnimatePresence>

      <Router>
        <Route
          path="/"
          render={() => (
            <HomeFeed
              onSwitchToHost={handleSwitchToHost}
              showBottomNavBar={showBottomNavBar}
              onLoadingChange={setIsHomeLoading}
              upcomingBooking={upcomingBooking}
              pendingSplit={pendingSplit}
            />
          )}
        />
        <Route path="/listing/:id" render={(props) => (
          <ListingDetailsPage
            {...props}
            onOpenChat={(conversation) => {
              setSelectedConversation({ ...conversation, __fromExternal: true });
              navigate('/messages');
            }}
            onOpenLogin={handleOpenLogin}
          />
        )} />
        <Route path="/pay-link/:id" render={(props) => (
          <PaymentLinkPage
            {...props}
            onOpenLogin={handleOpenLogin}
          />
        )} />
        <Route path="/check-in/:id" render={(props) => (
          <CheckInPage
            {...props}
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
            hostConversations={hostConversations}
            isHost={isUserHost}
          />
        )} />
        <Route path="/verify-identity" render={() => <VerifyIdentity />} />
        <Route path="/hosting/verify" render={() => <VerifyIdentity />} />
        <Route path="/import-listing" render={() => <ImportListingPage />} />
        <Route path="/invite/cohost" render={() => <CohostInvitationPage />} />
        <Route path="/payment/status" render={() => <PaymentStatus />} />
        <Route path="/split/pay" render={() => <SplitPayPage />} />
        <Route path="/notifications" render={() => <Notifications />} />
        <Route path="/preferences" render={() => <GlobalPreferences />} />
        <Route path="/trips" render={() => (
          <TripsPage
            onOpenChat={(conversation) => {
              setSelectedConversation({ ...conversation, __fromExternal: true });
              navigate('/messages');
            }}
          />
        )} />
        <Route path="/past-trips" render={() => (
          <TripsPage
            onOpenChat={(conversation) => {
              setSelectedConversation({ ...conversation, __fromExternal: true });
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
        <Route path="/privacy-policy" render={() => <PrivacyPolicy />} />
        <Route path="/about-us" render={() => <AboutUs />} />
        <Route path="/catalogue" render={() => <Catalogue />} />
        <Route path="/booking-flow" render={() => <BookingFlow />} />
      </Router>

      {/* Calculate total unread messages */}
      {(() => {
        const guestUnread = guestConversations?.reduce((acc: number, convo: any) => acc + (convo.unread_count || 0), 0) || 0;
        const hostUnread = hostConversations?.reduce((acc: number, convo: any) => acc + (convo.unread_count || 0), 0) || 0;
        const totalUnread = guestUnread + hostUnread;

        return (
          <BottomNavBar
            show={showBottomNavBar}
            isChatOpen={!!selectedConversation}
            onSearchClick={() => setIsSearchOpen(true)}
            openLogin={() => handleOpenLogin()}
            onSwitchToHost={handleSwitchToHost}
            onSwitchToTraveling={handleSwitchToTraveling}
            unreadCount={totalUnread}
            onMessagesClick={() => {
              setSelectedConversation(null);
              navigate('/messages');
            }}
          />
        );
      })()}

      {isSearchOpen && <MobileSearchBar onClose={() => setIsSearchOpen(false)} />}
      {isLoginOpen && (
        <Login
          isOpen={isLoginOpen}
          subtitle={loginSubtitle}
          isDrawer={loginAsDrawer}
          onClose={() => {
            setIsLoginOpen(false);
            setLoginSubtitle(undefined);
            setLoginAsDrawer(false);
          }}
          onLoginSuccess={() => {
            setIsLoginOpen(false);
            setLoginSubtitle(undefined);
            setLoginAsDrawer(false);
          }}
        />
      )}

      {/* Floating Pills - Only on Home */}
      {pathname === '/' && !isSearchOpen && !isSwitchingToHost && !selectedConversation && !isLoginOpen && !isHomeLoading && (
        <div className="fixed bottom-22 right-4 z-100">
          <HomeOptionsPills />
        </div>
      )}

      <NotificationPromptDrawer
        isOpen={isWebPushPromptOpen}
        onClose={() => setIsWebPushPromptOpen(false)}
        isLoading={isWebPushPromptLoading}
        onEnable={async () => {
          setIsWebPushPromptLoading(true);
          await requestPermissionAndGetToken();
          setIsWebPushPromptLoading(false);
          setIsWebPushPromptOpen(false);
        }}
      />

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
