
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Info } from "lucide-react";
import { useEffect } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  isVisible: boolean;
  onClose: () => void;
  position?: "top" | "bottom";
}

export const Toast = ({
  message,
  type = "success",
  isVisible,
  onClose,
  position = "top"
}: ToastProps) => {

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: position === "top" ? -20 : 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: position === "top" ? -20 : 20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={`fixed left-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl backdrop-blur-md border ${position === "top" ? "top-4" : "bottom-24"
            } ${type === "success"
              ? "bg-emerald-50/90 border-emerald-100 text-emerald-800"
              : type === "error"
                ? "bg-red-50/90 border-red-100 text-red-800"
                : "bg-white/90 border-gray-100 text-gray-800"
            }`}
        >
          <div className={`p-1 rounded-full ${type === "success" ? "bg-emerald-100" : type === "error" ? "bg-red-100" : "bg-gray-100"
            }`}>
            {type === "success" && <CheckCircle size={16} className="text-emerald-600" />}
            {type === "error" && <XCircle size={16} className="text-red-600" />}
            {type === "info" && <Info size={16} className="text-gray-600" />}
          </div>
          <p className="text-sm font-semibold">{message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
