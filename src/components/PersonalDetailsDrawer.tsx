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
  name: keyof Profile; // Ensures name is one of the keys from the Profile interface
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  icon: ReactNode;
  type?: string;
  as?: 'input' | 'textarea';
  placeholder?: string;
}

// A reusable, modern, and typed InputField component
const InputField: FC<InputFieldProps> = ({ name, label, value, onChange, icon, type = 'text', as = 'input', placeholder }) => {
  const InputComponent = as;
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
          {icon}
        </span>
        <InputComponent
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          type={type}
          rows={as === 'textarea' ? 4 : undefined}
          placeholder={placeholder}
          className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
        />
      </div>
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
    visible: { x: 0, transition: { type: 'spring' as const, damping: 25, stiffness: 200 } },
    hidden: { x: '100%', transition: { type: 'spring' as const, damping: 25, stiffness: 200 } },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            className="fixed inset-0 bg-black/40 z-40"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
          />
          {/* Drawer */}
          <motion.div
            className="fixed top-0 right-0 w-full max-w-md h-full bg-white shadow-lg z-50 flex flex-col"
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 shrink-0">
              <h2 className="text-2xl font-bold text-gray-900">Personal Details</h2>
              <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors">
                <FiX size={24} />
              </button>
            </div>

            {/* Form Content (Scrollable) */}
            <div className="p-6 space-y-5 grow overflow-y-auto">
              <InputField label="Full Name" name="name" value={profile.name} onChange={handleInputChange} icon={<FiUser />} placeholder="e.g., Jane Doe" />
              {!profile.dob ? (
                <>
                  {profile.email !== 'imorted@roovo.com' && (
                    <InputField label="Email Address" name="email" value={profile.email} onChange={handleInputChange} icon={<FiMail />} type="email" />
                  )}
                  <div className="text-center p-4 border border-dashed rounded-lg">
                    <p className="text-gray-600">Complete KYC to display all the personal information</p>
                  </div>
                </>
              ) : (
                <>
                  <InputField label="Date of Birth" name="dob" value={profile.dob} onChange={handleInputChange} icon={<FiCalendar />} type="date" />
                  <InputField label="Gender" name="gender" value={profile.gender} onChange={handleInputChange} icon={<FiUsers />} placeholder="e.g., Female" />
                  <InputField label="Address" name="address" value={profile.address} onChange={handleInputChange} icon={<FiMapPin />} placeholder="e.g., 123 Main St, Anytown" />
                  
                  {/* Conditionally render the email field */}
                  {profile.email !== 'imorted@roovo.com' && (
                    <InputField label="Email Address" name="email" value={profile.email} onChange={handleInputChange} icon={<FiMail />} type="email" />
                  )}
                  
                  <InputField label="Phone Number" name="phone" value={profile.phone} onChange={handleInputChange} icon={<FiPhone />} type="tel" />
                  <InputField label="About You" name="about" value={profile.about} onChange={handleInputChange} icon={<FiInfo />} as="textarea" placeholder="Tell us something about yourself..." />
                </>
              )}
            </div>

            {/* Footer / Action Button */}
            <div className="p-6 border-t border-gray-200 shrink-0">
              <button
                className="w-full bg-indigo-600 text-white py-3 font-bold rounded-lg flex items-center justify-center hover:bg-indigo-700 transition-all duration-300 disabled:bg-indigo-400"
                onClick={handleSaveProfile}
                disabled={!!saveStatus} // Disable button when saveStatus is active
              >
                <AnimatePresence mode="wait">
                  <motion.span
                    key={saveStatus || 'save'}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex items-center"
                  >
                    {saveStatus ? (
                      <>
                        <FiCheck className="mr-2" /> {saveStatus}
                      </>
                    ) : (
                      'Save Profile'
                    )}
                  </motion.span>
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
