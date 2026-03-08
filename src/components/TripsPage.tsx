"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigation } from '@/hooks/useNavigation';
import supabase, { fetchBookingsByGuestId } from '@/services/api';
import { FiCalendar, FiMapPin, FiChevronRight, FiClock, FiCheckCircle } from 'react-icons/fi';
import { triggerHaptic } from '@/lib/haptics';
import RoovoLoader from './RoovoLoader';
import TripDetailsDrawer from './TripDetailsDrawer';
import ChatDrawer from './ChatDrawer';

interface TripCardProps {
    booking: any;
    onClick: () => void;
}

const TripCard: React.FC<TripCardProps> = ({ booking, onClick }) => {
    const listing = booking.listings || booking.listing;
    const startDate = new Date(booking.start_date);
    const endDate = new Date(booking.end_date);

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={() => {
                triggerHaptic();
                onClick();
            }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-4 active:bg-slate-50 transition-colors"
        >
            <div className="flex p-4 gap-4">
                {/* Listing Image */}
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                    <img
                        src={listing?.images_data?.[0]?.url || listing?.all_image_urls?.[0]?.url || '/placeholder-listing.png'}
                        alt={listing?.title}
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start">
                            <h3 className="font-bold text-slate-900 text-[15px] line-clamp-1">{listing?.title || 'Listing Title'}</h3>
                            <FiChevronRight className="text-slate-300 mt-1" />
                        </div>
                        <p className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                            <FiMapPin size={12} />
                            {listing?.city || listing?.place || listing?.public_address || 'Location unavailable'}
                        </p>
                    </div>

                    <div className="mt-2 flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-slate-600 text-[13px] font-medium">
                            <FiCalendar className="text-indigo-500" size={14} />
                            <span>{formatDate(startDate)} - {formatDate(endDate)}</span>
                        </div>

                        <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${booking.status === 'confirmed' ? 'text-emerald-600' : 'text-amber-600'
                            }`}>
                            {booking.status === 'confirmed' ? <FiCheckCircle size={12} /> : <FiClock size={12} />}
                            {booking.status}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const TripsPage = ({ onOpenChat }: { onOpenChat?: (conversation: any) => void }) => {
    const { navigate } = useNavigation();
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Drawer States
    const [selectedBooking, setSelectedBooking] = useState<any>(null);
    const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
    const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);

    // User Data (needed for ChatDrawer)
    const [userData, setUserData] = useState({ id: '', name: '', phone: '' });

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    // 1. Fetch bookings where I am the primary guest
                    const data = await fetchBookingsByGuestId(session.user.id);
                    let allBookings: any[] = Array.isArray(data) ? data : [];

                    // 2. Fetch split bookings where I'm a participant (but not primary payer)
                    //    Get my phone number first
                    let phone = session.user.phone || session.user.user_metadata?.phone || '';
                    if (!phone) {
                        const { data: userData } = await supabase
                            .from('users')
                            .select('phone')
                            .eq('id', session.user.id)
                            .single();
                        phone = userData?.phone || '';
                    }

                    if (phone) {
                        const cleanPhone = phone.replace(/\D/g, '').slice(-10);

                        // Find all paid split groups for this user
                        const { data: mySplits } = await supabase
                            .from('payment_splits')
                            .select('group_id, is_primary_payer')
                            .like('participant_phone', `%${cleanPhone}`)
                            .eq('status', 'paid');

                        if (mySplits && mySplits.length > 0) {
                            // For each split group, try to find the associated booking
                            for (const split of mySplits) {
                                // Skip if I'm the primary payer — I'll already see it via guest_id
                                if (split.is_primary_payer) continue;

                                const splitOrderId = `split_${split.group_id}`;
                                const { data: splitBookings } = await supabase
                                    .from('bookings')
                                    .select(`
                                        *,
                                        listings (
                                            id, title, city, place, public_address,
                                            images_data, all_image_urls
                                        )
                                    `)
                                    .eq('payment_order_id', splitOrderId);

                                if (splitBookings && splitBookings.length > 0) {
                                    // Mark as split booking for display purposes
                                    const enriched = splitBookings.map(b => ({ ...b, listing: b.listings, is_split_participant: true }));
                                    // Avoid duplicates
                                    enriched.forEach(b => {
                                        if (!allBookings.find(existing => existing.id === b.id)) {
                                            allBookings.push(b);
                                        }
                                    });
                                }
                            }
                        }
                    }

                    setBookings(allBookings);

                    // Fetch User Data for Chat
                    setUserData(prev => ({ ...prev, id: session.user.id }));
                    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/${session.user.id}`);
                    if (response.ok) {
                        const { data: user } = await response.json();
                        setUserData({
                            id: session.user.id,
                            name: user?.name || 'User',
                            phone: user?.phone || ''
                        });
                    }
                }
            } catch (error) {
                console.error('Error loading trips data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const handleMessageHost = async (booking: any) => {
        triggerHaptic();
        const listingId = booking.listing_id;
        const guestId = userData.id;

        if (!listingId || !guestId) return;

        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/chat/conversations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    listing_id: listingId,
                    guest_id: guestId,
                }),
            });

            if (response.ok) {
                const conversation = await response.json();

                // Enrich conversation with data already available in booking for MessagesPage
                const enrichedConversation = {
                    ...conversation,
                    listing: booking.listing || booking.listings,
                    host: booking.listing?.host || booking.listings?.host || { name: 'Host' },
                    guest: { name: userData.name || 'Guest' }
                };

                if (onOpenChat) {
                    onOpenChat(enrichedConversation);
                    return;
                }
            }

            // Fallback to drawer ONLY if direct navigation fails
            setIsDetailsDrawerOpen(false);
            setIsChatDrawerOpen(true);
        } catch (error) {
            console.error("Error initiating chat:", error);
            setIsDetailsDrawerOpen(false);
            setIsChatDrawerOpen(true);
        }
    };

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const upcomingTrips = bookings
        .filter(b => new Date(b.end_date) >= now)
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    const pastTrips = bookings
        .filter(b => new Date(b.end_date) < now)
        .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

    const displayedTrips = activeTab === 'upcoming' ? upcomingTrips : pastTrips;

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-6 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3">
                <div className="text-2xl font-bold text-slate-900 tracking-tight">Trips</div>

                {/* Tabs */}
                <div className="flex gap-6 mt-4 relative">
                    {['upcoming', 'past'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => {
                                triggerHaptic();
                                setActiveTab(tab as any);
                            }}
                            className={`pb-2 text-sm font-bold capitalize transition-colors relative z-10 ${activeTab === tab ? 'text-indigo-600' : 'text-slate-400'
                                }`}
                        >
                            {tab}
                            {activeTab === tab && (
                                <motion.div
                                    layoutId="activeTabUnderline"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full"
                                />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-5 py-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <RoovoLoader className="w-12 h-auto text-indigo-600" />
                        <p className="text-sm font-medium text-slate-500 mt-4">Loading your trips...</p>
                    </div>
                ) : displayedTrips.length > 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col"
                    >
                        {displayedTrips.map((booking) => (
                            <TripCard
                                key={booking.id}
                                booking={booking}
                                onClick={() => {
                                    setSelectedBooking(booking);
                                    setIsDetailsDrawerOpen(true);
                                }}
                            />
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-20 text-center px-10"
                    >
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-6">
                            <FiCalendar size={40} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">
                            No {activeTab} trips
                        </h3>
                        <p className="text-slate-500 text-sm mt-2 font-medium">
                            {activeTab === 'upcoming'
                                ? "Time to dust off your bags and start planning your next adventure."
                                : "You haven't completed any trips yet."}
                        </p>
                        {activeTab === 'upcoming' && (
                            <button
                                onClick={() => navigate('/')}
                                className="mt-8 px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 active:scale-95 transition-transform"
                            >
                                Start searching
                            </button>
                        )}
                    </motion.div>
                )}
            </div>

            {/* Drawers */}
            <TripDetailsDrawer
                isOpen={isDetailsDrawerOpen}
                onClose={() => setIsDetailsDrawerOpen(false)}
                booking={selectedBooking}
                onMessageHost={handleMessageHost}
                onViewListing={(id) => navigate(`/listing/${id}`)}
            />

            {selectedBooking && (
                <ChatDrawer
                    isOpen={isChatDrawerOpen}
                    onClose={() => setIsChatDrawerOpen(false)}
                    listingId={selectedBooking.listing_id}
                    listingTitle={selectedBooking.listing?.title || 'Listing'}
                    hostName={selectedBooking.listing?.host?.name || 'Host'}
                    userId={userData.id}
                    userName={userData.name}
                    userPhone={userData.phone}
                    isBooking={true}
                />
            )}
        </div>
    );
};

export default TripsPage;
