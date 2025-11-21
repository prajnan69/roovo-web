import React from 'react';

const ReferAHost = () => {
  return (
    <div className="mt-8">
      <h3 className="font-bold text-lg mb-4">Refer a Host</h3>
      <div className="p-4 border border-gray-300 bg-white rounded-lg">
        <p className="text-gray-600 mb-4">
          Know someone who would be a great host? Refer them and earn rewards.
        </p>
        <button className="w-full bg-indigo-500 text-white py-2 hover:bg-indigo-600 rounded-lg">
          Refer Now
        </button>
      </div>
    </div>
  );
};

export default ReferAHost;
