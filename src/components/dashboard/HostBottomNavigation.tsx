"use client";

import { useRef, useEffect, useState, useLayoutEffect } from "react";
import { motion, useScroll, useTransform, MotionValue } from "framer-motion";
import { useNavigation } from "@/hooks/useNavigation";
import { triggerHaptic } from "@/lib/haptics";

// Helper to determine window width safely
const useWindowSize = () => {
    const [size, setSize] = useState(() => {
        if (typeof window !== 'undefined') {
            return [window.innerWidth, window.innerHeight];
        }
        return [0, 0];
    });
    useEffect(() => {
        function updateSize() {
            setSize([window.innerWidth, window.innerHeight]);
        }
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);
    return size;
};

const NAV_ITEMS = [
    { id: "overview", label: "Overview", path: "/hosting" },
    { id: "calendar", label: "Calendar", path: "/hosting/calendar" },
    { id: "listings", label: "Listings", path: "/hosting/listings" },
    { id: "messages", label: "Messages", path: "/hosting/messages" },
    { id: "bookings", label: "Bookings", path: "/hosting/bookings" },
    { id: "payouts", label: "Earnings", path: "/hosting/payouts" },
];

// Module-level variable to persist scroll position across unmount/remount
let globalLastScrollLeft: number | null = null;

const ITEM_WIDTH = 100;
const ITEM_GAP = 10;
const TOTAL_ITEM_WIDTH = ITEM_WIDTH + ITEM_GAP;

function WheelItem({
    item,
    index,
    scrollX,
    onClick,
    isActive
}: {
    item: typeof NAV_ITEMS[0];
    index: number;
    scrollX: MotionValue<number>;
    onClick: () => void;
    isActive: boolean;
}) {
    const [windowWidth] = useWindowSize();
    const containerCenter = windowWidth / 2;

    const itemCenter = (containerCenter - TOTAL_ITEM_WIDTH / 2) + (index * TOTAL_ITEM_WIDTH) + (TOTAL_ITEM_WIDTH / 2);

    const distanceFromCenter = useTransform(scrollX, (value) => {
        const currentViewportCenter = value + containerCenter;
        return currentViewportCenter - itemCenter;
    });

    const rotateY = useTransform(distanceFromCenter, [-200, 0, 200], [45, 0, -45]); // 3D rotation
    const opacity = useTransform(distanceFromCenter, [-250, 0, 250], [0.4, 1, 0.4]);
    const scale = useTransform(distanceFromCenter, [-200, 0, 200], [0.8, 1.1, 0.8]);
    const y = useTransform(distanceFromCenter, [-200, 0, 200], [5, -5, 5]); // Arch effect
    const filter = useTransform(distanceFromCenter, [-200, -50, 0, 50, 200], ["blur(3px)", "blur(0px)", "blur(0px)", "blur(0px)", "blur(3px)"]);

    return (
        <motion.div
            style={{
                width: ITEM_WIDTH,
                marginRight: ITEM_GAP,
                rotateY,
                opacity,
                scale,
                y,
                filter,
                transformStyle: "preserve-3d",
            }}
            className={`flex flex-col items-center justify-center shrink-0 h-20 perspective-1000 cursor-pointer snap-center relative`}
            onClick={onClick}
        >
            <div className={`px-2 py-2 rounded-xl transition-all duration-300 flex items-center justify-center w-full ${isActive
                ? "text-indigo-700 font-extrabold"
                : "text-gray-400 font-semibold hover:text-gray-600"
                }`}>
                <span className={`text-xl tracking-tight whitespace-nowrap`}>
                    {item.label}
                </span>
            </div>
            {isActive && (
                <motion.div
                    layoutId="active-dot"
                    className="w-1.5 h-1.5 bg-indigo-600 rounded-full mt-2 absolute bottom-2"
                />
            )}
        </motion.div>
    );
}

export default function HostBottomNavigation() {
    const { navigate, pathname } = useNavigation();
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollX } = useScroll({ container: containerRef });

    const [windowWidth] = useWindowSize();
    const paddingX = Math.max(0, (windowWidth - ITEM_WIDTH) / 2);

    const isProgrammaticScroll = useRef(false);
    const targetScrollRef = useRef<number | null>(null);

    // Restore scroll position before paint to avoid flicker
    useLayoutEffect(() => {
        if (containerRef.current) {
            const activeIndex = NAV_ITEMS.findIndex(item =>
                pathname === item.path || (item.path === '/hosting' && pathname === '/hosting/')
            );
            if (activeIndex !== -1) {
                const targetScroll = activeIndex * TOTAL_ITEM_WIDTH;
                isProgrammaticScroll.current = true;
                if (globalLastScrollLeft !== null) {
                    containerRef.current.scrollLeft = globalLastScrollLeft;
                } else {
                    containerRef.current.scrollLeft = targetScroll;
                    globalLastScrollLeft = targetScroll;
                }
                setTimeout(() => {
                    isProgrammaticScroll.current = false;
                }, 50);
            }
        }
    }, []);

    // Sync scroll to active route on mount/update
    useEffect(() => {
        if (containerRef.current && windowWidth > 0) {
            const activeIndex = NAV_ITEMS.findIndex(item =>
                pathname === item.path || (item.path === '/hosting' && pathname === '/hosting/')
            );

            if (activeIndex !== -1) {
                const targetScroll = activeIndex * TOTAL_ITEM_WIDTH;
                if (Math.abs(containerRef.current.scrollLeft - targetScroll) > 10) {
                    isProgrammaticScroll.current = true;
                    targetScrollRef.current = targetScroll;
                    containerRef.current.scrollTo({
                        left: targetScroll,
                        behavior: 'smooth'
                    });
                }
            }
        }
    }, [pathname, windowWidth]);


    const lastHapticIndex = useRef(-1);

    useEffect(() => {
        return scrollX.on("change", (latest) => {
            const index = Math.round(latest / TOTAL_ITEM_WIDTH);
            if (index !== lastHapticIndex.current && index >= 0 && index < NAV_ITEMS.length) {
                triggerHaptic();
                lastHapticIndex.current = index;
            }
        });
    }, [scrollX]);

    const handleItemClick = (path: string) => {
        navigate(path);
        triggerHaptic();
    };

    const handleScrollEnd = () => {
        if (!containerRef.current) return;

        const currentScroll = containerRef.current.scrollLeft;
        const index = Math.round(currentScroll / TOTAL_ITEM_WIDTH);

        if (index >= 0 && index < NAV_ITEMS.length) {
            const item = NAV_ITEMS[index];
            const isCurrent = pathname === item.path || (item.path === '/hosting' && pathname === '/hosting/');
            if (!isCurrent) {
                navigate(item.path);
            }
        }
    };

    let scrollTimeout: NodeJS.Timeout;
    const onScroll = () => {
        if (containerRef.current) {
            const currentScroll = containerRef.current.scrollLeft;
            globalLastScrollLeft = currentScroll;

            if (isProgrammaticScroll.current && targetScrollRef.current !== null) {
                clearTimeout(scrollTimeout);
                if (Math.abs(currentScroll - targetScrollRef.current) < 5) {
                    isProgrammaticScroll.current = false;
                    targetScrollRef.current = null;
                }
                return;
            }
        }
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(handleScrollEnd, 150);
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
            {/* Gradient Mask */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-white via-white/80 to-transparent h-32 bottom-0" />

            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white via-white/50 to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white via-white/50 to-transparent z-10" />

            <div
                ref={containerRef}
                onScroll={onScroll}
                onTouchStart={() => {
                    isProgrammaticScroll.current = false;
                    targetScrollRef.current = null;
                }}
                onMouseDown={() => {
                    isProgrammaticScroll.current = false;
                    targetScrollRef.current = null;
                }}
                onWheel={() => {
                    isProgrammaticScroll.current = false;
                    targetScrollRef.current = null;
                }}
                className="relative flex items-end overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-safe-bottom h-32 pointer-events-auto"
                style={{
                    perspective: 600,
                    perspectiveOrigin: 'center bottom',
                    paddingLeft: paddingX,
                    paddingRight: paddingX,
                }}
            >
                {NAV_ITEMS.map((item, index) => {
                    const isActive = pathname === item.path || (item.path === '/hosting' && pathname === '/hosting/');
                    return (
                        <WheelItem
                            key={item.id}
                            item={item}
                            index={index}
                            scrollX={scrollX}
                            onClick={() => handleItemClick(item.path)}
                            isActive={isActive}
                        />
                    );
                })}
            </div>
        </div>
    );
}
