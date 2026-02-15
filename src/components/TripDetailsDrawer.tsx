"use client";

import React from 'react';
import { motion } from 'framer-motion';
import {
    FiCalendar,
    FiMapPin,
    FiMessageSquare,
    FiExternalLink,
    FiCheckCircle,
    FiClock,
    FiInfo
} from 'react-icons/fi';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { triggerHaptic } from '@/lib/haptics';

interface TripDetailsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    booking: any;
    onMessageHost: (booking: any) => void;
    onViewListing: (listingId: string) => void;
}

const TripDetailsDrawer: React.FC<TripDetailsDrawerProps> = ({
    isOpen,
    onClose,
    booking,
    onMessageHost,
    onViewListing
}) => {
    if (!booking) return null;

    const listing = booking.listings || booking.listing;
    const startDate = new Date(booking.start_date);
    const endDate = new Date(booking.end_date);

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DrawerContent className="bg-white rounded-t-[2.5rem] max-h-[90vh]">
                <div className="mx-auto w-full max-w-md overflow-y-auto pb-10">
                    <DrawerHeader className="text-left border-b border-slate-50 pb-4">
                        <DrawerTitle className="text-2xl font-bold text-slate-900">Trip Details</DrawerTitle>
                        <DrawerDescription className="text-slate-500 font-medium">
                            Booking #{booking.id.toString().slice(-6).toUpperCase()}
                        </DrawerDescription>
                    </DrawerHeader>

                    <div className="px-6 py-6 space-y-8">
                        {/* Listing Summary Card */}
                        <div
                            onClick={() => {
                                triggerHaptic();
                                onViewListing(booking.listing_id);
                            }}
                            className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 active:scale-[0.98] transition-all cursor-pointer"
                        >
                            <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-200 shrink-0">
                                <img
                                    src={listing?.images_data?.[0]?.url || listing?.all_image_urls?.[0]?.url || '/placeholder-listing.png'}
                                    alt={listing?.title}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-900 text-base line-clamp-1">{listing?.title}</h3>
                                <p className="text-slate-500 text-sm flex items-center gap-1 mt-1">
                                    <FiMapPin size={14} />
                                    {listing?.city || listing?.place || 'Location'}
                                </p>
                                <div className="flex items-center gap-1 text-indigo-600 text-xs font-bold mt-2">
                                    View Listing <FiExternalLink size={12} />
                                </div>
                            </div>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Check-in</p>
                                <p className="text-sm font-bold text-slate-900">{formatDate(startDate)}</p>
                                <p className="text-xs text-slate-500 mt-1">After 2:00 PM</p>
                            </div>
                            <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Check-out</p>
                                <p className="text-sm font-bold text-slate-900">{formatDate(endDate)}</p>
                                <p className="text-xs text-slate-500 mt-1">Before 11:00 AM</p>
                            </div>
                        </div>

                        {/* Reservation Status */}
                        <div className="p-5 border border-slate-100 rounded-2xl bg-white shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Reservation Status</p>
                                <div className={`flex items-center gap-1.5 text-sm font-bold ${booking.status === 'confirmed' ? 'text-emerald-600' : 'text-amber-600'
                                    }`}>
                                    {booking.status === 'confirmed' ? <FiCheckCircle size={16} /> : <FiClock size={16} />}
                                    <span className="capitalize">{booking.status}</span>
                                </div>
                            </div>
                            <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">
                                <FiInfo size={20} />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-4 space-y-3">
                            <button
                                onClick={() => {
                                    triggerHaptic();
                                    onMessageHost(booking);
                                }}
                                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                            >
                                <FiMessageSquare size={20} />
                                Message Host
                            </button>

                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-slate-50 text-slate-600 font-bold rounded-2xl flex items-center justify-center active:scale-[0.98] transition-all border border-slate-100"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
};

export default TripDetailsDrawer;
