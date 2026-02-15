"use client";

import {
  Star, Trophy, Sparkles, MapPin, Key,
  MessageCircle, CheckCircle2, Tag
} from "lucide-react";
import { motion } from "framer-motion";
import type { ListingData } from "@/types";

// Helper to map ratings to specific icons for a native feel
const getRatingIcon = (key: string) => {
  switch (key) {
    case 'cleanliness': return <Sparkles className="w-4 h-4" />;
    case 'accuracy': return <CheckCircle2 className="w-4 h-4" />;
    case 'checkin': return <Key className="w-4 h-4" />;
    case 'communication': return <MessageCircle className="w-4 h-4" />;
    case 'location': return <MapPin className="w-4 h-4" />;
    case 'value': return <Tag className="w-4 h-4" />;
    default: return <Star className="w-4 h-4" />;
  }
};

export default function DetailedRatings({ ratings }: { ratings: ListingData }) {
  if (!ratings) return null;

  const detailedRatings = {
    cleanliness: ratings.cleanliness_rating,
    accuracy: ratings.accuracy_rating,
    checkin: ratings.checkin_rating,
    communication: ratings.communication_rating,
    location: ratings.location_rating,
    value: ratings.value_rating,
  };

  const isTopTier = Object.values(detailedRatings).every(
    (value) => value !== undefined && value >= 4.8
  );

  return (
    <div className="py-2">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">
          Guest favorites
        </h2>
        {isTopTier && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5 pl-3 pr-4 py-1.5 bg-rose-50 text-rose-600 rounded-full border border-rose-100"
          >
            <Trophy className="w-4 h-4 fill-rose-600" />
            <span className="text-xs font-bold uppercase tracking-wide">Top Tier</span>
          </motion.div>
        )}
      </div>

      {/* Ratings List - Native List Style */}
      <div className="grid grid-cols-1 gap-y-5">
        {Object.entries(detailedRatings).map(([key, value], index) => {
          if (value === null || value === undefined) return null;

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between w-full"
            >
              {/* Label Side */}
              <div className="flex items-center gap-3 w-1/3 min-w-[140px]">
                <div className="p-2 rounded-full bg-slate-50 text-slate-500">
                  {getRatingIcon(key)}
                </div>
                <span className="text-sm font-medium text-slate-700 capitalize">
                  {key.replace(/_/g, " ")}
                </span>
              </div>

              {/* Progress Bar Side */}
              <div className="flex items-center gap-3 flex-1 max-w-[200px]">
                <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-slate-900 rounded-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(value / 5) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                  />
                </div>
                <span className="text-sm font-bold text-slate-900 w-6 text-right">
                  {value.toFixed(1)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}