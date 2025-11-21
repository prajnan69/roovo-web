"use client";

import { useState, useEffect, useRef, type FC, type ReactNode, type ChangeEvent } from 'react';
import supabase from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigation } from '@/hooks/useNavigation';
import { usePreloadedData } from '@/context/PreloadContext';
import PersonalDetailsDrawer from './PersonalDetailsDrawer';
import PastTrips from './PastTrips';
import BecomeAHostSection from './BecomeAHostSection';
import ReferAHost from './ReferAHost';
import { FiBell, FiChevronRight, FiCamera, FiLogOut, FiUserCheck, FiSettings, FiUser, FiShield, FiCreditCard, FiHelpCircle } from 'react-icons/fi';

// --- Reusable Components ---

interface MenuItemProps {
  icon: ReactNode;
  label: string;
  sublabel?: string;
  onClick: () => void;
  isVerified?: boolean;
  variant?: 'default' | 'destructive';
  showChevron?: boolean;
}

const MenuItem: FC<MenuItemProps> = ({ icon, label, sublabel, onClick, isVerified, variant = 'default', showChevron = true }) => (
  <motion.button
    whileTap={{ scale: 0.98, backgroundColor: "rgba(249, 250, 251, 1)" }}
    onClick={onClick}
    disabled={isVerified}
    className={`w-full flex items-center justify-between p-4 bg-white border-b last:border-b-0 border-gray-50 transition-all ${isVerified ? 'opacity-75 cursor-default' : 'cursor-pointer hover:bg-gray-50/50'}`}
  >
    <div className="flex items-center gap-4">
      <div className={`flex items-center justify-center w-11 h-11 rounded-2xl text-xl shadow-sm ${variant === 'destructive'
        ? 'bg-red-50 text-red-500'
        : isVerified
          ? 'bg-green-50 text-green-600'
          : 'bg-white border border-gray-100 text-gray-700'
        }`}>
        {icon}
      </div>
      <div className="text-left">
        <p className={`font-semibold text-[15px] ${variant === 'destructive' ? 'text-red-600' : 'text-gray-900'}`}>
          {label}
        </p>
        {sublabel && <p className="text-xs text-gray-400 mt-0.5 font-medium">{sublabel}</p>}
      </div>
    </div>
    <div className="flex items-center gap-2">
      {isVerified && (
        <div className="flex items-center gap-1 bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
          <FiUserCheck className="text-green-600 text-xs" />
          <span className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Verified</span>
        </div>
      )}
      {!isVerified && showChevron && <FiChevronRight className="text-gray-300 text-lg" />}
    </div>
  </motion.button>
);

interface ProfileState {
  name: string;
  dob: string;
  gender: string;
  address: string;
  email: string;
  phone: string;
  about: string;
}

// --- Main Component ---

