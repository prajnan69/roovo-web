import { useState } from 'react';
import { useNavigation } from '@/hooks/useNavigation';
import { FiChevronLeft, FiCheck } from 'react-icons/fi';

const GlobalPreferences = () => {
    const { back } = useNavigation();
    const [currency] = useState('INR - ₹');
    const [language] = useState('English');


    const Section = ({ title, value }: { title: string, value: string }) => (
        <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <p className="text-base font-semibold text-slate-900 mt-0.5">{value}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                <FiCheck className="text-emerald-500" />
            </div>
        </div>
    );



    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3 flex items-center gap-4">
                <button
                    onClick={back}
                    className="p-2 -ml-2 rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors"
                >
                    <FiChevronLeft size={24} />
                </button>
                <div className="text-xl font-bold text-slate-900">Global Preferences</div>
            </div>

            <div className="max-w-md mx-auto px-5 pt-6 space-y-6">
                <div>
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 ml-2">Preferred Currency</h2>
                    <Section title="Currency" value={currency} />
                    <p className="text-xs text-slate-400 mt-2 ml-2">Currently, Roovo only supports payments in Indian Rupees (INR).</p>
                </div>

                <div>
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 ml-2">Preferred Language</h2>
                    <Section title="Language" value={language} />
                    <p className="text-xs text-slate-400 mt-2 ml-2">Roovo is available in English.</p>
                </div>
            </div>
        </div>
    );
};

export default GlobalPreferences;
