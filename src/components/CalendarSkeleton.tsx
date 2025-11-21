import { Skeleton } from "./ui/skeleton";

const CalendarSkeleton = () => {
  return (
    <div className="min-h-screen bg-white text-black p-4 font-sans flex flex-col gap-4">
      {/* Header Skeleton */}
      <Skeleton className="h-8 w-full" />

      {/* Listing Selector Skeleton */}
      <div className="relative h-24">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>

      {/* Calendar Navigation Skeleton */}
      <div className="flex justify-between items-center bg-white rounded-xl p-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>

      {/* Calendar Grid Skeleton */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <div key={index} className="text-xs font-semibold text-gray-400 mb-2">{day}</div>
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-[80px] rounded-lg" />
        ))}
      </div>
    </div>
  );
};

export default CalendarSkeleton;
