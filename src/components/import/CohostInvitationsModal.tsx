import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Users } from "lucide-react";
import { useState } from "react";
import { triggerHaptic } from "@/lib/haptics";

interface Invitation {
    name: string;
    token: string;
    link: string;
}

interface CohostInvitationsModalProps {
    invitations: Invitation[];
    onClose: () => void;
}

export default function CohostInvitationsModal({ invitations, onClose }: CohostInvitationsModalProps) {
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const handleCopy = async (link: string, index: number) => {
        await navigator.clipboard.writeText(link);
        setCopiedIndex(index);
        await triggerHaptic();
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
                >
                    <div className="p-6">
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4 mx-auto text-indigo-600">
                            <Users size={24} />
                        </div>

                        <h2 className="text-xl font-bold text-center text-gray-900 mb-2">Invite Co-hosts</h2>
                        <p className="text-sm text-center text-gray-500 mb-6">
                            We found co-hosts in your listing. Share these unique links to invite them to manage this property.
                        </p>

                        <div className="space-y-3 mb-6">
                            {invitations.map((invite, index) => (
                                <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-semibold text-gray-900 text-sm">{invite.name}</span>
                                        <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full">Co-host</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500 truncate font-mono">
                                            {invite.link}
                                        </div>
                                        <button
                                            onClick={() => handleCopy(invite.link, index)}
                                            className={`p-2 rounded-lg transition-colors ${copiedIndex === index
                                                ? 'bg-green-100 text-green-600'
                                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                                }`}
                                        >
                                            {copiedIndex === index ? <Check size={16} /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full py-3.5 rounded-xl font-bold bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                        >
                            Done
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
