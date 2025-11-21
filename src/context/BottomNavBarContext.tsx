import React, { createContext, useState, useContext } from 'react';

interface BottomNavBarContextType {
  isNavBarVisible: boolean;
  setIsNavBarVisible: (isVisible: boolean) => void;
}

const BottomNavBarContext = createContext<BottomNavBarContextType | undefined>(undefined);

export const BottomNavBarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isNavBarVisible, setIsNavBarVisible] = useState(true);

  return (
    <BottomNavBarContext.Provider value={{ isNavBarVisible, setIsNavBarVisible }}>
      {children}
    </BottomNavBarContext.Provider>
  );
};

export const useBottomNavBar = () => {
  const context = useContext(BottomNavBarContext);
  if (context === undefined) {
    throw new Error('useBottomNavBar must be used within a BottomNavBarProvider');
  }
  return context;
};
