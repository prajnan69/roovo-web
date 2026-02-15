import { motion } from "framer-motion";
import MobileImageCarousel from "@/components/MobileImageCarousel";

interface ListingHeroProps {
    imageOpacity: any;
    imageScale: any;
    images: string[];
    isRoovoVerified?: boolean;
}

const ListingHero = ({ imageOpacity, imageScale, images, isRoovoVerified }: ListingHeroProps) => {
    return (
        <motion.div
            className="fixed top-0 left-0 w-full h-[55vh] z-0"
            style={{ opacity: imageOpacity, scale: imageScale }}
        >
            <MobileImageCarousel images={images || []} />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/5 pointer-events-none" />

            {/* Premium Roovo Verified Badge */}
            {isRoovoVerified && (
                <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                    className="absolute bottom-[13vh] left-5 z-20"
                >
                    <div className="relative overflow-hidden inline-flex items-center gap-3 pl-2.5 pr-5 py-2 rounded-full bg-black/30 backdrop-blur-xl border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.25)] ring-1 ring-white/10">
                        {/* Shimmer Effect */}
                        <motion.div
                            className="absolute top-0 left-0 w-[50%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                            initial={{ x: "-150%" }}
                            animate={{ x: "350%" }}
                            transition={{ repeat: Infinity, duration: 2.5, ease: "linear", repeatDelay: 3 }}
                        />

                        <motion.img
                            initial={{ rotate: -15, scale: 0.8 }}
                            animate={{ rotate: 0, scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.5 }}
                            src="/verified.png"
                            alt="Verified"
                            className="w-8 h-8 object-contain drop-shadow-md z-10"
                        />

                        <div className="flex flex-col z-10">
                            <span className="text-[9px] font-bold tracking-[0.2em] text-white/90 uppercase leading-none mb-0.5 ml-0.5">
                                Official
                            </span>
                            <span className="text-sm font-bold text-white tracking-wide font-sans drop-shadow-sm leading-none bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                                Roovo Verified
                            </span>
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

export default ListingHero;
