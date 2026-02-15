import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { updateFcmToken } from './api';

export const initPushNotifications = async (userId: string) => {
    if (!Capacitor.isNativePlatform()) {
        console.log('Push notifications not supported on web');
        return;
    }

    try {
        const permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
            const newPermStatus = await PushNotifications.requestPermissions();
            if (newPermStatus.receive !== 'granted') {
                console.log('Push notification permission denied');
                return;
            }
        } else if (permStatus.receive !== 'granted') {
            console.log('Push notification permission denied');
            return;
        }

        await PushNotifications.register();

        // Listener for registration
        PushNotifications.addListener('registration', async (token) => {
            console.log('Push registration success, token: ' + token.value);
            const platform = Capacitor.getPlatform(); // 'ios' or 'android'
            try {
                await updateFcmToken(userId, token.value, platform);
                console.log('FCM token updated in backend');
            } catch (error) {
                console.error('Failed to update FCM token', error);
            }
        });

        PushNotifications.addListener('registrationError', (error) => {
            console.error('Push registration error: ', error);
        });

        // Listener for notification received (Foreground)
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Push notification received: ', notification);

            // Dispatch event for NotificationToast
            const event = new CustomEvent('in-app-notification', {
                detail: {
                    title: notification.title,
                    body: notification.body,
                    data: notification.data
                }
            });
            window.dispatchEvent(event);
        });

        // Listener for notification action (Background/Tap)
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            console.log('Push notification action performed', notification.actionId, notification.inputValue);
            const data = notification.notification.data;
            if (data && data.url) {
                // Use a global window dispatcher or router if available, 
                // or let the App component handle deep linking via another mechanism.
                // For now logging it. App's deep link handler should ideally pick this up if implemented,
                // or we can dispatch a navigation event.
                if (data.url.startsWith('/chat/')) {
                    window.location.href = data.url; // Simple fallback, but might reload app
                    // Better: dispatch a navigation event if using a router hooked to window
                }
            }
        });

    } catch (error) {
        console.error('Error initializing push notifications', error);
    }
};
