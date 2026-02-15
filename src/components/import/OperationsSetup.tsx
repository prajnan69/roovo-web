import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { useGoogleMapsLoader } from "../../lib/googleMaps";
import { MapPin, User, Loader2, ArrowRight, ShieldCheck, UserPlus, PartyPopper } from "lucide-react";
import Toast from "../ui/toast";
import { triggerErrorHaptic } from "@/lib/haptics";
import { Contacts } from '@capacitor-community/contacts';

interface OperationsData {
    exactLocation: {
        lat: number;
        lng: number;
        directionsTip: string;
    };
    caretaker: {
        hasCaretaker: boolean;
        name: string;
        phone: string;
        languages: string[];
        livesOnProperty: boolean;
    };
    wifi: {
        hasWifi: boolean;
        ssid: string;
        password: string;
    };
    access: {
        type: 'smart_lock' | 'keys';
        smartLockCode?: string;
        keyProvider?: {
            name: string;
            phone: string;
        };
    };
    checkIn: {
        type: 'caretaker' | 'self' | 'security';
        instructions: string;
    };
    parking: {
        twoWheeler: 'available' | 'not_available';
        fourWheeler: 'available' | 'not_available';
    };
    party: {
        allowed: boolean;
        timeRestriction: 'no_restriction' | 'until_10pm' | 'until_11pm' | 'until_12am';
    };
}

interface OperationsSetupProps {
    initialLocation?: { lat: number; lng: number };
    onNext: (data: OperationsData) => void;
    onBack: () => void;
}

const mapContainerStyle = {
    width: '100%',
    height: '200px',
    borderRadius: '16px',
};

const LANGUAGES = ['Hindi', 'English', 'Kannada', 'Tamil', 'Telugu', 'Malayalam'];

