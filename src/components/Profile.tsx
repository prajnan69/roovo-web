"use client";

import { useState, useEffect, useRef, type FC, type ChangeEvent, type ReactNode } from 'react';
import supabase, { createSupportTicket } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigation } from '@/hooks/useNavigation';
import { usePreloadedData } from '@/context/PreloadContext';
import PersonalDetailsDrawer from './PersonalDetailsDrawer';
import {
  FiBell, FiChevronRight, FiCamera, FiLogOut, FiUser,
  FiSettings, FiShield, FiAlertCircle,
  FiGlobe, FiFileText, FiPhone, FiUserCheck
} from 'react-icons/fi';
import { triggerHaptic } from '@/lib/haptics';

/* -------------------- Menu Item -------------------- */
interface MenuItemProps {
  icon: ReactNode;
  label: string;
  sublabel?: string;
  onClick: () => void;
  isVerified?: boolean;
  variant?: 'default' | 'destructive';
}

const MenuItem: FC<MenuItemProps> = ({
  icon, label, sublabel, onClick, isVerified, variant = 'default'
}) => (
  <motion.div
    whileTap={{ scale: 0.97 }}
    onClick={() => {
      triggerHaptic();
      onClick();
    }}
    className={`w-full flex items-center justify-between p-4 bg-white active:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 cursor-pointer ${isVerified ? 'opacity-80' : ''}`}
  >
    <div className="flex items-center gap-4">
      <div className={`
        flex items-center justify-center w-10 h-10 rounded-full shrink-0
        ${variant === 'destructive'
          ? 'bg-rose-50 text-rose-600'
          : isVerified
            ? 'bg-emerald-50 text-emerald-600'
            : 'bg-slate-50 text-slate-600'}
      `}>
        {icon}
      </div>
      <div className="text-left">
        <div className={`font-semibold text-[15px] ${variant === 'destructive' ? 'text-rose-600' : 'text-slate-900'}`}>
          {label}
        </div>
        {sublabel && (
          <div className="text-[13px] text-slate-400 mt-0.5 font-medium leading-tight">
            {sublabel}
          </div>
        )}
      </div>
    </div>

    {isVerified ? (
      <div className="flex items-center gap-1 bg-emerald-100/60 px-2 py-1 rounded-md">
        <FiUserCheck className="text-emerald-600 text-xs" />
        <span className="text-[10px] font-bold text-emerald-700 uppercase">
          Verified
        </span>
      </div>
    ) : (
      <FiChevronRight className="text-slate-300 text-lg shrink-0" />
    )}
  </motion.div>
);

