import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../../services/api';
import axios from 'axios';
import { useNavigation } from '../../hooks/useNavigation';
import Toast from '../ui/toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export default function CohostInvitationPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const { navigate } = useNavigation();

    const [isLoading, setIsLoading] = useState(true);
    const [isAccepting, setIsAccepting] = useState(false);
    const [invitation, setInvitation] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        checkUser();
        if (token) {
            fetchInvitation();
        } else {
            setError("Invalid invitation link");
            setIsLoading(false);
        }
    }, [token]);

    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
    };

    const fetchInvitation = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/invitations/${token}`);
            setInvitation(response.data);
        } catch (err: any) {
            console.error("Error fetching invitation:", err);
            setError(err.response?.data?.message || "Failed to load invitation");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAccept = async () => {
        if (!user) {
            // Redirect to login with return URL
            // For now, just show a message or handle login modal
            setToast({ message: "Please log in to accept the invitation", type: "error" });
            return;
        }

        setIsAccepting(true);
        try {
            await axios.post(`${API_BASE_URL}/api/invitations/${token}/accept`, {
                userId: user.id
            });

            setToast({ message: "Invitation accepted! 🎉", type: "success" });
            setTimeout(() => {
                navigate('/hosting/listings');
            }, 1500);
        } catch (err: any) {
            console.error("Error accepting invitation:", err);
            setToast({ message: err.response?.data?.message || "Failed to accept invitation", type: "error" });
            setIsAccepting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white rounded-3xl p-8 shadow-xl max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                        <AlertCircle size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Invitation Error</h2>
                    <p className="text-gray-500 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-3 rounded-xl font-bold bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden"
            >
                {/* Header Image/Icon */}
                <div className="bg-indigo-600 p-8 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700 opacity-90" />
                    <div className="relative z-10">
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg">
                            <Users size={40} />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Co-host Invitation</h1>
                        <p className="text-indigo-100 text-sm">
                            You've been invited to manage a property on Roovo
                        </p>
                    </div>
                </div>

                <div className="p-8">
                    {/* Property Details */}
                    <div className="text-center mb-8">
                        <h2 className="text-lg font-bold text-gray-900 mb-1">
                            {invitation?.listing?.title}
                        </h2>
                        <p className="text-sm text-gray-500 flex items-center justify-center gap-1">
                            {invitation?.listing?.public_address}
                        </p>
                    </div>

                    {/* Inviter Details */}
                    <div className="bg-gray-50 rounded-2xl p-4 mb-8 flex items-center gap-4 border border-gray-100">
                        <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden shrink-0">
                            {invitation?.inviter?.avatar_url ? (
                                <img
                                    src={invitation.inviter.avatar_url}
                                    alt={invitation.inviter.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-lg">
                                    {invitation?.inviter?.name?.charAt(0)}
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Invited by</p>
                            <p className="font-bold text-gray-900">{invitation?.inviter?.name}</p>
                        </div>
                    </div>

                    {/* Action */}
                    {user ? (
                        <button
                            onClick={handleAccept}
                            disabled={isAccepting}
                            className="w-full py-4 rounded-xl font-bold bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isAccepting ? (
                                <Loader2 className="animate-spin" />
                            ) : (
                                <>
                                    Accept Invitation <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-center text-gray-500 mb-2">
                                Log in or sign up to accept this invitation
                            </p>
                            <button
                                onClick={() => navigate('/login')} // Assuming /login exists or opens modal
                                className="w-full py-4 rounded-xl font-bold bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                            >
                                Log In / Sign Up
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>

            {toast && (
                <Toast
                    message={toast.message}
                    show={!!toast}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}
