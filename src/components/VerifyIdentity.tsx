"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiCamera, FiUpload, FiCheckCircle } from 'react-icons/fi';

const VerifyIdentity = () => {
  const [step, setStep] = useState(1);
  const [idType, setIdType] = useState('');
  const [frontId, setFrontId] = useState<File | null>(null);
  const [backId, setBackId] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'front' | 'back' | 'selfie') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (fileType === 'front') setFrontId(file);
      else if (fileType === 'back') setBackId(file);
      else setSelfie(file);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-2xl font-bold mb-6">Choose your ID type</h2>
            <div className="space-y-4">
              {['Passport', 'Driver\'s License', 'National ID'].map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setIdType(type);
                    setStep(2);
                  }}
                  className="w-full text-left p-4 border rounded-lg hover:bg-gray-800"
                >
                  {type}
                </button>
              ))}
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-2xl font-bold mb-6">Upload ID ({idType})</h2>
            <div className="space-y-6">
              <div>
                <label className="block mb-2">Front of ID</label>
                <div className="flex items-center space-x-4">
                  <input type="file" id="frontId" className="hidden" onChange={(e) => handleFileChange(e, 'front')} />
                  <label htmlFor="frontId" className="cursor-pointer p-4 border-2 border-dashed rounded-lg flex flex-col items-center justify-center hover:border-gray-400">
                    <FiUpload className="mb-2" />
                    <span>{frontId ? frontId.name : 'Upload File'}</span>
                  </label>
                </div>
              </div>
              {idType !== 'Passport' && (
                <div>
                  <label className="block mb-2">Back of ID</label>
                  <div className="flex items-center space-x-4">
                    <input type="file" id="backId" className="hidden" onChange={(e) => handleFileChange(e, 'back')} />
                    <label htmlFor="backId" className="cursor-pointer p-4 border-2 border-dashed rounded-lg flex flex-col items-center justify-center hover:border-gray-400">
                      <FiUpload className="mb-2" />
                      <span>{backId ? backId.name : 'Upload File'}</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setStep(3)} className="mt-8 w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200">
              Next
            </button>
          </motion.div>
        );
      case 3:
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-2xl font-bold mb-6">Take a Selfie</h2>
            <div className="flex flex-col items-center">
              <div className="w-64 h-64 bg-gray-800 rounded-full flex items-center justify-center mb-6">
                <FiCamera size={64} />
              </div>
              <input type="file" id="selfie" accept="image/*" capture="user" className="hidden" onChange={(e) => handleFileChange(e, 'selfie')} />
              <label htmlFor="selfie" className="cursor-pointer p-4 bg-white text-black font-bold rounded-lg hover:bg-gray-200">
                {selfie ? selfie.name : 'Take Photo'}
              </label>
            </div>
            <button onClick={() => setStep(4)} className="mt-8 w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200">
              Submit Verification
            </button>
          </motion.div>
        );
      case 4:
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <FiCheckCircle size={80} className="mx-auto text-green-500 mb-6" />
            <h2 className="text-3xl font-bold mb-4">Verification Submitted</h2>
            <p className="text-gray-400">
              We'll review your documents and notify you once your identity is confirmed. This usually takes a few minutes.
            </p>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6 md:p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-4xl font-bold mb-4 text-center">Verify Your Identity</h1>
        <p className="text-center text-gray-400 mb-10">
          Please upload a government-issued ID to help us confirm your identity.
        </p>
        <div className="border border-gray-700 bg-gray-900 p-8">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default VerifyIdentity;
