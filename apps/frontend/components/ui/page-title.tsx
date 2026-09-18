export function PageTitle({
    title,
    description,
    action,
}: {
    title: string;
    description: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col justify-between gap-4 px-5 py-6 md:flex-row md:items-center md:px-8">
            <div>
                <h2 className="text-2xl font-bold">{title}</h2>
                <p className="mt-1 text-sm text-[#667085]">{description}</p>
            </div>
            {action}
        </div>
    );
}
