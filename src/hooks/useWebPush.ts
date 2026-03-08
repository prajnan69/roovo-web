import { useState, useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging, firebaseConfig } from '../lib/firebase';
import { updateFcmToken } from '../services/api';
import supabase from '../services/api';

export const useWebPush = () => {
    const [fcmToken, setFcmToken] = useState<string | null>(null);
    const [permission, setPermission] = useState<NotificationPermission>(
        typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
    );

    // To keep track of foreground messages
    const [latestMessage, setLatestMessage] = useState<any>(null);

    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

        const setupMessaging = async () => {
            try {
                const msg = await messaging();
                if (!msg) return; // Not supported or blocked

                // Wait for service worker
                const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

                // Send config to SW for background messages
                if (registration.active) {
                    registration.active.postMessage({
                        type: 'INIT_FIREBASE',
                        config: firebaseConfig
                    });
                }

                // Listen for foreground messages
                onMessage(msg, (payload) => {
                    console.log('[useWebPush] Received foreground message:', payload);
                    setLatestMessage(payload);

                    // Optionally show a toast or dispatch a global event here
                    const event = new CustomEvent('in-app-notification', {
                        detail: {
                            title: payload.notification?.title,
                            body: payload.notification?.body,
                            data: payload.data
                        }
                    });
                    window.dispatchEvent(event);
                });

            } catch (e) {
                console.error('Error setting up Firebase messaging', e);
            }
        };

        setupMessaging();
    }, []);

    const requestPermissionAndGetToken = async () => {
        try {
            if (!('Notification' in window)) throw new Error('Notifications not supported');

            const perm = await Notification.requestPermission();
            setPermission(perm);

            if (perm === 'granted') {
                const msg = await messaging();
                if (!msg) throw new Error('Firebase messaging not supported');

                const registration = await navigator.serviceWorker.ready;

                const token = await getToken(msg, {
                    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
                    serviceWorkerRegistration: registration
                });

                if (token) {
                    setFcmToken(token);
                    // Save token to backend for the logged-in user
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.user?.id) {
                        await updateFcmToken(session.user.id, token, 'web');
                        console.log('Web FCM token saved to backend.');
                    }
                    return token;
                } else {
                    console.error('No registration token available.');
                }
            }
        } catch (error) {
            console.error('An error occurred while retrieving token. ', error);
        }
        return null;
    };

    return {
        fcmToken,
        permission,
        requestPermissionAndGetToken,
        latestMessage
    };
};
