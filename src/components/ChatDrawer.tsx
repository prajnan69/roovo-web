import React, { useState, useEffect } from 'react';
import { Drawer } from 'vaul';
import { motion, type PanInfo } from 'framer-motion';
import { X, Send, CheckCircle } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import { Spinner } from '@/components/ui/shadcn-io/spinner';

interface ChatDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    listingId: string;
    listingTitle: string;
    hostName: string;
    userId: string;
    userName: string;
    userPhone: string;
    isBooking?: boolean;
}

const ChatDrawer: React.FC<ChatDrawerProps> = ({
    isOpen,
    onClose,
    listingId,
    listingTitle,
    hostName,
    userId,
    userName,
    userPhone,
    isBooking = false,
}) => {
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            // Reset state when drawer closes
            setTimeout(() => {
                setMessage('');
                setIsSubmitted(false);
                setErrorMessage(null);
            }, 300);
        }
    }, [isOpen]);

    // Auto-close on success
    useEffect(() => {
        if (isSubmitted) {
            const timer = setTimeout(() => {
                onClose();
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [isSubmitted, onClose]);

    const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (info.offset.y > 100) {
            onClose();
        }
    };

    const handleSubmit = async () => {
        if (!message.trim()) {
            setErrorMessage('Please enter a message');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            // Create conversation
            const conversationResponse = await fetch(
                `${import.meta.env.VITE_API_BASE_URL}/api/chat/conversations`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        listing_id: listingId,
                        guest_id: userId,
                        message: message.trim(),
                    }),
                }
            );

            if (!conversationResponse.ok) {
                throw new Error('Failed to send message');
            }

            setIsSubmitted(true);
            triggerHaptic();
        } catch (error) {
            console.error('Error sending message:', error);
            setErrorMessage('Failed to send message. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Drawer.Root open={isOpen} onOpenChange={onClose}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[100]" />
                <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[101] bg-white rounded-t-3xl shadow-2xl outline-none">
                    <motion.div
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={0.2}
                        onDragEnd={handleDragEnd}
                        className="w-full"
                    >
                        {/* Drag Handle */}
                        <div className="w-full flex justify-center pt-3 pb-2">
                            <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 pb-4 border-b border-slate-100">
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-slate-900">Message {hostName}</h2>
                                <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{listingTitle}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-600" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
                            {!isSubmitted ? (
                                <div className="space-y-4">
                                    {/* Message Input */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Your Message
                                        </label>
                                        <textarea
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder={isBooking ? "Hi! I have a question regarding my booking..." : "Hi! I'm interested in this property. Is it available for..."}
                                            className="w-full h-32 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-0 outline-none resize-none text-slate-900 placeholder:text-slate-400"
                                            disabled={isSubmitting}
                                        />
                                    </div>

                                    {/* Helper Text */}
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                                        <p className="text-xs text-indigo-700">
                                            💡 <strong>Tip:</strong> {isBooking ? "Ask about check-in details, house rules, or parking." : "Ask about availability, amenities, or any specific requirements you have."}
                                        </p>
                                    </div>

                                    {/* Error Message */}
                                    {errorMessage && (
                                        <div className="text-red-500 text-xs font-medium text-center bg-red-50 p-2 rounded-lg">
                                            {errorMessage}
                                        </div>
                                    )}

                                    {/* Submit Button */}
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting || !message.trim()}
                                        className="w-full h-14 bg-indigo-600 active:bg-indigo-800 disabled:bg-slate-300 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 transition-all active:scale-[0.98]"
                                    >
                                        {isSubmitting ? (
                                            <Spinner size={24} className="text-white" />
                                        ) : (
                                            <>
                                                <Send size={18} />
                                                Send Message
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                /* Success State */
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center justify-center py-8 text-center space-y-4"
                                >
                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2 shadow-sm">
                                        <CheckCircle size={40} strokeWidth={2.5} />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800">Message Sent!</h3>
                                    <div className="text-slate-500 max-w-xs mx-auto text-sm space-y-2">
                                        <p>
                                            Your message has been sent to <strong>{hostName}</strong>.
                                        </p>
                                        <p className="text-slate-400 text-xs">
                                            You'll receive a notification when they respond. Check your messages tab to continue the conversation.
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Extra padding for safe area on mobile */}
                        <div className="h-6" />
                    </motion.div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
};

export default ChatDrawer;
