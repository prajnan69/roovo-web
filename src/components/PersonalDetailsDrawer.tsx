import { type FC, type ReactNode, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiUser, FiCalendar, FiMapPin, FiMail, FiPhone, FiInfo, FiCheck, FiUsers } from 'react-icons/fi';

// Interface for the main component's props
interface PersonalDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
  handleInputChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSaveProfile: () => void;
  saveStatus: string;
}

// Interface for the user profile data
interface Profile {
  name: string;
  dob: string;
  gender: string;
  address: string;
  email: string;
  phone: string;
  about: string;
}

// Interface for our new reusable InputField component's props
interface InputFieldProps {
  name: keyof Profile;
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  icon: ReactNode;
  type?: string;
  as?: 'input' | 'textarea';
  placeholder?: string;
}

// Modern Minimalist Input
const InputField: FC<InputFieldProps> = ({ name, label, value, onChange, icon, type = 'text', as = 'input', placeholder }) => {
  const InputComponent = as;
  return (
    <div className="relative group">
      {/* Icon */}
      <div className="absolute top-[26px] left-0 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
        {icon}
      </div>

      {/* Input */}
      <InputComponent
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        type={type}
        rows={as === 'textarea' ? 3 : undefined}
        placeholder=" "
        className="peer w-full pl-8 pr-2 pt-6 pb-2 bg-transparent border-b border-slate-200 focus:border-indigo-600 text-slate-900 font-medium placeholder-transparent focus:outline-none transition-colors resize-none"
      />

      {/* Floating Label */}
      <label
        htmlFor={name}
        className="absolute left-8 top-6 text-slate-400 text-base transition-all peer-focus:-top-1 peer-focus:text-xs peer-focus:text-indigo-600 peer-[:not(:placeholder-shown)]:-top-1 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-slate-500 cursor-text"
      >
        {label}
      </label>
    </div>
  );
};

const PersonalDetailsDrawer: FC<PersonalDetailsDrawerProps> = ({
  isOpen,
  onClose,
  profile,
  handleInputChange,
  handleSaveProfile,
  saveStatus,
}) => {
  const backdropVariants = {
    visible: { opacity: 1 },
    hidden: { opacity: 0 },
  };

  const drawerVariants = {
    visible: { y: 0, transition: { type: 'spring' as const, damping: 25, stiffness: 200 } },
    hidden: { y: '100%', transition: { type: 'spring' as const, damping: 25, stiffness: 200 } },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
          />
          {/* Bottom Sheet Drawer (Mobile Style) */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[2rem] shadow-2xl z-50 flex flex-col max-h-[90vh]"
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {/* Handle Bar */}
            <div className="flex justify-center pt-3 pb-1" onClick={onClose}>
              <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 shrink-0">
              <h2 className="text-xl font-bold text-slate-900">Edit Profile</h2>
              <button onClick={onClose} className="p-2 rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors">
                <FiX size={20} />
              </button>
            </div>

            {/* Form Content */}
            <div className="px-6 pb-6 space-y-6 overflow-y-auto">
              <InputField label="Full Name" name="name" value={profile.name} onChange={handleInputChange} icon={<FiUser size={18} />} />

              {!profile.dob ? (
                <>
                  {profile.email !== 'imorted@roovo.com' && (
                    <InputField label="Email" name="email" value={profile.email} onChange={handleInputChange} icon={<FiMail size={18} />} type="email" />
                  )}
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-3 mt-2">
                    <FiInfo className="text-indigo-600 mt-1 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-indigo-900">Complete Verification</p>
                      <p className="text-xs text-indigo-700 mt-0.5">Verify your identity to unlock full profile editing.</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <InputField label="Date of Birth" name="dob" value={profile.dob} onChange={handleInputChange} icon={<FiCalendar size={18} />} type="date" />
                  <InputField label="Gender" name="gender" value={profile.gender} onChange={handleInputChange} icon={<FiUsers size={18} />} />
                  <InputField label="Address" name="address" value={profile.address} onChange={handleInputChange} icon={<FiMapPin size={18} />} />

                  {profile.email !== 'imorted@roovo.com' && (
                    <InputField label="Email" name="email" value={profile.email} onChange={handleInputChange} icon={<FiMail size={18} />} type="email" />
                  )}

                  <InputField label="Phone" name="phone" value={profile.phone} onChange={handleInputChange} icon={<FiPhone size={18} />} type="tel" />
                  <InputField label="Bio" name="about" value={profile.about} onChange={handleInputChange} icon={<FiInfo size={18} />} as="textarea" />
                </>
              )}
            </div>

            {/* Sticky Save Button */}
            <div className="p-5 border-t border-slate-100 shrink-0 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
              <button
                className="w-full bg-slate-900 text-white py-3.5 font-bold rounded-xl shadow-lg shadow-slate-200 flex items-center justify-center hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                onClick={handleSaveProfile}
                disabled={!!saveStatus}
              >
                <AnimatePresence mode="wait">
                  {saveStatus ? (
                    <motion.div
                      key="saved"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-emerald-300"
                    >
                      <FiCheck /> {saveStatus}
                    </motion.div>
                  ) : (
                    <motion.span
                      key="save"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      Save Changes
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PersonalDetailsDrawer;