export default function OperationsSetup({ initialLocation, onNext, onBack }: OperationsSetupProps) {
    const [markerPosition, setMarkerPosition] = useState(
        initialLocation || { lat: 13.25428, lng: 77.60405 }
    );
    const { isLoaded, loadError } = useGoogleMapsLoader();
    const [mapLoadError, setMapLoadError] = useState(false);

    if (loadError && !mapLoadError) setMapLoadError(true);

    const [formData, setFormData] = useState<OperationsData>({
        exactLocation: {
            lat: markerPosition.lat,
            lng: markerPosition.lng,
            directionsTip: '',
        },
        caretaker: {
            hasCaretaker: true,
            name: '',
            phone: '',
            languages: [],
            livesOnProperty: false,
        },
        wifi: {
            hasWifi: true,
            ssid: '',
            password: '',
        },
        access: {
            type: 'smart_lock',
            smartLockCode: '',
        },
        checkIn: {
            type: 'caretaker',
            instructions: '',
        },
        parking: {
            twoWheeler: 'not_available',
            fourWheeler: 'not_available',
        },
        party: {
            allowed: false,
            timeRestriction: 'no_restriction',
        },
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        if (type === 'error') triggerErrorHaptic();
        setTimeout(() => setToast(null), 3000); // Wait 3s
    };

    const handleMapClick = (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
            setMarkerPosition(newPos);
            setFormData(prev => ({
                ...prev,
                exactLocation: { ...prev.exactLocation, lat: newPos.lat, lng: newPos.lng },
            }));
        }
    };

    const validatePhone = (phone: string): boolean => /^[6-9]\d{9}$/.test(phone);

    const handlePhoneChange = (phone: string, field: 'caretaker' | 'keyProvider') => {
        const cleaned = phone.replace(/\D/g, '');
        if (field === 'caretaker') {
            setFormData(prev => ({ ...prev, caretaker: { ...prev.caretaker, phone: cleaned } }));
        } else {
            setFormData(prev => ({ ...prev, access: { ...prev.access, keyProvider: { ...prev.access.keyProvider!, phone: cleaned } } }));
        }
    };

    const handleSelectContact = async (target: 'caretaker' | 'keyProvider') => {
        try {
            const permission = await Contacts.requestPermissions();
            if (permission.contacts === 'granted') {
                const result = await Contacts.getContacts({ projection: { name: true, phones: true } });
                if (result.contacts && result.contacts.length > 0) {
                    const contact = result.contacts[0];
                    const name = contact.name?.display || contact.name?.given || '';
                    let phone = contact.phones?.[0]?.number || '';
                    phone = phone.replace(/[\s\-\(\)]/g, '').replace(/^(\+91|91)/, '').slice(-10);

                    if (validatePhone(phone)) {
                        if (target === 'caretaker') {
                            setFormData(prev => ({
                                ...prev,
                                caretaker: { ...prev.caretaker, name, phone },
                            }));
                        } else {
                            setFormData(prev => ({
                                ...prev,
                                access: { ...prev.access, keyProvider: { ...prev.access.keyProvider!, name, phone } }
                            }));
                        }
                        showToast('Contact selected', 'success');
                    } else {
                        showToast('Invalid phone number', 'error');
                    }
                }
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = () => {
        const newErrors: Record<string, string> = {};

        if (formData.caretaker.hasCaretaker) {
            if (!formData.caretaker.name.trim()) newErrors.name = 'Name is required';
            if (!validatePhone(formData.caretaker.phone)) newErrors.caretakerPhone = 'Valid phone required';
            if (formData.caretaker.languages.length === 0) newErrors.languages = 'Select language';
        }

        if (formData.access.type === 'keys') {
            if (!formData.access.keyProvider?.name?.trim()) newErrors.keyProviderName = 'Name is required';
            if (!validatePhone(formData.access.keyProvider?.phone || '')) newErrors.keyProviderPhone = 'Valid phone required';
        }

        if (!formData.checkIn.instructions.trim()) newErrors.instructions = 'Instructions required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            showToast("Please complete required fields", "error");

            // Scroll to error
            const firstError = document.querySelector('.text-red-500');
            firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        onNext(formData);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-32">
            {/* Header - Consistent with PricingWizard */}
            <div className="bg-white border-b px-5 py-4 sticky top-0 z-30 transition-all">
                <div className="flex items-center justify-between">
                    <button
                        onClick={onBack}
                        className="text-indigo-600 font-semibold flex items-center gap-1 active:opacity-70 transition-opacity"
                    >
                        Back
                    </button>
                    {/* <div className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">Step 3 of 5</div> */}
                </div>
                <div className="mt-3">
                    <div className="text-2xl font-bold text-gray-900">Operations Setup</div>
                    <p className="text-sm text-gray-500">How guests interact with your property</p>
                </div>
            </div>

            <div className=" max-w-xl mx-auto space-y-6 pt-5 px-5">

                {/* Privacy Badge */}
                <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <ShieldCheck size={20} className="text-teal-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-gray-900">Secure & Private</p>
                        <p className="text-xs text-gray-500 mt-0.5">Contact details are encrypted and only shared with confirmed guests.</p>
                    </div>
                </div>

                {/* SECTION: LOCATION */}
                <section>
                    <SectionLabel icon={MapPin} label="Exact Location" />
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
                        <div className="p-1">
                            {!isLoaded ? (
                                <div className="h-[200px] flex items-center justify-center bg-gray-50 rounded-xl m-1">
                                    <Loader2 className="animate-spin text-gray-400" />
                                </div>
                            ) : (
                                <GoogleMap
                                    mapContainerStyle={mapContainerStyle}
                                    center={markerPosition}
                                    zoom={17}
                                    onClick={handleMapClick}
                                    options={{ disableDefaultUI: true, gestureHandling: 'greedy' }}
                                >
                                    <Marker position={markerPosition} draggable onDragEnd={handleMapClick} />
                                </GoogleMap>
                            )}
                        </div>
                        <div className="px-4 py-3 border-t border-gray-100">
                            <input
                                type="text"
                                placeholder="Add a direction tip (e.g. 'Blue gate on left')"
                                className="w-full text-sm outline-none placeholder:text-gray-400"
                                value={formData.exactLocation.directionsTip}
                                onChange={(e) => setFormData(p => ({ ...p, exactLocation: { ...p.exactLocation, directionsTip: e.target.value } }))}
                            />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 px-2">Drag the pin to mark your main entrance exactly.</p>
                </section>


                {/* SECTION: CARETAKER */}
                <section>
                    <div className="flex items-center justify-between mb-2 px-1">
                        <SectionLabel icon={User} label="Caretaker" />
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <span className="text-sm font-medium text-gray-900">Has Caretaker?</span>
                            <Switch
                                checked={formData.caretaker.hasCaretaker}
                                onCheckedChange={(c) => setFormData(p => ({ ...p, caretaker: { ...p.caretaker, hasCaretaker: c } }))}
                            />
                        </div>

                        <AnimatePresence>
                            {formData.caretaker.hasCaretaker && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="bg-gray-50/50"
                                >
                                    <div className="px-4 py-3 space-y-4">
                                        <div className="space-y-3">
                                            <InputRow
                                                label="Name"
                                                value={formData.caretaker.name}
                                                onChange={(val) => setFormData(p => ({ ...p, caretaker: { ...p.caretaker, name: val } }))}
                                                error={errors.name}
                                                placeholder="e.g. Ramesh"
                                            />
                                            <div className="relative">
                                                <InputRow
                                                    label="Mobile"
                                                    value={formData.caretaker.phone}
                                                    onChange={(val) => handlePhoneChange(val, 'caretaker')}
                                                    error={errors.caretakerPhone}
                                                    type="tel"
                                                    placeholder="10-digit number"
                                                />
                                                <button onClick={() => handleSelectContact('caretaker')} className="absolute right-0 top-6 p-2 text-indigo-600">
                                                    <UserPlus size={18} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Languages Spoken</label>
                                            <div className="flex flex-wrap gap-2">
                                                {LANGUAGES.map(lang => (
                                                    <button
                                                        key={lang}
                                                        onClick={() => {
                                                            const current = formData.caretaker.languages;
                                                            const updated = current.includes(lang) ? current.filter(l => l !== lang) : [...current, lang];
                                                            setFormData(p => ({ ...p, caretaker: { ...p.caretaker, languages: updated } }));
                                                        }}
                                                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${formData.caretaker.languages.includes(lang)
                                                            ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                                                    >
                                                        {lang}
                                                    </button>
                                                ))}
                                            </div>
                                            {errors.languages && <p className="text-red-500 text-xs mt-1">{errors.languages}</p>}
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-2">
                                            <span className="text-sm text-gray-600">Lives on property?</span>
                                            <Switch
                                                checked={formData.caretaker.livesOnProperty}
                                                onCheckedChange={(c) => setFormData(p => ({ ...p, caretaker: { ...p.caretaker, livesOnProperty: c } }))}
                                                small
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </section>


                {/* SECTION: WIFI & PARKING */}
                <section className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-100">

                        {/* WiFi */}
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-bold text-gray-900">WiFi Available</span>
                                <Switch
                                    checked={formData.wifi.hasWifi}
                                    onCheckedChange={(c) => setFormData(p => ({ ...p, wifi: { ...p.wifi, hasWifi: c } }))}
                                />
                            </div>
                            <AnimatePresence>
                                {formData.wifi.hasWifi && (
                                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                        <div className="space-y-3 pb-2">
                                            <input
                                                type="text" placeholder="WiFi SSID (Name)"
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 transition-colors"
                                                value={formData.wifi.ssid}
                                                onChange={(e) => setFormData(p => ({ ...p, wifi: { ...p.wifi, ssid: e.target.value } }))}
                                            />
                                            <input
                                                type="text" placeholder="Password (Optional)"
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 transition-colors"
                                                value={formData.wifi.password}
                                                onChange={(e) => setFormData(p => ({ ...p, wifi: { ...p.wifi, password: e.target.value } }))}
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Parking 2W */}
                        <div className="p-4 flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">2-Wheeler Parking</span>
                            <Switch
                                checked={formData.parking.twoWheeler === 'available'}
                                onCheckedChange={(c) => setFormData(p => ({ ...p, parking: { ...p.parking, twoWheeler: c ? 'available' : 'not_available' } }))}
                            />
                        </div>
                        {/* Parking 4W */}
                        <div className="p-4 flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Car Parking</span>
                            <Switch
                                checked={formData.parking.fourWheeler === 'available'}
                                onCheckedChange={(c) => setFormData(p => ({ ...p, parking: { ...p.parking, fourWheeler: c ? 'available' : 'not_available' } }))}
                            />
                        </div>

                    </div>
                </section>

                {/* SECTION: PARTY ALLOWANCE */}
                <section>
                    <div className="flex items-center justify-between mb-2 px-1">
                        <SectionLabel icon={PartyPopper} label="Party Allowance" />
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900">Allow Parties?</span>
                                <span className="text-xs text-gray-500">Guests can host events</span>
                            </div>
                            <Switch
                                checked={formData.party.allowed}
                                onCheckedChange={(c) => setFormData(p => ({ ...p, party: { ...p.party, allowed: c } }))}
                            />
                        </div>

                        <AnimatePresence>
                            {formData.party.allowed && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="bg-gray-50/50"
                                >
                                    <div className="p-4">
                                        <label className="text-xs font-semibold text-gray-500 uppercase mb-3 block">Time Restriction</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'no_restriction', label: 'Anytime' },
                                                { id: 'until_10pm', label: 'Until 10 PM' },
                                                { id: 'until_11pm', label: 'Until 11 PM' },
                                                { id: 'until_12am', label: 'Until 12 AM' }
                                            ].map((opt) => (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => setFormData(p => ({ ...p, party: { ...p.party, timeRestriction: opt.id as any } }))}
                                                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${formData.party.timeRestriction === opt.id
                                                        ? 'bg-white border-indigo-600 text-indigo-600 shadow-sm ring-1 ring-indigo-600'
                                                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                                        }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </section>
                <section>
                    <SectionLabel icon={ArrowRight} label="Access & Check In" />
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-100">
                        {/* Tabs */}
                        <div className="flex p-1 bg-gray-50 m-3 rounded-xl">
                            {['smart_lock', 'keys'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setFormData(p => ({ ...p, access: { ...p.access, type: tab as any } }))}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${formData.access.type === tab ? 'bg-white shadow text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    {tab === 'smart_lock' ? 'Smart Lock' : 'Physcial Key'}
                                </button>
                            ))}
                        </div>

                        <div className="p-4 pt-0">
                            <AnimatePresence mode="wait">
                                {formData.access.type === 'smart_lock' ? (
                                    <motion.div key="lock" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        <input
                                            type="text"
                                            placeholder="Enter Door Code (Optional)"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 transition-colors placeholder:text-gray-400"
                                            value={formData.access.smartLockCode}
                                            onChange={(e) => setFormData(p => ({ ...p, access: { ...p.access, smartLockCode: e.target.value } }))}
                                        />
                                    </motion.div>
                                ) : (
                                    <motion.div key="keys" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                                        <InputRow
                                            label="Who has keys?"
                                            value={formData.access.keyProvider?.name || ''}
                                            onChange={(v) => setFormData(p => ({ ...p, access: { ...p.access, keyProvider: { ...p.access.keyProvider!, name: v } } }))}
                                            placeholder="e.g. Guard"
                                            error={errors.keyProviderName}
                                        />
                                        <div className="relative">
                                            <InputRow
                                                label="Their Phone"
                                                value={formData.access.keyProvider?.phone || ''}
                                                onChange={(v) => handlePhoneChange(v, 'keyProvider')}
                                                placeholder="10-digit number"
                                                error={errors.keyProviderPhone}
                                                type="tel"
                                            />
                                            <button onClick={() => handleSelectContact('keyProvider')} className="absolute right-0 top-6 p-2 text-indigo-600">
                                                <UserPlus size={18} />
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="p-4 border-t border-gray-100">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Arrival Instructions</label>
                            <textarea
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 transition-colors resize-none placeholder:text-gray-400"
                                placeholder="e.g. 'Key is under the mat', 'Enter 1234'"
                                rows={3}
                                value={formData.checkIn.instructions}
                                onChange={(e) => setFormData(p => ({ ...p, checkIn: { ...p.checkIn, instructions: e.target.value } }))}
                            />
                            {errors.instructions && <p className="text-red-500 text-xs mt-1">{errors.instructions}</p>}
                        </div>


                    </div>
                </section>

                <div className="h-10"></div>
            </div >

            {/* Sticky Footer */}
            < div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-gray-100 z-40 pb-safe-bottom" >
                <div className="max-w-xl mx-auto">
                    <button
                        onClick={handleSubmit}
                        className="w-full py-4 bg-indigo-600 active:bg-indigo-700 text-white rounded-full font-bold text-lg shadow-lg shadow-indigo-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        Finish Setup
                        <ArrowRight size={20} />
                    </button>
                </div>
            </div >

            {toast && (
                <Toast
                    message={toast.message}
                    isVisible={!!toast}
                    type={toast.type}
                    onClose={() => setToast(null)}
                    position="bottom"
                />
            )
            }
        </div >
    );
}

// Helper Components

function SectionLabel({ icon: Icon, label }: { icon: any, label: string }) {
    return (
        <label className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2 px-1">
            <Icon size={16} className="text-gray-500" /> {label}
        </label>
    );
}


interface InputRowProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    error?: string;
    type?: string;
}

function InputRow({ label, value, onChange, placeholder, error, type = "text" }: InputRowProps) {
    return (
        <div className="w-full">
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={`w-full bg-white border ${error ? 'border-red-300' : 'border-gray-200'} rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all`}
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    )
}

import { Switch as HeadlessSwitch } from '@headlessui/react'

function Switch({ checked, onCheckedChange, small }: { checked: boolean; onCheckedChange: (c: boolean) => void, small?: boolean }) {
    const height = small ? 28 : 32;
    const width = small ? 50 : 58;
    const thumbSize = small ? 24 : 28;
    const translateX = width - thumbSize - 4; // 4px for padding (2px on each side)

    return (
        <HeadlessSwitch
            checked={checked}
            onChange={onCheckedChange}
            className={`${checked ? 'bg-indigo-500' : 'bg-gray-200'}
                relative inline-flex shrink-0 cursor-pointer rounded-full 
                transition-colors duration-200 ease-in-out 
                focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50`}
            style={{ height: `${height}px`, width: `${width}px`, padding: '2px' }}
        >
            <span className="sr-only">Toggle setting</span>
            <span
                aria-hidden="true"
                className={`${checked ? `translate-x-[${translateX}px]` : 'translate-x-0'}
                    pointer-events-none inline-block transform rounded-full bg-white 
                    shadow-md ring-0 transition-transform duration-200 ease-in-out`}
                style={{
                    height: `${thumbSize}px`,
                    width: `${thumbSize}px`,
                    transform: checked ? `translateX(${translateX}px)` : 'translateX(0)'
                }}
            />
        </HeadlessSwitch>
    );
}
