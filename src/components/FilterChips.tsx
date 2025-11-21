import React from 'react';
import { IconHome, IconKey, IconSparkles, IconHeart, IconTag, IconAdjustmentsHorizontal, IconBuildingCommunity } from '@tabler/icons-react';

const filters = [
  { label: 'All', value: 'all', icon: <IconAdjustmentsHorizontal size={20} /> },
  { label: '1Bed', value: '1bhk', icon: <IconHome size={20} /> },
  { label: '2Beds', value: '2bhk', icon: <IconBuildingCommunity size={20} /> },
  { label: 'Pets', value: 'pet_friendly', icon: <IconHeart size={20} /> },
  { label: 'Party', value: 'party_friendly', icon: <IconSparkles size={20} /> },
  { label: 'Check-in', value: 'self_check_in', icon: <IconKey size={20} /> },
  { label: 'Discount', value: 'discounted', icon: <IconTag size={20} /> },
];

interface FilterChipsProps {
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
}

const FilterChips: React.FC<FilterChipsProps> = ({ activeFilter, setActiveFilter }) => {
  return (
    <div className="px-4 pt-4">
      <div className="flex space-x-2 overflow-x-auto py-2  -mx-4 px-4 no-scrollbar">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setActiveFilter(filter.value)}
            className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl text-xs font-semibold transition-all duration-200 ${activeFilter === filter.value
              ? 'bg-white !text-indigo-600 !border-indigo-600 shadow-md scale-105'
              : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-200'
              }`}
          >
            {filter.icon}
            <span className="mt-1 text-[10px]">{filter.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default FilterChips;
