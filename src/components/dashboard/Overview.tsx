"use client";

import { useState, useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SlidingNumber } from "@/components/ui/shadcn-io/sliding-number";
import { ChevronRight, Bell, Calendar, User, FileText } from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

// --- Mock Data & Types ---
interface ActionCardProps {
  title: string;
  description: string;
  buttonText: string;
  icon: React.ElementType;
  onButtonClick: () => void;
  index: number;
}

const notifications = [
  {
    title: "Complete your profile",
    description: "Add a profile picture and a short bio to build trust.",
    buttonText: "Go to profile",
    icon: User,
    action: () => console.log("Navigate to profile"),
  },
  {
    title: "Set your availability",
    description: "Update your calendar to show when your space is free.",
    buttonText: "Update calendar",
    icon: Calendar,
    action: () => console.log("Navigate to calendar"),
  },
  {
    title: "Add house rules",
    description: "Clearly outline your expectations for guests.",
    buttonText: "Add rules",
    icon: FileText,
    action: () => console.log("Navigate to house rules"),
  },
  {
    title: "Verify Identity",
    description: "Upload ID to get the verified badge.",
    buttonText: "Verify now",
    icon: User,
    action: () => console.log("Verify"),
  },
  {
    title: "Review Pricing",
    description: "Check local trends to optimize your nightly rate.",
    buttonText: "Check rates",
    icon: FileText,
    action: () => console.log("Pricing"),
  },
];

// --- Components ---

const ActionCard: React.FC<ActionCardProps> = ({
  title,
  description,
  buttonText,
  icon: Icon,
  onButtonClick,
  index,
}) => {
  const handlePress = async () => {
    await Haptics.impact({ style: ImpactStyle.Light });
    onButtonClick();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="bg-white rounded-3xl p-5 mb-4 border border-gray-100 shadow-sm active:scale-[0.98] transition-transform duration-200"
    >
      <div className="flex items-start gap-4">
        <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
          <Icon size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      <Button
        onClick={handlePress}
        className="mt-4 w-full bg-neutral-900 text-white hover:bg-neutral-800 rounded-2xl py-6 flex justify-between group shadow-lg shadow-slate-200"
      >
        <span className="font-semibold">{buttonText}</span>
        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </Button>
    </motion.div>
  );
};

const StatsSection = ({ scrollY }: { scrollY: any }) => {
  const completedBookings = 0;
  const freeBookingsRemaining = 20 - completedBookings;

  // Parallax effects based on scroll
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const scale = useTransform(scrollY, [0, 300], [1, 0.9]);
  const y = useTransform(scrollY, [0, 300], [0, 50]);

  return (
    <motion.div
      style={{ opacity, scale, y }}
      className="fixed top-0 left-0 right-0 h-[65vh] flex flex-col items-center justify-center px-6 bg-gradient-to-b from-indigo-50 to-white z-0"
    >
      <div className="w-full max-w-md space-y-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-block"
        >
          <span className="px-4 py-1.5 bg-white/50 backdrop-blur-md border border-indigo-100 text-indigo-700 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm">
            Current Plan
          </span>
        </motion.div>

        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 leading-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">ZERO</span> commission bookings
          </h2>
          <div className="flex items-baseline justify-center mt-6 gap-1">
            <span className="text-8xl font-black text-slate-900 tracking-tighter drop-shadow-sm">
              <SlidingNumber number={freeBookingsRemaining} />
            </span>
            <span className="text-3xl text-gray-400 font-medium">/20</span>
          </div>
          <p className="text-gray-500 mt-4 text-lg font-medium">
            bookings remaining this month
          </p>
        </div>
      </div>
    </motion.div>
  );
};

const Overview = () => {
  // We attach the scroll listener to the window/viewport logic
  const { scrollY } = useScroll();

  // Physics for the white sheet radius/movement
  const sheetBorderRadius = useTransform(scrollY, [0, 100], [40, 0]);

  return (
    <div className="relative min-h-screen bg-white">
      {/* 1. Fixed Background Layer (The Stats) */}
      <StatsSection scrollY={scrollY} />

      {/* 2. Scrollable Foreground Layer (The Sheet) */}
      {/* 
         - z-10 keeps it above the stats
         - pt-[60vh] creates the "window" to see the stats initially
         - The content naturally pushes up when scrolling anywhere
      */}
      <div className="relative z-10">
        <div className="h-[60vh] w-full pointer-events-none" /> {/* Spacer */}

        <motion.div
          style={{
            borderTopLeftRadius: sheetBorderRadius,
            borderTopRightRadius: sheetBorderRadius
          }}
          className="bg-white min-h-[60vh] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] pb-24"
        >
          {/* Handle Bar visual */}
          <div className="w-full flex justify-center pt-4 pb-2">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
          </div>

          {/* Sticky Header inside the list */}
          <div className="sticky top-0 bg-white/90 backdrop-blur-xl z-20 px-6 py-4 border-b border-gray-50 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-500" />
              Notifications
            </h2>
            <span className="bg-slate-900 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md shadow-slate-200">
              {notifications.length}
            </span>
          </div>

          {/* Scrollable Content */}
          <div className="px-4 py-6 space-y-2">
            {notifications.map((notif, index) => (
              <ActionCard
                key={index}
                index={index} // Pass index for staggered animation
                title={notif.title}
                description={notif.description}
                buttonText={notif.buttonText}
                icon={notif.icon}
                onButtonClick={notif.action}
              />
            ))}

            {/* Dummy content to ensure page is scrollable enough to cover top if list is short */}
            <div className="h-32 flex items-center justify-center text-gray-300 text-sm font-medium">
              All caught up!
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Overview;