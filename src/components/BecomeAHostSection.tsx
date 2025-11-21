import React from 'react';
import { useNavigation } from '@/hooks/useNavigation';

const BecomeAHostSection = () => {
  const { navigate } = useNavigation();

  return (
    <div className="mt-8">
      <h3 className="font-bold text-lg mb-4">Become a Host</h3>
      <div className="p-4 border border-gray-300 bg-white rounded-lg">
        <p className="text-gray-600 mb-4">
          Join our community of hosts and start earning by sharing your space.
        </p>
        <button
          className="w-full bg-indigo-500 text-white py-2 hover:bg-indigo-600 rounded-lg"
          onClick={() => navigate('/hosting')}
        >
          Get Started
        </button>
      </div>
    </div>
  );
};

export default BecomeAHostSection;
