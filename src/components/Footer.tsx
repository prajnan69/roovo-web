import React from 'react';
import { useNavigation } from '../hooks/useNavigation';
import { Mail, Phone, MapPin } from 'lucide-react';

const Footer: React.FC = () => {
    const { navigate } = useNavigation();

    return (
        <footer className="px-5 pt-10 pb-8 mt-4">
            {/* Divider */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-8" />

            {/* Address block — compact */}
            <div className="flex flex-col gap-2 mb-8">
                <p className="text-[11px] font-bold text-slate-900 uppercase tracking-widest">Roovo Hospitality Pvt. Ltd.</p>
                <div className="flex items-start gap-2 text-slate-400">
                    <MapPin size={13} className="shrink-0 mt-0.5" />
                    <p className="text-xs font-medium">Bengaluru, Karnataka 560102, India</p>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                    <Mail size={13} className="shrink-0" />
                    <a href="mailto:support@roovo.in" className="text-xs font-medium hover:text-indigo-600 transition-colors">support@roovo.in</a>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                    <Phone size={13} className="shrink-0" />
                    <a href="tel:+917996090696" className="text-xs font-medium hover:text-indigo-600 transition-colors">+91 7996090696</a>
                </div>
            </div>

            {/* Link pills — compact horizontal scroll */}
            <div className="flex flex-wrap gap-2 mb-8">
                {[
                    { label: 'About Us', path: '/about-us' },
                    { label: 'Contact', path: '/contact-us' },
                    { label: 'Privacy', path: '/privacy-policy' },
                    { label: 'Terms', path: '/terms' },
                ].map((link) => (
                    <button
                        key={link.path}
                        onClick={() => navigate(link.path)}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition-all"
                    >
                        {link.label}
                    </button>
                ))}
            </div>

            {/* Copyright */}
            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em]">
                © {new Date().getFullYear()} Roovo Hospitality • Made in India 🇮🇳
            </p>
        </footer>
    );
};

export default Footer;
