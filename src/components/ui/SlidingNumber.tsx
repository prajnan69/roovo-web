import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

interface SlidingNumberProps {
    value: number;
    className?: string;
}

export default function SlidingNumber({ value, className = "" }: SlidingNumberProps) {
    const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 });
    const display = useTransform(spring, (current) =>
        Math.round(current).toLocaleString('en-IN')
    );

    useEffect(() => {
        spring.set(value);
    }, [spring, value]);

    return <motion.span className={className}>{display}</motion.span>;
}
