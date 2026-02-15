
import { Info, Clock, Users, Sparkles, Wind } from "lucide-react";

interface ListingHouseRulesProps {
    rules: string[];
}

const ListingHouseRules = ({ rules }: ListingHouseRulesProps) => {
    return (
        <div className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4">House Rules</h2>
            <div className="grid grid-cols-1 gap-4">
                {rules && rules.length > 0 ? (
                    rules.map((rule: string, idx: number) => {
                        let Icon = Info;
                        if (rule.toLowerCase().includes("check-in")) Icon = Clock;
                        else if (rule.toLowerCase().includes("checkout")) Icon = Clock;
                        else if (rule.toLowerCase().includes("guest")) Icon = Users;
                        else if (rule.toLowerCase().includes("party")) Icon = Sparkles;
                        else if (rule.toLowerCase().includes("smoking")) Icon = Wind;

                        return (
                            <div key={idx} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50/50 border border-slate-100">
                                <div className="p-2 bg-white rounded-full shadow-sm text-slate-700">
                                    <Icon className="w-5 h-5" />
                                </div>
                                <span className="text-slate-700 font-medium text-sm">{rule}</span>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-slate-500 text-sm italic">No specific house rules listed.</div>
                )}
            </div>
        </div>
    );
};

export default ListingHouseRules;
