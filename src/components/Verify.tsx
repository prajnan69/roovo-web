"use client";

import { useState, useEffect, useRef, type FC } from 'react';
import { useNavigation } from '@/hooks/useNavigation';
import supabase from '@/services/api';
import { API_BASE_URL } from '@/services/api';
import { Spinner } from '@/components/ui/shadcn-io/spinner';
import { ShieldCheck, User, UploadCloud, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

// Import your custom Stepper component
import Stepper, { Step } from '@/components/Stepper';

// A reusable UI component for the content of each upload step
interface UploadBoxProps {
  onFileSelect: (file: File) => void;
  file: File | null;
  title: string;
  icon: React.ReactNode;
}

const UploadBox: FC<UploadBoxProps> = ({ onFileSelect, file, title, icon }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const previewUrl = file ? URL.createObjectURL(file) : null;

  return (
    <div className="text-center w-full max-w-md mx-auto">
      <div className="flex items-center justify-center gap-3 mb-4">
        {icon}
        <h2 className="text-2xl font-semibold text-gray-800">{title}</h2>
      </div>
      <p className="text-gray-500 mb-6">Tap below to upload the image from your device.</p>
      <input
        type="file"
        accept="image/*"
        ref={inputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <motion.div
        whileTap={{ scale: 0.95 }}
        className="cursor-pointer aspect-video bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center p-4"
        onClick={() => inputRef.current?.click()}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Preview" className="max-h-full w-auto rounded-lg object-contain" />
        ) : (
          <div className="flex flex-col items-center text-gray-400">
            <UploadCloud size={48} className="mb-2"/>
            <span className="font-semibold">Upload Image</span>
          </div>
        )}
      </motion.div>
    </div>
  );
};

const VerifyPage: FC = () => {
  const { navigate } = useNavigation();
  const [aadharFrontFile, setAadharFrontFile] = useState<File | null>(null);
  const [aadharBackFile, setAadharBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(true); // Manages initial KYC check and final submission
  const [error, setError] = useState<string | null>(null);
  const [kycComplete, setKycComplete] = useState(false);

  useEffect(() => {
    const checkKyc = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from('kyc').select('id').eq('user_id', session.user.id).single();
        if (data) {
          setKycComplete(true);
        }
      }
      setLoading(false);
    };
    checkKyc();
  }, []);

  const handleSubmit = async () => {
    if (!aadharFrontFile || !aadharBackFile || !selfieFile) {
      setError('Please ensure all documents are uploaded before submitting.');
      return;
    }
    setLoading(true);
    setError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError("Session expired. Please log in again.");
      setLoading(false);
      return;
    }
    
    const formData = new FormData();
    formData.append('aadhar_front', aadharFrontFile);
    formData.append('aadhar_back', aadharBackFile);
    formData.append('selfie', selfieFile);

    try {
      const response = await fetch(`${API_BASE_URL}/api/kyc/${session.user.id}`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Failed to upload documents. Please try again.');
      }
      // On success, navigate away
      navigate('/profile?kyc=success');
    } catch (err: any) {
      setError(err.message || 'An error occurred during the KYC process.');
    } finally {
      setLoading(false);
    }
  };

  // Initial loading screen while checking KYC status
  if (loading && !aadharFrontFile) {
      return <div className="h-screen w-full flex items-center justify-center bg-white"><Spinner /></div>
  }

  // Screen for users who have already completed KYC
  if (kycComplete) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <CheckCircle2 size={64} className="text-green-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900">KYC Already Completed</h1>
        <p className="mt-2 text-gray-600">Your identity has already been verified. You're all set!</p>
        <button onClick={() => navigate('/')} className="mt-6 bg-indigo-600 text-white px-6 py-3 rounded-full font-semibold">
          Go to Home
        </button>
      </div>
    );
  }

  // The main stepper UI
  return (
    <div className="h-screen bg-white flex flex-col">
      <div className="p-4 border-b fixed top-0 left-0 right-0 bg-white z-10 flex items-center">
        <button onClick={() => navigate('/profile')} className="text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-lg font-bold ml-4">Verify Profile</div>
      </div>
      <div className="pt-16 pb-4">
      <Stepper
        onFinalStepCompleted={handleSubmit}
        // Conditionally disable the next button based on which step is active
        isNextButtonDisabled={(currentStep: number) => {
            if (currentStep === 1) return !aadharFrontFile;
            if (currentStep === 2) return !aadharBackFile;
            if (currentStep === 3) return !selfieFile;
            return false;
        }}
      >
        <Step>
          <UploadBox
            title="Aadhar Front"
            file={aadharFrontFile}
            onFileSelect={setAadharFrontFile}
            icon={<ShieldCheck size={28} className="text-indigo-600"/>}
          />
        </Step>

        <Step>
          <UploadBox
            title="Aadhar Back"
            file={aadharBackFile}
            onFileSelect={setAadharBackFile}
            icon={<ShieldCheck size={28} className="text-indigo-600"/>}
          />
        </Step>

        <Step>
          <UploadBox
            title="Take a Selfie"
            file={selfieFile}
            onFileSelect={setSelfieFile}
            icon={<User size={28} className="text-indigo-600"/>}
          />
        </Step>

        <Step>
          <div className="text-center w-full max-w-md mx-auto">
              {loading ? (
                  <>
                    <Spinner size={32} />
                    <h2 className="text-2xl font-semibold mt-4">Verifying...</h2>
                    <p className="text-gray-500 mt-2">Please wait while we securely process your documents.</p>
                  </>
              ) : (
                <>
                  <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-semibold text-gray-800">Ready to Submit</h2>
                  <p className="text-gray-500 mt-2">You have uploaded all the required documents. Click the button below to complete your identity verification.</p>
                  {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                </>
              )}
          </div>
        </Step>
      </Stepper>
      </div>
    </div>
  );
};

export default VerifyPage;
