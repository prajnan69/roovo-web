import { motion, useTransform } from "framer-motion";
import { ArrowLeft, Share2, Heart } from "lucide-react";

interface ListingHeaderProps {
    headerBgOpacity: any;      // 0→1 as user scrolls
    isLiked: boolean;
    onLike: () => void;
    onShare: () => void;
    onBack: () => void;
    listingName?: string;
    isRoovoVerified?: boolean;
}

const ListingHeader = ({
    headerBgOpacity,
    isLiked,
    onLike,
    onShare,
    onBack,
    listingName,
}: ListingHeaderProps) => {
    // Title fades in after scroll > 42%
    const titleOpacity = useTransform(headerBgOpacity, [0.42, 0.7], [0, 1]);

    // Exact prototype thresholds: ha > 0.5 → warm solid, else dark glass
    // We use useTransform to interpolate all these:
    const btnBg = useTransform(headerBgOpacity, [0.45, 0.55], ['rgba(0,0,0,0.35)', '#EEEDE9']);
    const btnBorder = useTransform(headerBgOpacity, [0.45, 0.55], ['rgba(255,255,255,0.2)', 'rgba(0,0,0,0.065)']);
    const iconColor = useTransform(headerBgOpacity, [0.45, 0.55], ['#ffffff', '#0A0A09']);

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 }}>
            {/* Glassmorphism background that appears on scroll */}
            <motion.div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(22px)',
                    WebkitBackdropFilter: 'blur(22px)',
                    borderBottom: '1px solid rgba(0,0,0,0.065)',
                    opacity: headerBgOpacity,
                }}
            />
            <div style={{ position: 'relative', padding: 'max(env(safe-area-inset-top), 12px) 18px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                    {/* Back button */}
                    <motion.button
                        onClick={onBack}
                        whileTap={{ scale: 0.92 }}
                        style={{
                            width: 46, height: 46, borderRadius: 16,
                            background: btnBg,
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            border: '1px solid',
                            borderColor: btnBorder,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                        }}
                    >
                        <motion.span style={{ color: iconColor, display: 'flex' }}>
                            <ArrowLeft size={18} strokeWidth={2.2} color="currentColor" />
                        </motion.span>
                    </motion.button>

                    {/* Title — fades in on scroll */}
                    <motion.div
                        style={{
                            flex: 1, textAlign: 'center', opacity: titleOpacity,
                            fontSize: 14, fontWeight: 700, color: '#0A0A09',
                            padding: '0 12px', overflow: 'hidden', textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap', letterSpacing: '-.02em',
                            fontFamily: "'Playfair Display', serif",
                        }}
                    >
                        {listingName || ''}
                    </motion.div>

                    {/* Share + Like buttons */}
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        {/* Share */}
                        <motion.button
                            onClick={onShare}
                            whileTap={{ scale: 0.92 }}
                            style={{
                                width: 46, height: 46, borderRadius: 16,
                                background: btnBg,
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                border: '1px solid',
                                borderColor: btnBorder,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer',
                            }}
                        >
                            <motion.span style={{ color: iconColor, display: 'flex' }}>
                                <Share2 size={17} strokeWidth={1.9} color="currentColor" />
                            </motion.span>
                        </motion.button>

                        {/* Like / Heart */}
                        <motion.button
                            onClick={onLike}
                            whileTap={{ scale: 0.92 }}
                            style={{
                                width: 46, height: 46, borderRadius: 16,
                                background: btnBg,
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                border: '1px solid',
                                borderColor: btnBorder,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer',
                            }}
                        >
                            <motion.span style={{ color: isLiked ? '#EF4444' : iconColor, display: 'flex' }}>
                                <Heart
                                    size={17}
                                    strokeWidth={1.9}
                                    color={isLiked ? '#EF4444' : 'currentColor'}
                                    fill={isLiked ? '#EF4444' : 'none'}
                                />
                            </motion.span>
                        </motion.button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ListingHeader;
