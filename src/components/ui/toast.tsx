import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useEffect } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  isVisible?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  position?: "top" | "bottom";
}

export const Toast = ({
  message,
  type = "success",
  isVisible,
  isOpen,
  onClose,
  position = "top"
}: ToastProps) => {
  const visible = isVisible !== undefined ? isVisible : (isOpen !== undefined ? isOpen : false);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  return (
    <AnimatePresence>
      {visible && message && (
        <motion.div
          initial={{ opacity: 0, y: position === "top" ? -25 : 25, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: position === "top" ? -25 : 25, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 450, damping: 28 }}
          className={`fixed left-4 right-4 max-w-md mx-auto z-[100] flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border ${
            position === "top" ? "top-[max(1rem,env(safe-area-inset-top))]" : "bottom-[max(1.5rem,env(safe-area-inset-bottom))]"
          } ${
            type === "success"
              ? "bg-slate-900/95 border-emerald-500/50 text-white shadow-emerald-950/40"
              : type === "error"
              ? "bg-slate-900/95 border-red-500/50 text-white shadow-red-950/40"
              : "bg-slate-900/95 border-slate-700/80 text-white shadow-slate-950/40"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-1.5 rounded-xl shrink-0 ${
              type === "success" 
                ? "bg-emerald-500/20 text-emerald-400" 
                : type === "error" 
                ? "bg-red-500/20 text-red-400" 
                : "bg-indigo-500/20 text-indigo-400"
            }`}>
              {type === "success" && <CheckCircle2 size={18} />}
              {type === "error" && <AlertCircle size={18} />}
              {type === "info" && <Info size={18} />}
            </div>
            <p className="text-xs font-bold leading-snug text-white">{message}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors shrink-0 cursor-pointer"
          >
            <X size={15} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
