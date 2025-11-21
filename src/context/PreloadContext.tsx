import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { preloadProfileData } from '@/services/profileService';

interface ProfileData {
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

  const updateProfileData = (data: ProfileData) => {
    setProfileData(data);
  };

  useEffect(() => {
    const loadData = async () => {
      const data = await preloadProfileData();
      setProfileData(data);
    };
    loadData();
  }, []);

  return (
    <PreloadContext.Provider value={{ profileData, updateProfileData }}>
      {children}
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
