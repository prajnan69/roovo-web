import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface NotificationData {
    title: string;
    body: string;
    data: {
        userType?: 'host' | 'guest';
        type?: string;
        [key: string]: any;
    };
}

export default function NotificationToast() {
    const [notification, setNotification] = useState<NotificationData | null>(null);

    useEffect(() => {
        const handleNotification = (event: Event) => {
            const customEvent = event as CustomEvent;
            const payload = customEvent.detail;
            setNotification({
                title: payload.title || payload.notification?.title || 'New Notification',
                body: payload.body || payload.notification?.body || '',
                data: payload.data || {},
            });

            // Auto dismiss after 5 seconds
            setTimeout(() => {
                setNotification(null);
            }, 5000);
        };

        window.addEventListener('in-app-notification', handleNotification);

        return () => {
            window.removeEventListener('in-app-notification', handleNotification);
        };
    }, []);

    if (!notification) return null;

    const isHost = notification.data.userType === 'host';
    const bgColor = isHost ? 'bg-slate-900' : 'bg-white';
    const textColor = isHost ? 'text-white' : 'text-slate-900';
    const borderColor = isHost ? 'border-slate-700' : 'border-slate-200';
    const accentColor = isHost ? 'bg-indigo-500' : 'bg-rose-500';

    return (
        <AnimatePresence>
            {notification && (
                <motion.div
                    initial={{ opacity: 0, y: -50, x: '-50%' }}
                    animate={{ opacity: 1, y: 0, x: '-50%' }}
                    exit={{ opacity: 0, y: -50, x: '-50%' }}
                    className={`fixed top-4 left-1/2 z-[9999] w-[90%] max-w-md rounded-lg shadow-lg border ${bgColor} ${borderColor} p-4 flex items-start gap-3`}
                >
                    <div className={`w-1 h-full absolute left-0 top-0 bottom-0 rounded-l-lg ${accentColor}`} />

                    <div className="flex-1">
                        <h4 className={`font-semibold text-sm ${textColor}`}>{notification.title}</h4>
                        <p className={`text-sm mt-1 ${isHost ? 'text-slate-300' : 'text-slate-600'}`}>
                            {notification.body}
                        </p>
                    </div>

                    <button
                        onClick={() => setNotification(null)}
                        className={`p-1 rounded-full hover:bg-black/5 ${isHost ? 'text-slate-400' : 'text-slate-500'}`}
                    >
                        <X size={16} />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
