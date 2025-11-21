"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Bell, Globe, FileText, Mail, Phone, Calendar, Users, ShieldCheck } from "lucide-react";
import supabase from "../services/api";
import BackButton from "./BackButton";

const AccountSettings = () => {
  const [activeSection, setActiveSection] = useState("personal-info");
  const [userData, setUserData] = useState<any>(null);
  const [kycVerified, setKycVerified] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
    const fetchUserData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from("users")
          .select("name, email, phone, dob, gender, about")
          .eq("id", session.user.id)
          .single();
        if (data) {
          setUserData(data);
        }

        const { data: kycData } = await supabase
          .from("kyc")
          .select("id")
          .eq("user_id", session.user.id)
          .single();

        if (kycData) {
          setKycVerified(true);
        }
      }
    };
    fetchUserData();
  }, []);

  const handleNotificationToggle = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === "granted");
    }
  };

  const sections = [
    { id: "personal-info", label: "Personal info", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "taxes", label: "Taxes", icon: FileText },
    // { id: "payments", label: "Payments", icon: CreditCard },
    { id: "languages", label: "Language", icon: Globe },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center px-4 sm:px-8 py-6">
      <div className="w-full max-w-6xl relative">
        {/* Sticky Header for mobile */}
        <div className="sticky top-0 bg-black z-50 flex justify-between items-center py-4 border-b border-gray-800 mb-6">
          <div className="flex items-center gap-3">
            <BackButton />
            <h1 className="text-2xl sm:text-3xl font-bold">Account settings</h1>
          </div>
        </div>

        {/* Sidebar for desktop / Tabs for mobile */}
        <div className="flex flex-col sm:flex-row gap-8">
          {/* Sidebar (Desktop) */}
          <aside className="hidden sm:block w-1/4">
            <nav className="flex flex-col gap-2">
              {sections.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveSection(id)}
                  className={`flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                    activeSection === id ? "bg-gray-800" : "hover:bg-gray-800/60"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Mobile Tabs */}
          <div className="sm:hidden mb-4 overflow-x-auto scrollbar-none">
            <div className="flex gap-3 w-max">
              {sections.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveSection(id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm whitespace-nowrap transition-colors ${
                    activeSection === id
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : "border-gray-700 text-gray-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Section */}
          <main className="flex-1">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {activeSection === "personal-info" && (
                <div>
                  <div className="divide-y divide-gray-800">
                    <div className="py-4 flex items-center gap-4">
                      <User className="w-5 h-5" />
                      <div>
                        <p className="font-semibold">Name</p>
                        <p className="text-gray-400">{userData?.name || "Not provided"}</p>
                      </div>
                    </div>
                    <div className="py-4 flex items-center gap-4">
                      <Mail className="w-5 h-5" />
                      <div>
                        <p className="font-semibold">Email</p>
                        <p className="text-gray-400">{userData?.email || "Not provided"}</p>
                      </div>
                    </div>
                    <div className="py-4 flex items-center gap-4">
                      <Phone className="w-5 h-5" />
                      <div>
                        <p className="font-semibold">Phone</p>
                        <p className="text-gray-400">{userData?.phone || "Not provided"}</p>
                      </div>
                    </div>
                    <div className="py-4 flex items-center gap-4">
                      <Calendar className="w-5 h-5" />
                      <div>
                        <p className="font-semibold">Date of Birth</p>
                        <p className="text-gray-400">{userData?.dob || "Not provided"}</p>
                      </div>
                    </div>
                    <div className="py-4 flex items-center gap-4">
                      <Users className="w-5 h-5" />
                      <div>
                        <p className="font-semibold">Gender</p>
                        <p className="text-gray-400">{userData?.gender || "Not provided"}</p>
                      </div>
                    </div>
                    <div className="py-4 flex items-center gap-4">
                      <FileText className="w-5 h-5" />
                      <div>
                        <p className="font-semibold">About</p>
                        <p className="text-gray-400">{userData?.about || "Not provided"}</p>
                      </div>
                    </div>
                    <div className="py-4 flex items-center gap-4">
                      <ShieldCheck className="w-5 h-5" />
                      <div>
                        <p className="font-semibold">KYC Verification</p>
                        <p className={kycVerified ? "text-green-500" : "text-gray-400"}>
                          {kycVerified ? "Verified" : "Not Verified"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "notifications" && (
                <div>
                  <div className="divide-y divide-gray-800">
                    <div className="py-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold">Enable Notifications</p>
                        <p className="text-gray-400 text-sm">Receive updates and alerts.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationsEnabled}
                          onChange={handleNotificationToggle}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px]  after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "taxes" && (
                <div>
                  <div className="divide-y divide-gray-800">
                    <div className="py-4">
                      <p className="font-semibold">GST Number</p>
                      <input
                        type="text"
                        placeholder="Enter your GST number"
                        className="w-full bg-gray-800 border border-gray-700 p-2 mt-2 rounded-md text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "payments" && (
                <div className="text-gray-400 italic text-center py-10">
                  This section is under development.
                </div>
              )}

              {activeSection === "languages" && (
                <div>
                  <div className="divide-y divide-gray-800">
                    <div className="py-4">
                      <p className="font-semibold">Language</p>
                      <p className="text-gray-400">English</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
