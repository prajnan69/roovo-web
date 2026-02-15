import { motion } from 'framer-motion';
import {
  IconAdjustmentsHorizontal,
  IconBuildingSkyscraper,
  IconHome,
  IconHome2,
  IconBed,
  IconPaw,
  IconKey,
} from '@tabler/icons-react';

const filters = [
  { label: 'All', value: 'all', icon: IconAdjustmentsHorizontal },
  { label: 'Apartment', value: 'apartment', icon: IconBuildingSkyscraper },
  { label: 'House', value: 'house', icon: IconHome },
  { label: 'Villa', value: 'villa', icon: IconHome2 },
  { label: '1 Bed', value: '1_bed', icon: IconBed },
  { label: '2+ Beds', value: '2_plus_beds', icon: IconBed },
  { label: 'Pets', value: 'pet_friendly', icon: IconPaw },
  { label: 'Self Check-in', value: 'self_check_in', icon: IconKey },
];

interface FilterChipsProps {
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
}

const FilterChips: React.FC<FilterChipsProps> = ({
  activeFilter,
  setActiveFilter,
}) => {
  return (
    <div className="relative px-4 pt-1 mb-2">
      <div className="flex items-center gap-3 overflow-x-auto py-2 -mx-4 px-4 no-scrollbar">
        {filters.map((filter) => {
          const isActive = activeFilter === filter.value;
          const Icon = filter.icon;
          const isAll = filter.value === 'all';

          return (
            <motion.button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
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
