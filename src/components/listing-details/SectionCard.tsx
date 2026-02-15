
import { motion } from "framer-motion";
import React from "react";

interface SectionCardProps {
    title: string;
    children: React.ReactNode;
}

const SectionCard = ({ title, children }: SectionCardProps) => (
    <motion.section
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="mb-10"
    >
        <h2 className="text-lg font-bold text-slate-900 mb-4">{title}</h2>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            {children}
        </div>
    </motion.section>
);

export default SectionCard;
