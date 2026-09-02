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

  // Unselected chips sit raised (convex / protruded): clean top-edge specular highlight + crisp drop shadow below.
  // The SELECTED chip is cleanly depressed into the screen:
  // - Top and sides receive deep inner cavity shadows
  // - Zero outer drop shadows or harsh outer lines
  // - Seamless, uniform border matching the indigo active theme
  const RAISED = 'inset 0 1.5px 0 rgba(255,255,255,1), inset 0 -1px 1px rgba(0,0,0,.03), 0 4px 8px -1px rgba(0,0,0,.10), 0 2px 4px -1px rgba(0,0,0,.06)';
  const SUNK = 'inset 0 4px 7px rgba(0,0,0,.22), inset 0 2px 4px rgba(49,46,129,.24), inset 2px 0 4px rgba(0,0,0,.06), inset -2px 0 4px rgba(0,0,0,.06), inset 0 -1px 2px rgba(255,255,255,.6)';
  const SUNK_DEEPER = 'inset 0 5px 10px rgba(0,0,0,.28), inset 0 2.5px 5px rgba(49,46,129,.30), inset 2px 0 5px rgba(0,0,0,.10), inset -2px 0 5px rgba(0,0,0,.10), inset 0 -1px 1.5px rgba(255,255,255,.5)';
  const PRESSING = 'inset 0 4px 8px rgba(0,0,0,.22), inset 0 2px 4px rgba(0,0,0,.14), inset 0 -1px 1px rgba(255,255,255,.5)';

  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '10px 20px 12px', scrollbarWidth: 'none' }}>
      {dynamicFilters.map((filter) => {
        const isActive = activeFilter === filter.value || (filter as any).originalValue === activeFilter;
        const Icon = filter.icon;

        return (
          <motion.button
            key={filter.value}
            onClick={() => setActiveFilter((filter as any).originalValue || filter.value)}
            animate={isActive
              ? { y: 2.5, scale: 0.97, boxShadow: SUNK }
              : { y: 0, scale: 1, boxShadow: RAISED }}
            whileTap={isActive
              ? { y: 3.5, scale: 0.95, boxShadow: SUNK_DEEPER }
              : { y: 2, scale: 0.96, boxShadow: PRESSING }}
            transition={{ type: 'spring', stiffness: 400, damping: 24, mass: 0.8 }}
            style={{
              flexShrink: 0,
              height: 40,
              borderRadius: 12,
              padding: '0 14px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              border: isActive ? '1.5px solid rgba(79,70,229,.35)' : '1.5px solid rgba(0,0,0,.08)',
              // Sunken gradient: dark at top under cavity lip, blending to ambient light at bottom
              background: isActive
                ? 'linear-gradient(180deg, #C8C3F8 0%, #DAD6FD 30%, #EEEEFF 80%, #F5F4FF 100%)'
                : 'linear-gradient(180deg, #ffffff 0%, #f6f6f4 100%)',
              color: isActive ? 'var(--ind, #4F46E5)' : 'var(--t2, #3A3A37)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: isActive ? 'var(--ind, #4F46E5)' : 'var(--t3, #888880)' }}>
              <Icon size={14} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', letterSpacing: '.01em', textAlign: 'left', lineHeight: 1.2 }}>
              {filter.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};

export default FilterChips;
