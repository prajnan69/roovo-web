"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Zap, TrendingUp, TrendingDown, Info, Sun } from "lucide-react";

interface SmartPricingDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onApplyHolidayPremium: (dates: string[], factor: number) => void;
    onApplyWeekendPremium: (percent: number) => void;
}

// Hardcoded Holidays for India 2025 (Demo)
const HOLIDAYS = [
    { name: "Republic Day", date: "2025-01-26", type: "National" },
    { name: "Holi", date: "2025-03-14", type: "Festival" },
    { name: "Good Friday", date: "2025-04-18", type: "Restricted" },
    { name: "Independence Day", date: "2025-08-15", type: "National" },
    { name: "Diwali", date: "2025-10-20", type: "Festival" },
    { name: "Christmas", date: "2025-12-25", type: "Festival" },
];

const LONG_WEEKENDS = [
    { name: "Holi Weekend", dates: ["2025-03-14", "2025-03-15", "2025-03-16"] },
    { name: "Good Friday Weekend", dates: ["2025-04-18", "2025-04-19", "2025-04-20"] },
    { name: "Independence Day Weekend", dates: ["2025-08-15", "2025-08-16", "2025-08-17"] },
    { name: "Diwali Long Weekend", dates: ["2025-10-18", "2025-10-19", "2025-10-20"] },
];

const SEASONAL_TRENDS = [
    { name: "Winter Peak", type: "Peak", months: ["December", "January"], monthIndices: [11, 0], multiplier: 1.4 }, // +40%
    { name: "Monsoon Low", type: "Off-Peak", months: ["July", "August"], monthIndices: [6, 7], multiplier: 0.85 }, // -15%
];

const getDatesForMonth = (year: number, month: number) => {
    const dates = [];
    const date = new Date(year, month, 1);
    while (date.getMonth() === month) {
        // Correct timezone handling to get YYYY-MM-DD
        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - (offset * 60 * 1000));
        dates.push(localDate.toISOString().split('T')[0]);
        date.setDate(date.getDate() + 1);
    }
    return dates;
};

export default function SmartPricingDrawer({
    isOpen,
    onClose,
    onApplyHolidayPremium,
    onApplyWeekendPremium,
}: SmartPricingDrawerProps) {
    const [weekendPercent, setWeekendPercent] = useState(20);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 z-[90] backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed inset-0 top-[30vh] bg-white z-[100] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-white sticky top-0 z-10">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <Zap size={18} fill="currentColor" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">Smart Pricing</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-8 pb-32 bg-gray-50/50">

                            {/* 1. Weekend Strategy */}
                            <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <TrendingUp className="text-emerald-500" size={20} />
                                    <h3 className="font-bold text-gray-900">Weekend Premium</h3>
                                </div>
                                <p className="text-sm text-gray-500 mb-6">
                                    Automatically increase prices for all Friday & Saturday nights.
                                </p>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700">Premium</span>
                                        <span className="text-2xl font-bold text-indigo-600">+{weekendPercent}%</span>
                                    </div>

                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="5"
                                        value={weekendPercent}
                                        onChange={(e) => setWeekendPercent(Number(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />

                                    <button
                                        onClick={() => onApplyWeekendPremium(weekendPercent)}
                                        className="w-full py-3 rounded-xl bg-gray-900 text-white font-semibold shadow-md active:scale-95 transition-all text-sm"
                                    >
                                        Apply to All Weekends
                                    </button>
                                </div>
                            </section>

                            {/* 2. Holiday Insights */}
                            <section>
                                <div className="flex items-center justify-between mb-4 px-1">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="text-indigo-500" size={20} />
                                        <h3 className="font-bold text-gray-900">Upcoming Holidays</h3>
                                    </div>
                                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">2025</span>
                                </div>

                                <div className="space-y-3">
                                    {HOLIDAYS.map((holiday) => (
                                        <div
                                            key={holiday.name}
                                            className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between group active:scale-[0.99] transition-transform"
                                        >
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-bold text-gray-900">{holiday.name}</h4>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${holiday.type === 'National' ? 'bg-indigo-100 text-indigo-700' :
                                                        holiday.type === 'Festival' ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {holiday.type}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-medium text-gray-500">
                                                    {new Date(holiday.date).toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}
                                                </p>
                                            </div>

                                            <button
                                                onClick={() => onApplyHolidayPremium([holiday.date], 1.5)} // 1.5x Multiplier
                                                className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors"
                                            >
                                                Boost 50%
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex gap-2 text-xs text-blue-800">
                                    <Info size={16} className="shrink-0 mt-0.5" />
                                    Prices for holidays are critical for revenue. We recommend at least a 30-50% surge.
                                </div>
                            </section>

                            {/* 3. Long Weekends */}
                            <section>
                                <div className="flex items-center justify-between mb-4 px-1">
                                    <div className="flex items-center gap-2">
                                        <Sun className="text-amber-500" size={20} />
                                        <h3 className="font-bold text-gray-900">Long Weekends</h3>
                                    </div>
                                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">High Demand</span>
                                </div>

                                <div className="space-y-3">
                                    {LONG_WEEKENDS.map((lw) => (
                                        <div
                                            key={lw.name}
                                            className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-100 shadow-sm flex items-center justify-between group active:scale-[0.99] transition-transform"
                                        >
                                            <div>
                                                <h4 className="font-bold text-gray-900 mb-1">{lw.name}</h4>
                                                <p className="text-xs font-medium text-amber-700/80">
                                                    {new Date(lw.dates[0]).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} - {new Date(lw.dates[lw.dates.length - 1]).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                                </p>
                                            </div>

                                            <button
                                                onClick={() => onApplyHolidayPremium(lw.dates, 1.3)} // 1.3x Multiplier
                                                className="px-3 py-1.5 bg-white text-amber-600 text-xs font-bold rounded-lg shadow-sm border border-amber-100 hover:bg-amber-50 transition-colors"
                                            >
                                                Boost 30%
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* 4. Seasonal Trends */}
                            <section>
                                <div className="flex items-center justify-between mb-4 px-1">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="text-purple-500" size={20} />
                                        <h3 className="font-bold text-gray-900">Seasonal Trends</h3>
                                    </div>
                                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Forecast</span>
                                </div>

                                <div className="space-y-3">
                                    {SEASONAL_TRENDS.map((season) => (
                                        <div
                                            key={season.name}
                                            className={`p-4 rounded-xl border shadow-sm flex items-center justify-between group active:scale-[0.99] transition-transform ${season.type === 'Peak' ? 'bg-purple-50 border-purple-100' : 'bg-slate-50 border-slate-200'}`}
                                        >
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-bold text-gray-900">{season.name}</h4>
                                                    {season.type === 'Off-Peak' && <TrendingDown size={14} className="text-slate-500" />}
                                                </div>
                                                <p className={`text-xs font-medium ${season.type === 'Peak' ? 'text-purple-700/80' : 'text-slate-500'}`}>
                                                    {season.months.join(" • ")}
                                                </p>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    const allDates: string[] = [];
                                                    const year = 2025;
                                                    season.monthIndices.forEach(monthIndex => {
                                                        allDates.push(...getDatesForMonth(year, monthIndex));
                                                    });
                                                    onApplyHolidayPremium(allDates, season.multiplier);
                                                }}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm border transition-colors ${season.type === 'Peak'
                                                    ? 'bg-white text-purple-600 border-purple-100 hover:bg-purple-50'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                            >
                                                {season.type === 'Peak' ? `Boost ${Math.round((season.multiplier - 1) * 100)}%` : `Discount ${Math.round((1 - season.multiplier) * 100)}%`}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </section>

                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
