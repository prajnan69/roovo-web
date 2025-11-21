
import RoovoLoader from "../../RoovoLoader";

export const Spinner = ({ size = 24, className }: { size?: number; className?: string }) => (
  <div className={`flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
    <RoovoLoader className="w-full h-full" />
  </div>
);
