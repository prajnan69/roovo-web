import { useState, useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { LiveUpdate } from '@capawesome/capacitor-live-update';
import { StatusBar, Style } from '@capacitor/status-bar';
import { preloadAllGuestChats } from './services/chatService';
import { preloadProfileData } from './services/profileService';
import supabase, { fetchConversationsByHostId, fetchConversationsByGuestId } from './services/api';
import HomeFeed from './components/HomeFeed';
import ListingDetailsPage from './components/ListingDetailsPage';
import Profile from './components/Profile';
import HostDashboard from './components/dashboard/HostDashboard';
import Messages from './components/dashboard/Messages';
import Verify from './components/Verify';
import Router from './components/Router';
import Route from './components/Route';
import BottomNavBar from './components/BottomNavBar';
import MobileSearchBar from './components/MobileSearchBar';
import SearchPage from './components/SearchPage';
import Login from './components/Login';
import { useNavigation } from './hooks/useNavigation';
import { PreloadProvider } from './context/PreloadContext';
import { BottomNavBarProvider, useBottomNavBar } from './context/BottomNavBarContext';
import SwitchingToHostLoader from './components/SwitchingToHostLoader';
import SwitchingToTravelingLoader from './components/SwitchingToTravelingLoader';
import './index.css';

function AppContent() {
  const { isNavBarVisible } = useBottomNavBar();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSwitchingToHost, setIsSwitchingToHost] = useState(false);
  const [isHostStatusResolved, setIsHostStatusResolved] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'host' | 'traveling'>('host');
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [hostConversations, setHostConversations] = useState<any[]>([]);
  const [guestConversations, setGuestConversations] = useState<any[]>([]);
  const { pathname, back, navigate } = useNavigation();

  const showBottomNavBar =
    !pathname.startsWith('/listing/') && !isSwitchingToHost && !selectedConversation && !isSearchOpen && isNavBarVisible && isHostStatusResolved;

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

          await LiveUpdate.setNextBundle({ bundleId });
          await LiveUpdate.ready();

          console.log('[LiveUpdate] Reloading app with new bundle...');
          await LiveUpdate.reload();
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
            await StatusBar.setBackgroundColor({ color: '#FFFFFF' });
          }
        }
      } catch (e) {
        console.error('Failed to configure status bar:', e);
      }
    };
    configureStatusBar();
  }, []);

  // ✅ Handle Android back button
  useEffect(() => {
    CapacitorApp.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
      if (canGoBack) {
        back();
      } else {
        CapacitorApp.exitApp();
      }
    });
  }, [back]);

  // ✅ Preload chats, profile data, and images
  useEffect(() => {
    const init = async () => {
      await Promise.all([preloadAllGuestChats(), preloadProfileData()]);
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
      }
      setIsHostStatusResolved(true);
    };
    getConversations();
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
    <div className="w-screen h-screen overflow-x-hidden">
      <Router>
        <Route
          path="/"
          render={() => (
            <HomeFeed onSwitchToHost={handleSwitchToHost} showBottomNavBar={showBottomNavBar} />
          )}
        />
        <Route path="/listing/:id" render={(props) => <ListingDetailsPage {...props} />} />
        <Route path="/search" render={() => <SearchPage />} />
        <Route path="/messages" render={() => <Messages conversations={guestConversations} selectedConversation={selectedConversation} onConversationSelect={setSelectedConversation} userType="guest" />} />
        <Route path="/profile" render={() => <Profile />} />
        <Route path="/verify-identity" render={() => <Verify />} />
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
      </Router>

      <BottomNavBar
        show={showBottomNavBar}
        isChatOpen={!!selectedConversation}
        onSearchClick={() => setIsSearchOpen(true)}
        openLogin={() => setIsLoginOpen(true)}
        onSwitchToHost={handleSwitchToHost}
        onSwitchToTraveling={handleSwitchToTraveling}
      />
      {isSearchOpen && <MobileSearchBar onClose={() => setIsSearchOpen(false)} />}
      {isLoginOpen && (
        <Login
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          onLoginSuccess={() => setIsLoginOpen(false)}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <PreloadProvider>
      <BottomNavBarProvider>
        <AppContent />
      </BottomNavBarProvider>
    </PreloadProvider>
  );
}

export default App;
