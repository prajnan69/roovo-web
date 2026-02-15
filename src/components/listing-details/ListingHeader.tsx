import { motion, useTransform } from "framer-motion";
import { ArrowLeft, Share, Heart } from "lucide-react";

interface ListingHeaderProps {
    headerBgOpacity: any;
    headerIconBg: any;
    headerTextColor: any;
    isLiked: boolean;
    onLike: () => void;
    onShare: () => void;
    onBack: () => void;
    listingName?: string;
    isRoovoVerified?: boolean;
}

const ListingHeader = ({
    headerBgOpacity,
    headerIconBg,
    headerTextColor,
    isLiked,
    onLike,
    onShare,
    onBack,
    listingName,
    isRoovoVerified
}: ListingHeaderProps) => {
    // Transform values for the Heart (Wishlist) button
    // Hide it when header becomes opaque (scrolled up) to give space to the title
    const heartOpacity = useTransform(headerBgOpacity, [0.6, 0.9], [1, 0]);
    const heartWidth = useTransform(headerBgOpacity, [0.6, 0.9], [52, 0]);
    const heartScale = useTransform(headerBgOpacity, [0.6, 0.9], [1, 0]);

    return (
        <div className="fixed top-0 left-0 right-0 z-50 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3 px-4 pointer-events-none">
            {/* Background Layer - Animates Opacity */}
            <motion.div
                className="absolute inset-0 bg-white/80 backdrop-blur-md border-b border-black/5 shadow-sm"
                style={{ opacity: headerBgOpacity }}
            />

            <div className="relative flex items-center justify-between w-full z-50 pointer-events-auto">
                <motion.button
                    onClick={onBack}
                    className="transition-all active:scale-95 flex-shrink-0 flex items-center justify-center p-0"
                    style={{
                        backgroundColor: headerIconBg,
                        color: headerTextColor,
                        width: '48px',
                        height: '48px',
                        minWidth: '48px',
                        minHeight: '48px',
                        borderRadius: '999px'
                    }}
                >
                    <ArrowLeft size={32} strokeWidth={2.5} style={{ width: '32px', height: '32px' }} />
                </motion.button>

                {/* Left-Aligned Title & Badge (Next to Back Button) */}
                <motion.div
                    className="flex items-center gap-2 pointer-events-none ml-2 flex-1 min-w-0"
                    style={{ opacity: headerBgOpacity }}
                >
                    <span className="text-md font-bold text-black truncate">
                        {listingName || ""}
                    </span>
                    {isRoovoVerified && (
                        <img src="/verified.png" alt="Verified" className="w-5 h-5 object-contain flex-shrink-0" />
                    )}
                </motion.div>

                <motion.div className="flex gap-3 flex-shrink-0 ml-2">
                    <motion.button
                        onClick={onShare}
                        className="transition-all active:scale-95 flex items-center justify-center p-0"
                        style={{
                            backgroundColor: headerIconBg,
                            color: headerTextColor,
                            width: '48px',
                            height: '48px',
                            minWidth: '48px',
                            minHeight: '48px',
                            borderRadius: '999px'
                        }}
                    >
                        <Share size={28} strokeWidth={2.5} style={{ width: '28px', height: '28px' }} />
                    </motion.button>

                    {/* Animated Wrapper for Heart Button */}
                    <motion.div style={{ width: heartWidth, opacity: heartOpacity, scale: heartScale, overflow: "hidden" }} className="flex justify-center">
                        <motion.button
                            onClick={onLike}
                            className="transition-all active:scale-95 flex items-center justify-center p-0"
                            style={{
                                backgroundColor: headerIconBg,
                                color: headerTextColor,
                                width: '48px',
                                height: '48px',
                                minWidth: '48px',
                                minHeight: '48px',
                                borderRadius: '999px'
                            }}
                        >
                            <Heart size={28} strokeWidth={2.5} style={{ width: '28px', height: '28px' }} className={isLiked ? 'fill-rose-500 text-rose-500' : ''} />
                        </motion.button>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
};

export default ListingHeader;
