"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import supabase, { getListingsWithBookingsByHostId } from "../../services/api";
import RoovoLoader from "../RoovoLoader";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Calendar, MapPin, User, Clock, ArrowRight, Star, ChevronDown, ChevronUp, DollarSign } from "lucide-react";

const Bookings = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);

  const wittyMessages = [
    "The guest was speechless... in a good way (we hope)!",
    "Silence is golden, but a review would be diamond.",
    "No news is good news, right?",
    "They came, they saw, they left quietly."
  ];

  const getRandomWittyMessage = () => wittyMessages[Math.floor(Math.random() * wittyMessages.length)];

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        try {
          const listings = await getListingsWithBookingsByHostId(session.user.id);
          const allBookings = listings.flatMap((listing: any) =>
            listing.bookings.map((booking: any) => ({
              ...booking,
              listing,
            }))
          );
          setBookings(allBookings);
        } catch (err) {
          console.error("Error fetching bookings:", err);
        }
      }
      setLoading(false);
    };
    fetchBookings();
  }, []);

  const filteredBookings = bookings.filter(booking => {
    const endDate = new Date(booking.end_date);
    if (filter === 'upcoming') {
      return endDate >= new Date();
    } else {
      return endDate < new Date();
    }
  });

  const handleFilterChange = async (newFilter: 'upcoming' | 'past') => {
    await Haptics.impact({ style: ImpactStyle.Light });
    setFilter(newFilter);
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="flex items-center justify-between mb-2">
        <div className="text-2xl font-bold text-gray-900">Bookings</div>
      </div>

      {/* Filter Tabs */}
      <div className="flex p-1 bg-gray-100 rounded-xl relative">
        <motion.div
          className="absolute top-1 bottom-1 bg-white rounded-lg shadow-sm z-0"
          layoutId="activeBookingTab"
          initial={false}
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
          style={{
            left: filter === 'upcoming' ? '4px' : '50%',
            width: 'calc(50% - 4px)',
            x: filter === 'upcoming' ? 0 : 2
          }}
        />
        <button
          onClick={() => handleFilterChange('upcoming')}
          className={`flex-1 relative z-10 py-2.5 text-sm font-semibold transition-colors ${filter === 'upcoming' ? 'text-gray-900' : 'text-gray-500'}`}
        >
          Upcoming
        </button>
        <button
          onClick={() => handleFilterChange('past')}
          className={`flex-1 relative z-10 py-2.5 text-sm font-semibold transition-colors ${filter === 'past' ? 'text-gray-900' : 'text-gray-500'}`}
        >
          Past
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RoovoLoader />
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredBookings.length > 0 ? (
              filteredBookings.map((booking, index) => (
                <motion.div
                  key={booking.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 transition-all"
                >
                  <div className="flex gap-4">
                    {/* Listing Image */}
                    <div className="h-24 w-24 rounded-2xl overflow-hidden bg-gray-100 shrink-0">
                      <img
                        src={booking.listing.primary_image_url}
                        alt={booking.listing.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900 line-clamp-1">{booking.listing.title}</h3>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                          <MapPin size={12} />
                          {booking.listing.property_type}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-2">
                        <div className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg text-xs font-bold">
                          {new Date(booking.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          {' - '}
                          {new Date(booking.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="flex items-center gap-1 text-xs font-medium text-gray-600">
                          <User size={12} />
                          {booking.guests || 2} guests
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details Section */}
                  <AnimatePresence>
                    {expandedBookingId === booking.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                          {/* Guest Info */}
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden shrink-0">
                              {booking.guest?.avatar_url ? (
                                <img src={booking.guest.avatar_url} alt={booking.guest.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-600 font-bold text-sm">
                                  {booking.guest?.name?.charAt(0) || "G"}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{booking.guest?.name || "Guest"}</p>
                              <p className="text-xs text-gray-500">Guest</p>
                            </div>
                          </div>

                          {/* Review Section */}
                          <div className="bg-gray-50 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Review</h4>
                              {booking.reviews && booking.reviews.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Star size={12} className="fill-yellow-400 text-yellow-400" />
                                  <span className="text-xs font-bold text-gray-900">{booking.reviews[0].rating}</span>
                                </div>
                              )}
                            </div>
                            
                            {booking.reviews && booking.reviews.length > 0 ? (
                              <p className="text-sm text-gray-600 italic">"{booking.reviews[0].comment}"</p>
                            ) : (
                              <p className="text-sm text-gray-500 italic">{getRandomWittyMessage()}</p>
                            )}
                          </div>

                          {/* Earnings Section */}
                          <div className="flex items-center justify-between bg-green-50 rounded-xl p-3 border border-green-100">
                            <div className="flex items-center gap-2">
                              <div className="bg-green-100 p-1.5 rounded-lg">
                                <DollarSign size={16} className="text-green-700" />
                              </div>
                              <span className="text-sm font-medium text-green-800">Total Earnings</span>
                            </div>
                            <span className="text-lg font-bold text-green-700">
                              ${Number(booking.total_price).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Footer Actions */}
                  <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                      <Clock size={14} className="text-gray-400" />
                      {filter === 'upcoming' ? 'Check-in soon' : 'Completed'}
                    </div>
                    <button 
                      onClick={() => setExpandedBookingId(expandedBookingId === booking.id ? null : booking.id)}
                      className="text-xs font-bold text-indigo-600 flex items-center gap-1"
                    >
                      {expandedBookingId === booking.id ? 'Hide Details' : 'View Details'}
                      {expandedBookingId === booking.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="text-gray-300" size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">No bookings found</h3>
                <p className="text-gray-500 text-sm mt-1">
                  {filter === 'upcoming' ? "You don't have any upcoming trips." : "No past bookings to show."}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default Bookings;
