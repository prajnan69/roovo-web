import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { preloadProfileData } from '@/services/profileService';
import supabase from '@/services/api';
import ProfileCompletionModal from '@/components/ProfileCompletionModal';

interface ProfileData {
  id?: string;
  name: string;
  dob: string;
  gender: string;
  address: string;
  email: string;
  phone: string;
  about: string;
  host_profile_picture_url: string;
  traveling_profile_picture_url: string;
  kyc_verified: boolean;
  is_host: boolean;
}

interface PreloadContextType {
  profileData: ProfileData | null;
  updateProfileData: (data: ProfileData) => void;
}

const PreloadContext = createContext<PreloadContextType | undefined>(undefined);

export const PreloadProvider = ({ children }: { children: ReactNode }) => {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const isLoadingRef = React.useRef(false);

  const updateProfileData = (data: ProfileData) => {
    setProfileData(data);
  };

  // Check if profile is incomplete (missing name, gender, or dob)
  const isProfileIncomplete = (data: ProfileData | null): boolean => {
    if (!data) return false;
    return !data.name || !data.gender || !data.dob;
  };

  useEffect(() => {
    const loadData = async () => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;

      try {
        const data = await preloadProfileData();
        setProfileData(data);

        // Get user ID for modal
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          setUserId(session.user.id);
          // Show modal if profile is incomplete
          if (isProfileIncomplete(data)) {
            setShowProfileModal(true);
          }
        }
      } finally {
        isLoadingRef.current = false;
      }
    };
    loadData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        loadData();
      } else if (event === 'SIGNED_OUT') {
        setProfileData(null);
        setShowProfileModal(false);
        setUserId(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Preload search location images
  useEffect(() => {
    const imagesToPreload = [
      '/bengaluru.png',
      '/chikkamagaluru.png',
      '/uttara-kannada.png',
      '/udupi-manglore.png',
    ];

    imagesToPreload.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const handleProfileComplete = async () => {
    setShowProfileModal(false);
    // Reload profile data
    const data = await preloadProfileData();
    setProfileData(data);
  };

  return (
    <PreloadContext.Provider value={{ profileData, updateProfileData }}>
      {children}

      {/* Profile Completion Modal */}
      {userId && (
        <ProfileCompletionModal
          isOpen={showProfileModal}
          userId={userId}
          currentName={profileData?.name}
          currentEmail={profileData?.email}
          currentGender={profileData?.gender}
          currentDob={profileData?.dob}
          onComplete={handleProfileComplete}
        />
      )}
    </PreloadContext.Provider>
  );
};

export const usePreloadedData = () => {
  const context = useContext(PreloadContext);
  if (context === undefined) {
    throw new Error('usePreloadedData must be used within a PreloadProvider');
  }
  return context;
};
