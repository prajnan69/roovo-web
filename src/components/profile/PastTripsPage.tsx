"use client";

import { useState, useEffect } from 'react';
import { useNavigation } from '@/hooks/useNavigation';
import { FiChevronLeft, FiCalendar, FiMapPin, FiClock } from 'react-icons/fi';
import supabase from '@/services/api';
import RoovoLoader from '../RoovoLoader';
import { motion } from 'framer-motion';

interface Booking {
    id: string;
    created_at: string;
    check_in_date: string;
    check_out_date: string;
    total_price: number;
    status: string;
    listing: {
        title: string;
        city: string;
        images: string[];
    };
}

const PastTripsPage = () => {
    const { back, navigate } = useNavigation();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Fetch bookings where check_out_date is in the past
                // Note: This logic assumes 'bookings' table structure. 
                // We'll fetch all and filter client-side for "past" simplicity if date logic is complex in SQL
                // Or simply show all user bookings sorted by date desc
                const { data, error } = await supabase
                    .from('bookings')
                    .select(`
            *,
            listing:listings_new (
              title,
              city,
              images
            )
          `)
                    .eq('user_id', user.id)
                    .order('check_in_date', { ascending: false });

                if (error) throw error;
                setBookings(data || []);
            } catch (error) {
                console.error('Error fetching bookings:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBookings();
    }, []);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3 flex items-center gap-4">
                <button
                    onClick={back}
                    className="p-2 -ml-2 rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors"
                >
                    <FiChevronLeft size={24} />
                </button>
                <div className="text-xl font-bold text-slate-900">Your Trips</div>
            </div>

            <div className="px-5 pt-6 pb-20 max-w-md mx-auto">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <RoovoLoader />
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                            <FiCalendar size={28} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">No trips yet</h3>
                        <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                            Time to dust off your bags and start planning your next adventure!
                        </p>
                        <button
                            onClick={() => navigate('/')}
                            className="mt-6 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-full shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all"
                        >
                            Start Exploring
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {bookings.map((booking) => (
                            <motion.div
                                key={booking.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 active:scale-[0.98] transition-all"
                            >
                                <div className="flex h-28">
                                    <div className="w-28 h-full bg-slate-200 shrink-0">
                                        {booking.listing?.images?.[0] ? (
                                            <img
                                                src={booking.listing.images[0]}
                                                alt={booking.listing.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                <FiMapPin />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 p-3 flex flex-col justify-between">
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{booking.listing?.title || 'Unknown Listing'}</h3>
                                            <p className="text-xs text-slate-500 mt-0.5">{booking.listing?.city || 'Unknown City'}</p>
                                        </div>

                                        <div className="flex items-center justify-between mt-2">
                                            <div className="text-xs font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                                {formatDate(booking.check_in_date)} - {formatDate(booking.check_out_date)}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${booking.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600' :
                                                booking.status === 'cancelled' ? 'bg-rose-50 text-rose-600' :
                                                    'bg-amber-50 text-amber-600'
                                                }`}>
                                                {booking.status}
                                            </span>
                                            <span className="text-sm font-bold text-slate-900">₹{booking.total_price?.toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PastTripsPage;
