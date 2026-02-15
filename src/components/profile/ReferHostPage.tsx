"use client";

import { useNavigation } from '@/hooks/useNavigation';
import { FiChevronLeft, FiShare2, FiGift, FiTarget, FiAward } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { Share } from '@capacitor/share';

const ReferHostPage = () => {
    const { back } = useNavigation();

    const handleInvite = async () => {
        try {
            await Share.share({
                title: 'Join Roovo as a Host',
                text: 'Hey! I think your place would be perfect on Roovo. List it now and earn extra income!',
                url: 'https://roovo.in/become-host',
                dialogTitle: 'Invite a Host'
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3 flex items-center justify-between">
                <button
                    onClick={back}
                    className="p-2 -ml-2 rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors"
                >
                    <FiChevronLeft size={24} />
                </button>
                <div className="text-base font-bold text-slate-900">Refer & Earn</div>
                <div className="w-10" /> {/* Spacer */}
            </header>

            <main className="flex-1 overflow-y-auto pb-24">
                {/* Hero Section */}
                <div className="px-5 pt-8 pb-10 bg-white rounded-b-[2.5rem] shadow-sm shadow-slate-100 border-b border-slate-100 overflow-hidden relative">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-60" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-50 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 opacity-60" />

                    <div className="relative text-center max-w-sm mx-auto">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", duration: 0.6 }}
                            className="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center text-white shadow-xl shadow-indigo-200 rotate-3 mb-6"
                        >
                            <FiGift size={40} />
                        </motion.div>

                        <motion.h2
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="text-3xl font-extrabold text-slate-900 leading-tight"
                        >
                            Invite hosts, <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">earn rewards.</span>
                        </motion.h2>

                        <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-slate-500 mt-3 font-medium text-sm leading-relaxed"
                        >
                            Know someone with a great space? Refer them to Roovo and earn <span className="text-slate-900 font-bold">₹2,000</span> when they host their first stay.
                        </motion.p>
                    </div>
                </div>

                {/* Steps */}
                <div className="px-6 py-10 max-w-md mx-auto space-y-8">
                    {[
                        { title: 'Send an Invite', desc: 'Share your unique referral link with friends via WhatsApp or social media.', icon: <FiShare2 /> },
                        { title: 'They List their Space', desc: 'Your friend creates a listing on Roovo. It takes less than 10 minutes.', icon: <FiTarget /> },
                        { title: 'You Get Paid', desc: 'Once they complete their first booking, you receive ₹2,000 in your wallet.', icon: <FiAward /> },
                    ].map((step, index) => (
                        <motion.div
                            key={index}
                            initial={{ x: -20, opacity: 0 }}
                            whileInView={{ x: 0, opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="flex gap-4"
                        >
                            <div className="flex flex-col items-center">
                                <div className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-indigo-600 shrink-0 z-10">
                                    {step.icon}
                                </div>
                                {index !== 2 && <div className="w-0.5 bg-slate-100 flex-1 my-2" />}
                            </div>
                            <div className="pb-4">
                                <h3 className="font-bold text-slate-900 text-sm">{step.title}</h3>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{step.desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* FAQ / Stats Card (Mock) */}
                <div className="px-5">
                    <div className="bg-indigo-900 rounded-3xl p-6 text-white relative overflow-hidden max-w-md mx-auto">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                        <h4 className="font-bold text-lg relative z-10">Total Earned</h4>
                        <div className="text-4xl font-extrabold mt-1 mb-4 relative z-10">₹0</div>
                        <p className="text-indigo-200 text-xs font-medium relative z-10">Start inviting to see your earnings grow!</p>
                    </div>
                </div>
            </main>

            {/* Bottom Action */}
            <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-slate-100 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
                <button
                    onClick={handleInvite}
                    className="w-full max-w-md mx-auto bg-slate-900 text-white font-bold py-3.5 rounded-xl shadow-xl shadow-slate-200 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                >
                    <FiShare2 />
                    Invite Friends
                </button>
            </div>
        </div>
    );
};

export default ReferHostPage;
