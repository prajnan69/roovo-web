
import { ChevronRight } from "lucide-react";
import SectionCard from "./SectionCard";

interface ListingDescriptionProps {
    description: string;
    isExpanded: boolean;
    onToggle: () => void;
}

const ListingDescription = ({ description, isExpanded, onToggle }: ListingDescriptionProps) => {
    return (
        <SectionCard title="About this space">
            <div className="relative overflow-hidden">
                <div
                    className={`text-slate-600 text-sm leading-relaxed prose prose-slate ${!isExpanded && 'line-clamp-4'}`}
                    dangerouslySetInnerHTML={{ __html: description }}
                />
                <button
                    onClick={onToggle}
                    className="mt-2 flex items-center text-indigo-600 font-semibold text-sm"
                >
                    {isExpanded ? "Show less" : "Read more"}
                    <ChevronRight className={`w-4 h-4 ml-0.5 transition-transform ${isExpanded ? '-rotate-90' : 'rotate-90'}`} />
                </button>
            </div>
        </SectionCard>
    );
};

export default ListingDescription;