/* -------------------- Profile -------------------- */
const Profile: FC = () => {
  const { profileData } = usePreloadedData();
  const { navigate } = useNavigation();

  const [profile, setProfile] = useState({
    name: '', dob: '', gender: '', address: '',
    email: '', phone: '', about: ''
  });

  const [travelingProfilePicture, setTravelingProfilePicture] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [kycVerified, setKycVerified] = useState(false);

  // Support
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [supportCategory, setSupportCategory] = useState('Technical Issue');
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const travelingFileInputRef = useRef<HTMLInputElement>(null);
  const hostFileInputRef = useRef<HTMLInputElement>(null);

  /* -------------------- Load Profile -------------------- */
  useEffect(() => {
    if (!profileData) return;

    setProfile({
      name: profileData.name || '',
      dob: profileData.dob || '',
      gender: profileData.gender || '',
      address: profileData.address || '',
      email: profileData.email || '',
      phone: profileData.phone || '',
      about: profileData.about || ''
    });

    setTravelingProfilePicture(profileData.traveling_profile_picture_url || '');
  }, [profileData]);

  /* -------------------- KYC SOURCE OF TRUTH -------------------- */
  useEffect(() => {
    const checkKyc = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('kyc')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_approved', true)
        .maybeSingle();

      setKycVerified(!!data);
    };

    checkKyc();
  }, []);

  /* -------------------- UNREAD NOTIFICATIONS -------------------- */
  useEffect(() => {
    const fetchUnreadCount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count } = await supabase
        .from('user_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setUnreadNotificationsCount(count || 0);
    };

    fetchUnreadCount();
  }, []);

  /* -------------------- Handlers -------------------- */
  const handleLogout = async () => {
    triggerHaptic();
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleProfilePictureUpload = (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setTravelingProfilePicture(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRaiseIssue = async () => {
    if (!supportMessage.trim()) return;

    setIsSubmittingSupport(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error();

      await createSupportTicket(user.id, `[${supportCategory}] ${supportMessage}`);
      setSupportMessage('');
      setTimeout(() => {
        setIsSupportOpen(false);
      }, 2000);
    } catch {
      // Handle error visually if needed
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  /* -------------------- UI -------------------- */
  return (
    <div className="min-h-screen bg-slate-50 pb-32 font-sans">

      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-6 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3 flex justify-between items-center">
        <div className="text-2xl font-bold text-slate-900 tracking-tight">Profile</div>
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2.5 rounded-full bg-slate-50 active:bg-slate-100 transition-colors"
        >
          <FiBell size={20} className="text-slate-700" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
          )}
        </button>
      </div>

      <div className="max-w-md mx-auto px-5 pt-8 space-y-10">

        {/* Avatar */}
        <div className="flex flex-col items-center">
          <input type="file" ref={travelingFileInputRef} className="hidden"
            onChange={(e) => handleProfilePictureUpload(e)} />
          <input type="file" ref={hostFileInputRef} className="hidden"
            onChange={(e) => handleProfilePictureUpload(e)} />

          <motion.div
            whileTap={{ scale: 0.96 }}
            onClick={() => travelingFileInputRef.current?.click()}
            className="w-28 h-28 rounded-full bg-white shadow-xl shadow-slate-200 overflow-hidden cursor-pointer relative group"
          >
            {travelingProfilePicture ? (
              <img src={travelingProfilePicture} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center text-3xl font-bold text-indigo-400">
                {profile.name?.charAt(0) || 'U'}
              </div>
            )}
            <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <FiCamera className="text-white drop-shadow-md" size={24} />
            </div>
          </motion.div>

          {/* Name & Email - Using divs/spans instead of h2 for better control */}
          <div className="mt-4 text-center">
            <div className="text-xl font-bold text-slate-900 tracking-tight">
              {profile.name || 'Welcome, Traveler'}
            </div>
            <div className="text-sm text-slate-500 mt-0.5 font-medium">
              {profile.email || 'Complete your profile'}
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <section>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-3 mb-3">
            Account
          </div>
          <div className="bg-white rounded-[1.25rem] border border-slate-100 shadow-sm shadow-slate-100 overflow-hidden">
            <MenuItem
              icon={<FiUser />}
              label="Edit Profile"
              sublabel="Personal details & bio"
              onClick={() => setIsDrawerOpen(true)}
            />
            <MenuItem
              icon={<FiShield />}
              label={kycVerified ? 'Identity Verified' : 'Verify Identity'}
              sublabel={kycVerified ? 'Government ID approved' : 'Required for bookings'}
              isVerified={kycVerified}
              onClick={() => !kycVerified && navigate('/verify-identity')}
            />
            <MenuItem
              icon={<FiSettings />}
              label="Global Preferences"
              sublabel="Currency & language"
              onClick={() => navigate('/preferences')}
            />
          </div>
        </section>

        {/* Activity */}
        <section>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-3 mb-3">
            Activity
          </div>
          <div className="bg-white rounded-[1.25rem] border border-slate-100 shadow-sm shadow-slate-100 overflow-hidden">
            <MenuItem
              icon={<FiGlobe />}
              label="Trips"
              onClick={() => navigate('/trips')}
            />

          </div>
        </section>

        {/* Support */}
        <section>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-3 mb-3">
            Support
          </div>
          <div className="bg-white rounded-[1.25rem] border border-slate-100 shadow-sm shadow-slate-100 overflow-hidden">

            <MenuItem icon={<FiAlertCircle />} label="Raise an Issue" onClick={() => setIsSupportOpen(true)} />
            <MenuItem icon={<FiPhone />} label="Contact Us" onClick={() => navigate('/contact-us')} />
            <MenuItem icon={<FiFileText />} label="Terms & Conditions" onClick={() => navigate('/terms')} />
            <MenuItem icon={<FiFileText />} label="Refund Policy" onClick={() => navigate('/refund-policy')} />
            <MenuItem icon={<FiLogOut />} label="Log Out" variant="destructive" onClick={handleLogout} />
          </div>
        </section>

        <div className="text-center text-[10px] text-slate-300 font-bold uppercase tracking-widest pt-6 pb-2">
          Roovo v2.4.0 • Made in India
        </div>
      </div>

      {/* Drawers */}
      <AnimatePresence>
        {isDrawerOpen && (
          <PersonalDetailsDrawer
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            profile={profile}
            handleInputChange={(e: any) =>
              setProfile({ ...profile, [e.target.name]: e.target.value })
            }
            handleSaveProfile={() => setIsDrawerOpen(false)}
            saveStatus=""
          />
        )}
      </AnimatePresence>

      {/* Support Modal */}
      <AnimatePresence>
        {isSupportOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50"
              onClick={() => setIsSupportOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-5 right-5 top-1/2 -translate-y-1/2 bg-white rounded-2xl p-6 z-50 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-slate-900 mb-3">Raise an Issue</h3>
              <select
                value={supportCategory}
                onChange={(e) => setSupportCategory(e.target.value)}
                className="w-full p-3 bg-slate-50 rounded-xl mb-3 text-sm font-medium border border-transparent focus:border-indigo-500 focus:ring-0 transition-colors"
                style={{ appearance: 'none' }} // Remove default arrow if desired, or keep it
              >
                <option>Technical Issue</option>
                <option>Hosting Issue</option>
                <option>Guest Issue</option>
              </select>
              <textarea
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                className="w-full h-28 p-3 bg-slate-50 rounded-xl mb-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="Describe your issue..."
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setIsSupportOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-semibold rounded-xl text-sm active:scale-95 transition-transform"
                >
                  Cancel
                </button>
                <button
                  disabled={isSubmittingSupport}
                  onClick={handleRaiseIssue}
                  className="flex-1 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl text-sm active:scale-95 transition-transform shadow-lg shadow-indigo-200"
                >
                  {isSubmittingSupport ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
