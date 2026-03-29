import { useState, useEffect } from 'react';
import { useNavigation } from '@/hooks/useNavigation';
import { FiChevronLeft, FiCheck } from 'react-icons/fi';
import { API_BASE_URL } from '@/services/api';

const GlobalPreferences = () => {
    const { back } = useNavigation();
    const [currency] = useState('INR - ₹');
    const [language] = useState('English');
    const [manualPaymentsEnabled, setManualPaymentsEnabled] = useState(true);
    const [isLoadingToggle, setIsLoadingToggle] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/settings`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && typeof data.manual_payments_enabled === 'boolean') {
                        setManualPaymentsEnabled(data.manual_payments_enabled);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch settings:", error);
            }
        };
        fetchSettings();
    }, []);

    const toggleManualPayments = async () => {
        const newValue = !manualPaymentsEnabled;
        setManualPaymentsEnabled(newValue);
        setIsLoadingToggle(true);
        try {
            await fetch(`${API_BASE_URL}/api/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ manual_payments_enabled: newValue })
            });
        } catch (error) {
            console.error("Failed to update settings:", error);
            // Revert on failure
            setManualPaymentsEnabled(!newValue);
        } finally {
            setIsLoadingToggle(false);
        }
    };


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

    const ToggleSection = ({ title, value, onToggle, disabled }: { title: string, value: boolean, onToggle: () => void, disabled: boolean }) => (
        <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between">
            <div className="flex-1 pr-4">
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">When ON, users will see a "Pay at Property" screen and payments will be handled manually offline. When OFF, users will pay through the Cashfree payment gateway.</p>
            </div>
            <button
                onClick={onToggle}
                disabled={disabled}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${value ? 'bg-indigo-600' : 'bg-slate-200'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
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

            <div className="max-w-md mx-auto px-5 pt-6 pb-12 space-y-6">
                <div>
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 ml-2">Checkout Settings</h2>
                    <ToggleSection 
                        title="Manual Payments (Pay at Property)" 
                        value={manualPaymentsEnabled} 
                        onToggle={toggleManualPayments} 
                        disabled={isLoadingToggle} 
                    />
                </div>

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
