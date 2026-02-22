"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, useScroll, useTransform, AnimatePresence, MotionValue } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SlidingNumber } from "@/components/ui/shadcn-io/sliding-number";
import { ChevronRight, CreditCard, ShieldCheck, MessageSquare, CheckCircle2, Sparkles } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { usePreloadedData } from "@/context/PreloadContext";
import { fetchHostState, fetchHostDrafts } from "@/services/api";
import { useNavigation } from "@/hooks/useNavigation";
import ImportListingPage from "../import/ImportListingPage";

interface ActionCardProps {
  title: string;
  description: string;
  buttonText: string;
  icon: any;
  onButtonClick: () => void;
  index: number;
  priority?: 'high' | 'normal';
}

interface Notification {
  title: string;
  description: string;
  buttonText: string;
  icon: any;
  action: () => void;
  priority?: 'high' | 'normal';
}

interface HostState {
  trial_remaining: number;
  kyc_verified: boolean;
  payout_method: string | null;
  payout_details: any;
  subscription_status: string;
  trial_started_at: string;
  pending_messages?: number;
}

// --- Components ---

const ActionCard: React.FC<ActionCardProps> = ({
  title,
  description,
  buttonText,
  icon: Icon,
  onButtonClick,
  index,
  priority = 'normal',
}) => {
  const handlePress = () => {
    triggerHaptic().catch(() => { });
    onButtonClick();
  };

  const isHighPriority = priority === 'high';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className={`relative overflow-hidden rounded-3xl p-5 mb-4 border transition-all duration-200 active:scale-[0.98] ${isHighPriority
        ? 'bg-white border-indigo-100 shadow-[0_8px_30px_rgb(79,70,229,0.12)]'
        : 'bg-white border-gray-100 shadow-sm'
        }`}
    >
      {isHighPriority && (
        <div className="absolute top-0 right-0 p-3">
          <span className="flex h-2 w-2">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-2xl ${isHighPriority ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-600'}`}>
          <Icon size={24} />
        </div>
        <div className="flex-1">
          <h3 className={`text-lg font-bold ${isHighPriority ? 'text-indigo-950' : 'text-gray-900'}`}>{title}</h3>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      <Button
        onClick={handlePress}
        className={`mt-5 w-full rounded-xl py-6 flex justify-between group shadow-none transition-all ${isHighPriority
          ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
          : 'bg-gray-900 text-white hover:bg-gray-800'
          }`}
      >
        <span className="font-semibold">{buttonText}</span>
        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </Button>
    </motion.div >
  );
};

const StatsSection = ({ scrollY, trialRemaining }: { scrollY: MotionValue<number>, trialRemaining: number | null }) => {
  // Parallax effects
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const scale = useTransform(scrollY, [0, 300], [1, 0.9]);
  const y = useTransform(scrollY, [0, 300], [0, 50]);

  const showFlatFee = trialRemaining !== null && trialRemaining <= 0;

  return (
    <motion.div
      style={{ opacity, scale, y }}
      className="fixed top-0 left-0 right-0 h-[60vh] flex flex-col items-center justify-center px-6 bg-linear-to-b from-indigo-50/80 via-white to-white z-0"
    >
      <div className="w-full max-w-md text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-indigo-100 rounded-full shadow-sm mb-8"
        >
          <div className={`w-2 h-2 rounded-full ${showFlatFee ? 'bg-emerald-500' : 'bg-indigo-500 animate-pulse'}`} />
          <span className="text-xs font-bold tracking-wide uppercase text-indigo-950">
            {showFlatFee ? 'Standard Plan Active' : 'Trial Active'}
          </span>
        </motion.div>

        {showFlatFee ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-2"
          >
            <h2 className="text-5xl font-black text-indigo-950 tracking-tight">
              5%
            </h2>
            <p className="text-xl font-medium text-indigo-900/60">
              Only 5% flat fee on payouts
            </p>
          </motion.div>
        ) : (
          <div>
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg font-semibold text-indigo-900/50 uppercase tracking-widest mb-2"
            >
              Zero Commission
            </motion.h2>

            <div className="relative flex items-center justify-center py-4">
              <span className="text-8xl font-black text-indigo-950 tracking-tighter tabular-nums leading-none">
                {/* @ts-ignore */}
                <SlidingNumber number={String(trialRemaining ?? 20)} />
              </span>
              <span className="text-4xl text-indigo-200 font-bold self-end mb-2 ml-1">/20</span>
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-indigo-900/60 font-medium"
            >
              bookings remaining
            </motion.p>
          </div>
        )}
      </div>
    </motion.div>
  );
};


const Overview = () => {
  const { scrollY } = useScroll();
  const { profileData } = usePreloadedData();
  const [hostState, setHostState] = useState<HostState | null>(null);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const { navigate } = useNavigation();

  useEffect(() => {
    const loadHostState = async () => {
      console.log('[Overview] profileData:', profileData);
      console.log('[Overview] profileData.id:', profileData?.id);

      if (profileData?.id) {
        try {
          const [data, draftsData] = await Promise.all([
            fetchHostState(profileData.id),
            fetchHostDrafts(profileData.id)
          ]);
          console.log('[Overview] Received hostState:', data);
          setHostState(data);

          if (Array.isArray(draftsData)) {
            setDrafts(draftsData);
          }
        } catch (error) {
          console.error("[Overview] Failed to load request data:", error);
        }
      } else {
        console.log('[Overview] No profileData.id available, skipping fetch');
      }
    };
    loadHostState();
  }, [profileData]);


  const notifications = useMemo(() => {
    const list: Notification[] = [];

    if (hostState) {
      // 1. Priority Actions (High Priority)

      // KYC
      if (!hostState.kyc_verified) {
        console.log('[Overview] Adding KYC notification - kyc_verified is:', hostState.kyc_verified);
        list.push({
          title: "Complete Verification",
          description: "Upload your ID to activate your account and start receiving bookings.",
          buttonText: "Verify Identity",
          icon: ShieldCheck,
          action: () => navigate('hosting/verify'),
          priority: 'high',
        });
      }

      // Payout Method
      if (!hostState.payout_method) {
        console.log('[Overview] Adding Payout notification - payout_method is:', hostState.payout_method);
        list.push({
          title: "Add Payout Method",
          description: "Connect your bank account to receive payments from guests.",
          buttonText: "Add Bank Details",
          icon: CreditCard,
          action: () => navigate('hosting/payout-methods'),
          priority: 'high',
        });
      }

      // Messages
      if (hostState.pending_messages && hostState.pending_messages > 0) {
        list.push({
          title: `${hostState.pending_messages} Pending Messages`,
          description: "You have unread messages from potential guests.",
          buttonText: "View Messages",
          icon: MessageSquare,
          action: () => navigate('messages'),
          priority: 'normal',
        });
      }

    }

    console.log('[Overview] Generated notifications:', list);
    return list;
  }, [hostState, navigate]);

  // Visual physics for the sheet
  const sheetBorderRadius = useTransform(scrollY, [0, 100], [32, 0]);

  return (
    <div className="relative min-h-screen bg-white font-sans">
      {/* 1. Background Stats Layer */}
      <StatsSection scrollY={scrollY} trialRemaining={hostState?.trial_remaining ?? null} />

      {/* 2. Scrollable Sheet Layer */}
      <div className="relative z-10">
        <div className="h-[55vh] w-full" style={{ pointerEvents: 'none', touchAction: 'none' }} /> {/* Transparent spacer */}

        <motion.div
          style={{
            borderTopLeftRadius: sheetBorderRadius,
            borderTopRightRadius: sheetBorderRadius
          }}
          className="bg-white min-h-screen shadow-[0_-10px_60px_-15px_rgba(0,0,0,0.1)] pb-48"
        >
          {/* Grab Handle */}
          <div className="w-full flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>

          {/* Sticky Header */}
          <div className="sticky top-0 bg-white/80 backdrop-blur-xl z-20 px-6 py-4 flex justify-between items-center border-b border-gray-50/50">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              Action Center
            </h2>
            {notifications.length > 0 ? (
              <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md shadow-indigo-200">
                {notifications.length} NEW
              </span>
            ) : (
              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> ALL SET
              </span>
            )}
          </div>

          {/* Content List */}
          <div className="px-4 py-6">

            {/* Drafts Section */}
            {drafts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">In Progress</h3>
                  <span className="text-xs font-semibold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{drafts.length} drafts</span>
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelectedDraftId(drafts[0].id);
                    setShowImportModal(true);
                  }}
                  className="w-full text-left bg-white border border-gray-200 rounded-3xl p-4 shadow-sm transition-transform cursor-pointer flex gap-4 appearance-none"
                >
                  <div className="w-20 h-20 rounded-2xl bg-gray-100 overflow-hidden shrink-0 relative">
                    {drafts[0].picture_url ? (
                      <img src={drafts[0].picture_url} className="w-full h-full object-cover" alt="Draft" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Sparkles size={20} />
                      </div>
                    )}
                    {/* Progress Indicator */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
                      <div className="h-full bg-indigo-500 w-1/2" />
                    </div>
                  </div>

                  <div className="flex-1 py-1">
                    <h4 className="font-bold text-gray-900 line-clamp-1">{drafts[0].public_name || "New Listing"}</h4>
                    <p className="text-xs text-gray-500 mt-1 mb-3 line-clamp-1">{drafts[0].property_type || "Entire home"} · Last edited today</p>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">Continue Setup &rarr;</span>
                  </div>
                </motion.button>
              </motion.div>
            )}

            {notifications.length > 0 ? (
              notifications.map((notif, index) => (
                <ActionCard
                  key={index}
                  index={index}
                  title={notif.title}
                  description={notif.description}
                  buttonText={notif.buttonText}
                  icon={notif.icon}
                  onButtonClick={notif.action}
                  priority={notif.priority}
                />
              ))
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center px-8 border-2 border-dashed border-gray-100 rounded-3xl mx-2">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-gray-900 font-bold mb-1">All Caught Up!</h3>
                <p className="text-gray-400 text-sm">
                  You have no pending actions. Your account is in good standing.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showImportModal && (
          <ImportListingPage
            draftId={selectedDraftId || undefined}
            isAuthenticated={true}
            onClose={() => {
              setShowImportModal(false);
              setSelectedDraftId(null);
              // Refresh drafts logic could go here
            }}
            onSuccess={() => {
              setShowImportModal(false);
              navigate('hosting/listings');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Overview;
