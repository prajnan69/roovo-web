import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import { Contacts } from '@capacitor-community/contacts';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/services/api';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
    DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import Toast from '@/components/ui/toast'; // Import standard Toast
import { triggerHaptic, triggerErrorHaptic } from "@/lib/haptics";

interface InviteCohostDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    listing: {
        id: string;
        title: string;
        images_data?: any[];
    };
    onInviteSent: () => void;
}

// Simplified: Only 'full_access' is supported now
type PermissionLevel = 'full_access';

interface ContactToInvite {
    id: string;
    name: string;
    phoneNumber: string;
    permission: PermissionLevel;
}

// --- Wax Seal Component ---
const WaxSeal = () => (
    <div className="relative w-14 h-14 flex items-center justify-center filter drop-shadow-lg">
        <img
            src="/Roovo-seel.png"
            alt="Roovo Seal"
            className="w-full h-full object-contain"
        />
    </div>
);

// --- Envelope Animation Component ---
const EnvelopeHeader = ({ title, isSending }: { title: string, isSending: boolean }) => {
    return (
        <div className="flex justify-center items-end h-24 mb-1 overflow-visible relative">
            <motion.div
                className="relative w-40 h-24"
                initial={{ y: 0, opacity: 1 }}
                animate={isSending ? { y: -100, opacity: 0 } : { y: 0, opacity: 1 }}
                transition={{ delay: 1.5, duration: 0.5, ease: "easeIn" }} // Fly away after sealing
            >
                {/* 1. Envelope Back */}
                <svg viewBox="0 0 200 120" className="absolute inset-0 w-full h-full z-0">
                    <defs>
                        <linearGradient id="backGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#E7E5E4" />
                            <stop offset="100%" stopColor="#F5F5F4" />
                        </linearGradient>
                    </defs>
                    <rect x="0" y="0" width="200" height="120" fill="url(#backGradient)" rx="4" />
                </svg>

                {/* 2. Letter - Statiically Inside */}
                <div className="absolute left-4 right-4 h-20 bg-white border border-slate-100 shadow-sm p-3 flex flex-col items-center justify-center text-center z-10 rounded-sm top-[15px] transform scale-95">
                    <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-100 mb-1 flex items-center justify-center text-[10px] text-slate-300">R</div>
                    <p className="text-[8px] uppercase tracking-wider text-slate-400 mb-0.5">Invitation</p>
                    <p className="text-[10px] font-bold text-slate-800 line-clamp-1 w-full leading-tight">{title}</p>
                </div>

                {/* 3. Envelope Front Pocket */}
                <svg viewBox="0 0 200 120" className="absolute inset-0 w-full h-full z-20 pointer-events-none drop-shadow-md">
                    <defs>
                        <linearGradient id="pocketGradient" x1="0" y1="1" x2="0" y2="0">
                            <stop offset="0%" stopColor="#FAFAF9" />
                            <stop offset="100%" stopColor="#F5F5F4" />
                        </linearGradient>
                    </defs>
                    <path
                        d="M0 120 L0 0 L100 70 L200 0 L200 120 Z"
                        fill="url(#pocketGradient)"
                        stroke="#E7E5E4"
                        strokeWidth="0.5"
                    />
                    <path d="M0 0 L100 70 L200 0" fill="none" stroke="white" strokeWidth="1" opacity="0.5" />
                </svg>

                {/* 4. Flap - Controls Closing */}
                <motion.div
                    className="absolute top-0 left-0 right-0 h-[75px] z-30 origin-top"
                    initial={{ rotateX: 180 }} // Start Open
                    animate={{ rotateX: isSending ? 0 : 180 }} // Close on send
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    style={{ transformStyle: "preserve-3d" }}
                >
                    <svg viewBox="0 0 200 75" className="w-full h-full drop-shadow-sm" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="flapGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#FAFAF9" />
                                <stop offset="100%" stopColor="#F5F5F4" />
                            </linearGradient>
                        </defs>
                        <path
                            d="M0 0 L100 75 L200 0 Z"
                            fill="url(#flapGradient)"
                            stroke="#E7E5E4"
                            strokeWidth="0.5"
                        />
                        <path d="M0 0 L100 75 L200 0" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
                    </svg>

                    {/* Seal - Appears after flap closes */}
                    <motion.div
                        className="absolute bottom-[-16px] left-1/2 -translate-x-1/2"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={isSending ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                        transition={{ delay: 0.6, type: "spring", stiffness: 300, damping: 20 }}
                    >
                        <WaxSeal />
                    </motion.div>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default function InviteCohostDrawer({ isOpen, onClose, listing, onInviteSent }: InviteCohostDrawerProps) {
    const [contacts, setContacts] = useState<ContactToInvite[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false); // Track sending animation state
    const [isSentSuccess, setIsSentSuccess] = useState(false); // Track success state
    const [currentUserPhone, setCurrentUserPhone] = useState<string | null>(null);

    // Standard Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setContacts([]);
            setIsSending(false);
            setIsSentSuccess(false);
            fetchCurrentUserPhone();
        }
    }, [isOpen]);

    const fetchCurrentUserPhone = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
            const { data } = await supabase.from('users').select('phone').eq('id', session.user.id).single();
            if (data?.phone) {
                setCurrentUserPhone(data.phone.replace(/\D/g, ''));
            }
        }
    };

    const showToast = (title: string, message: string, isError = false) => {
        // Mapping explicit title/message to single message line for standard Toast
        // If title is "Error" or generic, just use message. 
        // Otherwise combine "Title: Message" or just "Message" based on length/content.
        const combinedMessage = title && title !== "Error" && title !== "Limit Reached" ? `${title}: ${message}` : message;

        if (isError) {
            triggerErrorHaptic();
        } else {
            triggerHaptic();
        }

        setToast({
            message: combinedMessage,
            type: isError ? 'error' : 'success'
        });
    };

    const handleAddContact = async () => {
        if (contacts.length >= 1) { // Limited to 1
            showToast("Limit Reached", "You can invite only 1 co-host at a time.", true);
            return;
        }

        try {
            // Request Permissions (Required for Android 10+ and iOS)
            const permission = await Contacts.requestPermissions();
            if (permission.contacts !== 'granted') {
                // User denied permission
                showToast("Permission Required", "Contacts permission is required to select a co-host.", true);
                return;
            }

            const result = await Contacts.pickContact({
                projection: {
                    name: true,
                    phones: true
                }
            });

            if (result && result.contact) {
                const contact = result.contact;
                const phoneNumber = contact.phones?.[0]?.number;
                const name = contact.name?.display || 'Co-Host';

                if (!phoneNumber) {
                    showToast("Invalid Contact", "This contact doesn't have a phone number.", true);
                    return;
                }

                const cleanNewPhone = phoneNumber.replace(/\D/g, '');

                // Self-invite check (Witty Toast)
                if (currentUserPhone && (cleanNewPhone === currentUserPhone || cleanNewPhone.endsWith(currentUserPhone.slice(-10)))) {
                    showToast("Nice try 🎭", "You can't be your own co-host", true);
                    return;
                }

                if (contacts.some(c => c.phoneNumber.replace(/\D/g, '') === cleanNewPhone)) {
                    showToast("Duplicate", "This contact is already added.", true);
                    return;
                }

                setContacts(prev => [
                    ...prev,
                    {
                        id: Math.random().toString(36).substr(2, 9),
                        name,
                        phoneNumber,
                        permission: 'full_access' // Default permission
                    }
                ]);
            }
        } catch (error) {
            console.error("Error picking contact:", error);
        }
    };

    const removeContact = (id: string) => {
        setContacts(prev => prev.filter(c => c.id !== id));
    };

    const sendInvites = async () => {
        if (contacts.length === 0) return;

        try {
            setIsLoading(true);

            // 1. Validate Session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.id) {
                showToast("Auth Error", 'Please log in to send invitations', true);
                setIsLoading(false);
                return;
            }

            // 2. Start Animation Immediately (User Feedback)
            setIsSending(true);

            // 3. Process Invites in background while animation plays
            const results = [];
            for (const contact of contacts) {
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/cohosts/invite`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        listingId: listing.id,
                        permissions: contact.permission,
                        phoneNumber: contact.phoneNumber.replace(/\D/g, ''),
                        userId: session.user.id
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    results.push({ ...contact, ...data });
                }
            }

            // 4. Wait for Animation to finish 'Sealing' (approx 1s) and ensure request completed
            // Animation timing: Flap (0.6s) + Seal (spring). Fly away starts at 1.5s
            await new Promise(resolve => setTimeout(resolve, 1500));

            if (results.length > 0) {
                const invite = results[0];
                await openWhatsApp(invite);

                // Show Success State
                setIsSentSuccess(true);
                // toast is handled by "Invitation Sent" below or we can show one here
                // But user wants "drawer will close after showing invite sent in it"

                // Wait for "Fly Away" to finish
                await new Promise(resolve => setTimeout(resolve, 1000));

                onInviteSent();
                onClose();
            } else {
                // Fallback if failed
                setIsSending(false);
                showToast("Error", "Failed to send invite.", true);
            }

            setIsLoading(false);
            setContacts([]);

        } catch (error) {
            console.error("Error creating invites:", error);
            showToast("Error", "Failed to create invitations.", true);
            setIsLoading(false);
            setIsSending(false);
        }
    };

    const openWhatsApp = async (inviteData: any) => {
        const inviteUrl = `https://roovo.in/invite/${inviteData.token}`;
        const message = `🏠 *You're Invited to Co-Host!*\n\nHi ${inviteData.name}! You've been invited to help manage *${listing.title}* on Roovo.\n\n✨ *Access Level:* Full Access\n\n👉 Tap to accept: ${inviteUrl}\n\n*Invite Code:* ${inviteData.token}\n\nLooking forward to working together! 🤝`;

        const cleanPhone = inviteData.phoneNumber.replace(/\D/g, '');
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

        if (Capacitor.isNativePlatform()) {
            await Share.share({
                title: 'Co-Host Invitation',
                text: message,
                url: inviteUrl,
                dialogTitle: 'Send Invitation via WhatsApp'
            });
        } else {
            window.open(whatsappUrl, '_blank');
        }
    };

    return (
        <Drawer open={isOpen} onOpenChange={(open) => {
            if (!open && !isSending) onClose(); // Prevent closing during animation
        }}>
            <DrawerContent className="max-h-[85vh] flex flex-col">
                <div className="mx-auto w-full max-w-sm flex flex-col relative w-full">

                    {/* Header with Envelope Animation */}
                    <div className="pt-2 pb-0 w-full flex justify-center transform scale-90 origin-top">
                        <EnvelopeHeader title={listing.title} isSending={isSending} />
                    </div>

                    <DrawerHeader className="pt-0 pb-2">
                        <DrawerTitle>
                            {isSentSuccess ? "Invitation Sent! 🚀" : "Invite Co-Hosts"}
                        </DrawerTitle>
                        <DrawerDescription>
                            {isSentSuccess
                                ? "Redirecting to WhatsApp..."
                                : <span>Select up to 3 contacts to help manage <strong>{listing.title}</strong>.</span>
                            }
                        </DrawerDescription>
                    </DrawerHeader>

                    {/* Hide content when sending to cleaner look? Or just disable? */}
                    <div className={`p-4 space-y-4 overflow-y-auto transition-opacity duration-300 ${isSending ? 'opacity-50 pointer-events-none' : ''}`}>
                        {/* Contact List */}
                        <div className="space-y-3">
                            {contacts.map((contact) => (
                                <div key={contact.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-3 relative animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
                                                {contact.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm text-gray-900">{contact.name}</p>
                                                <p className="text-xs text-gray-500">{contact.phoneNumber}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeContact(contact.id)}
                                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {/* Permission Indicator (Simplified) */}
                                    <div className="bg-indigo-50 px-2 py-1 rounded text-[10px] text-indigo-600 font-medium inline-block self-start">
                                        Full Access
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add Button */}
                        {contacts.length < 1 ? (
                            <button
                                onClick={handleAddContact}
                                className="w-full h-12 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center gap-2 text-slate-500 font-medium hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all"
                            >
                                <Plus size={18} />
                                Add from Contacts
                            </button>
                        ) : (
                            <p className="text-xs text-center text-amber-600 bg-amber-50 p-2 rounded-lg">
                                Make sure your cohost has whatsapp.
                            </p>
                        )}
                    </div>

                    <DrawerFooter>
                        <Button
                            onClick={sendInvites}
                            disabled={contacts.length === 0 || isLoading || isSending}
                            className={`w-full h-12 text-base transition-all duration-300 ${isSentSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                        >
                            {isSentSuccess ? 'Sent Successfully!' : (isLoading || isSending ? 'Sending...' : 'Send Invitation on WhatsApp')}
                        </Button>
                        {!isSending && (
                            <DrawerClose asChild>
                                <Button variant="outline" className="h-12 border-slate-200">Cancel</Button>
                            </DrawerClose>
                        )}
                    </DrawerFooter>
                </div>

                <Toast
                    message={toast?.message || ""}
                    type={toast?.type}
                    isVisible={!!toast}
                    onClose={() => setToast(null)}
                    position="bottom"
                />
            </DrawerContent>
        </Drawer>
    );
}
