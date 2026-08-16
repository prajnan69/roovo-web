import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, LayoutGrid, BedDouble, ChevronDown, CheckCircle2, Home } from "lucide-react";
import { Drawer } from "vaul";
import { useBackCloseable } from "@/hooks/useBackCloseable";

interface PhotoSortingStepProps {
    photos: string[];
    bedroomCount: number;
    onNext: (assignments: Record<string, string>) => void;
    onBack: () => void;
}



export default function PhotoSortingStep({ photos, bedroomCount, onNext, onBack }: PhotoSortingStepProps) {
    // Default all to 'common'
    const [assignments, setAssignments] = useState<Record<string, string>>(
        photos.reduce((acc, url) => ({ ...acc, [url]: "common" }), {})
    );

    const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    // Hardware back closes the drawer instead of navigating
    useBackCloseable(isDrawerOpen, () => setIsDrawerOpen(false));
    const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

    // Helpers
    const toggleSelection = (url: string) => {
        setSelectedPhotos(prev =>
            prev.includes(url) ? prev.filter(p => p !== url) : [...prev, url]
        );
    };

    const handleAssign = (target: string) => {
        setAssignments(prev => {
            const next = { ...prev };
            selectedPhotos.forEach(url => {
                next[url] = target;
            });
            return next;
        });
        setSelectedPhotos([]);
        setIsDrawerOpen(false);
    };

    const handleComplete = () => {
        setShowSuccessAnimation(true);
        // Navigate after animation
        setTimeout(() => {
            onNext(assignments);
        }, 3500);
    };

    const categories = [
        { id: 'common', label: 'Common Areas', icon: LayoutGrid },
        ...Array.from({ length: bedroomCount }, (_, i) => ({
            id: `room_${i + 1}`,
            label: `Bedroom ${i + 1}`,
            icon: BedDouble
        }))
    ];



    // Group photos for rendering
    const groupedPhotos = categories.map(cat => ({
        ...cat,
        photos: photos.filter(url => assignments[url] === cat.id)
    }));

    if (showSuccessAnimation) {
        return <SortingSuccessAnimation bedroomCount={bedroomCount} />;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            {/* Header */}
            <div className="bg-white border-b px-5 py-4 sticky top-0 z-10 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <button onClick={onBack} className="text-gray-500 font-medium">Back</button>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                        Smart Inventory
                    </span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Sort Photos</h2>
                <p className="text-sm text-gray-500">
                    Select photos to assign them to specific rooms.
                </p>
            </div>

            {/* Grouped Grid */}
            <div className="flex-1 p-4 space-y-8 overflow-y-auto pb-32">
                {groupedPhotos.map((Group) => (
                    <div key={Group.id} className="space-y-3">
                        {/* Section Header */}
                        <div className="flex items-center gap-2 sticky top-0 bg-gray-50/95 backdrop-blur-sm p-2 rounded-lg z-0">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                <Group.icon size={16} />
                            </div>
                            <h3 className="font-bold text-gray-800">{Group.label}</h3>
                            <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                                {Group.photos.length}
                            </span>
                        </div>

                        {/* Photos Grid */}
                        {Group.photos.length === 0 ? (
                            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 text-sm">
                                No photos assigned yet
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {Group.photos.map((url) => {
                                    const isSelected = selectedPhotos.includes(url);
                                    return (
                                        <motion.div
                                            layoutId={url}
                                            key={url}
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            onClick={() => toggleSelection(url)}
                                            className={`aspect-[4/3] relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${isSelected ? 'border-indigo-600 ring-4 ring-indigo-100' : 'border-transparent'}`}
                                        >
                                            <img src={url} className="w-full h-full object-cover" loading="lazy" />
                                            {/* Selection Check */}
                                            <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-black/20 border-white'}`}>
                                                {isSelected && <Check size={14} className="text-white" />}
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Bottom Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-20 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <div className="max-w-xl mx-auto flex gap-3">
                    {selectedPhotos.length > 0 ? (
                        <button
                            onClick={() => setIsDrawerOpen(true)}
                            className="flex-1 h-12 bg-gray-900 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                        >
                            <span>Assign {selectedPhotos.length} Photos</span>
                            <ChevronDown size={18} />
                        </button>
                    ) : (
                        <button
                            onClick={handleComplete}
                            className="flex-1 h-12 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                        >
                            <span>Looks Good</span>
                            <ArrowRight size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Assignment Drawer */}
            <Drawer.Root open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Drawer.Content className="bg-white rounded-t-3xl fixed bottom-0 left-0 right-0 z-50 flex flex-col max-h-[85vh]">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="font-bold text-lg">Assign to...</h3>
                            <button onClick={() => setIsDrawerOpen(false)} className="p-2 bg-gray-100 rounded-full">
                                <XIcon size={18} />
                            </button>
                        </div>
                        <div className="p-4 space-y-2 overflow-y-auto pb-10">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => handleAssign(cat.id)}
                                    className="w-full p-4 flex items-center gap-4 bg-gray-50 hover:bg-indigo-50 active:bg-indigo-100 rounded-2xl transition-colors text-left group"
                                >
                                    <div className="w-10 h-10 bg-white rounded-full text-indigo-600 flex items-center justify-center shadow-sm">
                                        <cat.icon size={20} />
                                    </div>
                                    <span className="font-semibold text-gray-700 group-hover:text-indigo-700">{cat.label}</span>
                                </button>
                            ))}
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>
        </div>
    );
}

function SortingSuccessAnimation({ bedroomCount }: { bedroomCount: number }) {
    // Generate particles
    const particles = Array.from({ length: 12 }, (_, i) => i);

    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
            >
                <h2 className="text-2xl font-bold text-indigo-900 mb-2">Smart Inventory Ready</h2>
                <p className="text-gray-500">Organizing your inventory...</p>
            </motion.div>

            <div className="relative w-full max-w-sm aspect-square">
                {/* Central "Common" Icon */}
                <motion.div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center z-10 border-4 border-white shadow-xl"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring" }}
                >
                    <Home size={32} className="text-indigo-600" />
                </motion.div>

                {/* Orbiting Room Icons */}
                {Array.from({ length: bedroomCount }).map((_, i) => {
                    const angle = (i * (360 / bedroomCount)) * (Math.PI / 180);
                    const radius = 120;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;

                    return (
                        <motion.div
                            key={i}
                            className="absolute top-1/2 left-1/2 w-16 h-16 bg-white border-2 border-indigo-100 rounded-2xl flex flex-col items-center justify-center shadow-sm"
                            initial={{ x: "-50%", y: "-50%", scale: 0, opacity: 0 }}
                            animate={{
                                x: `calc(-50% + ${x}px)`,
                                y: `calc(-50% + ${y}px)`,
                                scale: 1,
                                opacity: 1
                            }}
                            transition={{ delay: 0.5 + (i * 0.1), type: "spring" }}
                        >
                            <BedDouble size={20} className="text-indigo-400" />
                            <span className="text-[10px] font-bold text-gray-500 mt-1">Room {i + 1}</span>
                        </motion.div>
                    )
                })}

                {/* Flying Particles */}
                {particles.map((i) => {
                    // Random destination (Common or a Room)
                    // Simple visual effect: particles fly OUTWARDS from center
                    const angle = Math.random() * 360 * (Math.PI / 180);
                    const radius = 140; // Fly past the rooms
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;

                    return (
                        <motion.div
                            key={`p-${i}`}
                            className="absolute top-1/2 left-1/2 w-3 h-3 bg-indigo-500 rounded-sm"
                            initial={{ x: '-50%', y: '-50%', scale: 0, opacity: 0 }}
                            animate={{
                                x: `calc(-50% + ${x}px)`,
                                y: `calc(-50% + ${y}px)`,
                                scale: [0, 1, 0],
                                opacity: [0, 1, 0]
                            }}
                            transition={{
                                duration: 1.5,
                                delay: 1 + (Math.random() * 1), // Start after rooms appear
                                repeat: Infinity
                            }}
                        />
                    )
                })}
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 2.5 }}
                className="mt-12 flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full font-bold"
            >
                <CheckCircle2 size={20} />
                <span>All Sorted!</span>
            </motion.div>
        </div>
    );
}

function XIcon({ size }: { size: number }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
        </svg>
    )
}
