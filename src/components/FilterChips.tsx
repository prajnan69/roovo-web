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
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '10px 20px 12px', scrollbarWidth: 'none' }}>
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
            style={{
              flexShrink: 0,
              width: isAll ? 64 : 'auto',
              height: isAll ? 68 : 40,
              borderRadius: isAll ? 16 : 99,
              padding: isAll ? 0 : '0 14px',
              display: 'flex',
              flexDirection: isAll ? 'column' : 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isAll ? 4 : 6,
              border: isActive ? '1.5px solid var(--ind, #4F46E5)' : '1.5px solid rgba(0,0,0,.10)',
              background: isActive ? 'var(--indbg, #EEEEFF)' : 'var(--bg-card, #fff)',
              boxShadow: isActive ? '0 0 0 3px var(--indring, rgba(79,70,229,.13)), 0 1px 3px rgba(0,0,0,.05)' : '0 1px 3px rgba(0,0,0,.05)',
              transition: 'all .2s cubic-bezier(.4,0,.2,1)',
              color: isActive ? 'var(--ind, #4F46E5)' : 'var(--t2, #3A3A37)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: isActive ? 'var(--ind, #4F46E5)' : 'var(--t3, #888880)' }}>
              <Icon size={isAll ? 19 : 14} />
            </div>
            <span style={{ fontSize: isAll ? 10 : 12, fontWeight: 600, whiteSpace: 'nowrap', letterSpacing: '.01em', textAlign: isAll ? 'center' : 'left', lineHeight: 1.2 }}>
              {filter.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};

export default FilterChips;
