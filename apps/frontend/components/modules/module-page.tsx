import { ModuleToolbar } from "@/components/ui/module-toolbar";
import { PageTitle } from "@/components/ui/page-title";
import { EmptyState } from "@/components/ui/empty-state";

export function ModulePage({
    title,
    description,
    action,
}: {
    title: string;
    description: string;
    action: string;
}) {
    return (
        <>
            <PageTitle title={title} description={description} />
            <div className="px-5 pb-8 md:px-8">
                <section className="card overflow-hidden">
                    <ModuleToolbar title={title} action={action} />
                    <EmptyState
                        title="Giao diện module đã sẵn sàng"
                        description="Bước tiếp theo có thể kết nối API, database và xây CRUD thực tế cho module này."
                    />
                </section>
            </div>
        </>
    );
}
