"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const destinations = [
  { name: "Bengaluru", img: "/bengaluru.png" },
  { name: "Mumbai", img: "/mumbai.png" },
  { name: "Pondicherry", img: "/pondicherry.png" },
  { name: "Goa", img: "/goa.png" },
  { name: "Chennai", img: "/chennai.png" },
];

interface MobileWhereProps {
  selectedCity: { name: string; img: string };
  setSelectedCity: (city: { name: string; img: string }) => void;
}

const MobileWhere: React.FC<MobileWhereProps> = ({ selectedCity, setSelectedCity }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCityClick = (city: typeof destinations[0]) => {
    setSelectedCity(city);
    setIsExpanded(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        {destinations.map((city) => (
          <motion.div
            key={city.name}
            onClick={() => handleCityClick(city)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`cursor-pointer p-2 rounded-lg relative transition-colors duration-200 font-semibold text-center ${selectedCity.name === city.name ? "text-white bg-indigo-600" : "bg-slate-100 hover:bg-slate-200 text-slate-800"}`}
          >
            {city.name}
          </motion.div>
        ))}
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
            className="flex flex-col items-center justify-center overflow-hidden"
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={selectedCity.name}
                src={selectedCity.img}
              alt={selectedCity.name}
              width={200}
              height={200}
              className={`object-contain rounded-xl ${selectedCity.name !== 'Bengaluru' ? 'filter grayscale' : ''}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              />
            </AnimatePresence>
            {selectedCity.name !== 'Bengaluru' && (
              <p className="text-slate-500 mt-2">Coming Soon</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileWhere;