const Profile: FC = () => {
  const { profileData, updateProfileData } = usePreloadedData();
  const { navigate } = useNavigation();

  const [profile, setProfile] = useState<ProfileState>({
    name: '', dob: '', gender: '', address: '', email: '', phone: '', about: ''
  });

  const [hostProfilePicture, setHostProfilePicture] = useState<string>('');
  const [travelingProfilePicture, setTravelingProfilePicture] = useState<string>('');
  const [travelingProfilePictureFile, setTravelingProfilePictureFile] = useState<File | null>(null);
  const [hostProfilePictureFile, setHostProfilePictureFile] = useState<File | null>(null);
  const [kycVerified, setKycVerified] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };
  const travelingFileInputRef = useRef<HTMLInputElement>(null);
  const hostFileInputRef = useRef<HTMLInputElement>(null);

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 400, damping: 30 }
    }
  };

  useEffect(() => {
    if (profileData) {
      setProfile({
        name: profileData.name || '',
        dob: profileData.dob || '',
        gender: profileData.gender || '',
        address: profileData.address || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
        about: profileData.about || ''
      });
      setHostProfilePicture(profileData.host_profile_picture_url || '');
      setTravelingProfilePicture(profileData.traveling_profile_picture_url || '');
      setKycVerified(profileData.kyc_verified || false);
    }
  }, [profileData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleSaveProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      if (travelingProfilePictureFile) {
        await supabase.storage.from('profile-pictures').upload(`${session.user.id}/traveling`, travelingProfilePictureFile, { cacheControl: '3600', upsert: true });
      }
      if (hostProfilePictureFile) {
        await supabase.storage.from('profile-pictures').upload(`${session.user.id}/hosting`, hostProfilePictureFile, { cacheControl: '3600', upsert: true });
      }

      const { error } = await supabase.from('users').update({ ...profile }).eq('id', session.user.id);

      if (error) {
        console.error('Error updating profile:', error);
      } else {
        const updatedProfileData = {
          ...profileData,
          ...profile,
          host_profile_picture_url: hostProfilePicture,
          traveling_profile_picture_url: travelingProfilePicture,
          kyc_verified: kycVerified,
          is_host: profileData?.is_host || false,
        };
        updateProfileData(updatedProfileData);
        setSaveStatus('Saved!');
        setTimeout(() => setIsDrawerOpen(false), 2000);
      }
    }
  };

  const handleProfilePictureUpload = (e: ChangeEvent<HTMLInputElement>, type: 'traveling' | 'hosting') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'traveling') {
          setTravelingProfilePicture(reader.result as string);
          setTravelingProfilePictureFile(file);
        } else {
          setHostProfilePicture(reader.result as string);
          setHostProfilePictureFile(file);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-24">
      {/* Modern Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 flex items-center justify-between">
        <div className="text-2xl font-bold text-gray-900 tracking-tight">Profile</div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/notifications')}
          className="p-2.5 bg-white rounded-full shadow-sm border border-gray-100 text-gray-600 hover:text-indigo-600 transition-colors relative"
        >
          <FiBell size={20} />
          <span className="absolute top-2.5 right-3 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </motion.button>
      </div>

      <motion.div
        className="max-w-lg mx-auto px-5 pt-8 space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Profile Hero Section */}
        <motion.div variants={itemVariants} className="flex flex-col items-center text-center">
          <div className="relative mb-6 group">
            {/* Hidden Inputs */}
            <input type="file" ref={travelingFileInputRef} onChange={(e) => handleProfilePictureUpload(e, 'traveling')} className="hidden" />
            <input type="file" ref={hostFileInputRef} onChange={(e) => handleProfilePictureUpload(e, 'hosting')} className="hidden" />

            <div className="relative inline-block">
              {/* Main Avatar (Traveler) */}
              <motion.div
                className="w-32 h-32 rounded-full p-1.5 bg-white shadow-2xl shadow-indigo-100 cursor-pointer relative z-10"
                whileTap={{ scale: 0.95 }}
                onClick={() => travelingFileInputRef.current?.click()}
              >
                <div className="w-full h-full rounded-full overflow-hidden relative bg-gray-100 border border-gray-100">
                  {travelingProfilePicture ? (
                    <img src={travelingProfilePicture} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white">
                      <span className="text-4xl font-bold text-indigo-300">
                        {profile.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[1px]">
                    <FiCamera className="text-white drop-shadow-md" size={28} />
                  </div>
                </div>
              </motion.div>

              {/* Secondary Avatar Badge (Host) */}
              <motion.div
                className="absolute -bottom-1 -right-1 w-12 h-12 rounded-full border-4 border-white bg-white shadow-lg cursor-pointer overflow-hidden flex items-center justify-center z-20"
                whileTap={{ scale: 0.9 }}
                onClick={() => hostFileInputRef.current?.click()}
              >
                {hostProfilePicture ? (
                  <img src={hostProfilePicture} alt="Host" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-indigo-50 flex items-center justify-center">
                    <FiUser className="text-indigo-400" size={18} />
                  </div>
                )}
              </motion.div>
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{profile.name || "Guest User"}</h2>
            <p className="text-gray-500 font-medium">{profile.email || "Update your email"}</p>
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setIsDrawerOpen(true)}
            className="mt-6 px-8 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-full shadow-lg shadow-gray-200 hover:bg-gray-800 transition-all"
          >
            Edit Profile
          </motion.button>
        </motion.div>

        {/* Settings Groups */}
        <motion.div variants={itemVariants} className="space-y-6">

          {/* Group 1: Account */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-4">Account</h3>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <MenuItem
                icon={<FiShield />}
                label={kycVerified ? "Identity Verified" : "Identity Verification"}
                sublabel={kycVerified ? "Your identity is confirmed" : "Required to book stays"}
                isVerified={kycVerified}
                onClick={() => !kycVerified && navigate('/verify-identity')}
              />
              <MenuItem
                icon={<FiSettings />}
                label="Settings"
                sublabel="Privacy, Language, Notifications"
                onClick={() => { }}
              />
              <MenuItem
                icon={<FiCreditCard />}
                label="Payments & Payouts"
                sublabel="Manage payment methods"
                onClick={() => { }}
              />
            </div>
          </div>

          {/* Group 2: Hosting & Trips */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-4">Activity</h3>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              {!profileData?.is_host && (
                <div className="border-b border-gray-50">
                  <BecomeAHostSection />
                </div>
              )}
              <div className="border-b border-gray-50">
                <PastTrips />
              </div>
              <ReferAHost />
            </div>
          </div>

          {/* Group 3: Support & Legal */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-4">Support</h3>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <MenuItem
                icon={<FiHelpCircle />}
                label="Help & Support"
                onClick={() => { }}
              />
              <MenuItem
                icon={<FiLogOut />}
                label="Log Out"
                variant="destructive"
                showChevron={false}
                onClick={handleLogout}
              />
            </div>
          </div>

          <div className="text-center pt-4 pb-8">
            <p className="text-xs font-medium text-gray-300">Roovo v2.4.0 (Build 2024)</p>
          </div>

        </motion.div>
      </motion.div>

      <PersonalDetailsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        profile={profile}
        handleInputChange={handleInputChange}
        handleSaveProfile={handleSaveProfile}
        saveStatus={saveStatus}
      />
    </div>
  );
};

export default Profile;