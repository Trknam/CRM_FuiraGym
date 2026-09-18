import { Search } from "lucide-react";

export function EmptyState({ title, description }: { title: string; description: string }) {
    return (
        <div className="grid min-h-[420px] place-items-center p-10 text-center">
            <div>
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#f1f0ff] text-[#635bff]">
                    <Search />
                </div>
                <h3 className="font-bold">{title}</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#667085]">
                    {description}
                </p>
            </div>
        </div>
    );
}
