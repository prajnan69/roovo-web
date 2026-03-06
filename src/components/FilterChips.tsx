import { motion } from 'framer-motion';
import {
  IconAdjustmentsHorizontal,
  IconBuildingSkyscraper,
  IconHome,
  IconHome2,
  IconBed,
  IconPaw,
  IconKey,
  IconBuilding,
  IconTractor,
  IconHotelService,
  IconSun,
  IconTent,
  IconUsers,
  IconMountain,
  IconPool
} from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const ICON_MAP: Record<string, any> = {
  'Apartment': IconBuildingSkyscraper,
  'House': IconHome,
  'Villa': IconHome2,
  'Farmhouse': IconTractor,
  'Flat': IconBuilding,
  'Hotel': IconHotelService,
  'Resort': IconSun,
  'Cottage': IconTent,
  'Homestay': IconUsers,
  'Cabin': IconMountain,
  'Tiny Home': IconHome,
  'Beachfront': IconSun,
  'Amazing Pools': IconPool,
  '1_bed': IconBed,
  '2_plus_beds': IconBed,
  'pet_friendly': IconPaw,
  'self_check_in': IconKey
};

const DEFAULT_ICON = IconHome;


interface FilterChipsProps {
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
}

const FilterChips: React.FC<FilterChipsProps> = ({
  activeFilter,
  setActiveFilter,
}) => {
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/listings/categories`);
        if (response.data.categories) {
          setCategories(response.data.categories);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  const dynamicFilters = [
    { label: 'All', value: 'all', icon: IconAdjustmentsHorizontal },
    ...categories.map(cat => ({
      label: cat,
      value: cat.toLowerCase().replace(/ /g, '_'),
      icon: ICON_MAP[cat] || DEFAULT_ICON,
      originalValue: cat
    }))
  ];

  return (
    <div className="relative px-4 pt-1 mb-2">
      <div className="flex items-center gap-3 overflow-x-auto py-2 -mx-4 px-4 no-scrollbar">
        {dynamicFilters.map((filter) => {
          const isActive = activeFilter === filter.value || (filter as any).originalValue === activeFilter;
          const Icon = filter.icon;
          const isAll = filter.value === 'all';

          return (
            <motion.button
              key={filter.value}
              onClick={() => setActiveFilter((filter as any).originalValue || filter.value)}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 280, damping: 18 }}
              className={`
                relative flex ${isAll ? 'flex-col items-center justify-center w-[72px] h-[76px]' : 'flex-row items-center justify-center px-4 h-12 min-w-max'}
                rounded-2xl
                border transition-all duration-200
                ${isActive
                  ? 'bg-white border-indigo-600 shadow-lg shadow-indigo-500/20 ring-4 ring-indigo-50'
                  : 'bg-white border-slate-200 hover:border-slate-300'
                }
              `}
            >
              {/* Icon wrapper */}
              <div
                className={`
                  flex items-center justify-center rounded-md
                  ${isAll ? 'mb-1 w-7 h-7' : 'mr-2 w-5 h-5'}
                  ${isActive ? 'text-indigo-600' : 'text-slate-600'}
                `}
              >
                <Icon size={isAll ? 22 : 18} />
              </div>

              {/* Label */}
              <span
                className={`
                  font-semibold
                  ${isAll ? 'px-1 text-center text-[11px] leading-tight line-clamp-2' : 'text-sm whitespace-nowrap'}
                  ${isActive ? 'text-indigo-600' : 'text-slate-500'}
                `}
              >
                {filter.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default FilterChips;
