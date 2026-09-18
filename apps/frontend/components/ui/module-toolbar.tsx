import { Filter, Plus, Search } from "lucide-react";

export function ModuleToolbar({ title, action }: { title: string; action: string }) {
    return (
        <div className="flex flex-col gap-4 border-b border-[#e8ebf2] p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-[#e8ebf2] px-3 py-2 lg:max-w-md">
                <Search size={17} className="text-[#98a2b3]" />
                <input
                    className="w-full outline-none text-sm"
                    placeholder={`Tìm trong ${title.toLowerCase()}...`}
                />
            </div>
            <div className="flex gap-2">
                <button className="inline-flex items-center gap-2 rounded-xl border border-[#e8ebf2] px-3 py-2 text-sm">
                    <Filter size={16} />
                    Bộ lọc
                </button>
                <button className="inline-flex items-center gap-2 rounded-xl bg-[#635bff] px-4 py-2 text-sm font-semibold text-white">
                    <Plus size={16} />
                    {action}
                </button>
            </div>
        </div>
    );
}
