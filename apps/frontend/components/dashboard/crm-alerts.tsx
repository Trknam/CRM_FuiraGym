import Link from "next/link";
import { AlertTriangle, Clock3, UserRoundPlus } from "lucide-react";

export function CrmAlerts({
    expiringCount,
    inactiveCount,
    leadCount,
}: {
    expiringCount: number;
    inactiveCount: number;
    leadCount: number;
}) {
    const alerts = [
        {
            icon: AlertTriangle,
            title: `${expiringCount} hội viên sắp hết hạn`,
            detail: "Trong 7 ngày tới",
        },
        { icon: Clock3, title: `${inactiveCount} hội viên không check-in`, detail: "≥ 14 ngày" },
        {
            icon: UserRoundPlus,
            title: `${leadCount} Lead chưa follow-up`,
            detail: "Cần liên hệ hôm nay",
        },
    ];

    return (
        <section className="card p-5">
            <div className="mb-5 flex items-center justify-between">
                <div>
                    <h3 className="font-bold">CRM cần xử lý</h3>
                    <p className="text-xs text-[#98a2b3]">Dữ liệu thực tế theo phạm vi chi nhánh</p>
                </div>
                <Link href="/crm" className="text-xs font-semibold text-[#635bff]">
                    Xem tất cả
                </Link>
            </div>
            <div className="space-y-3">
                {alerts.map(({ icon: Icon, title, detail }) => (
                    <div
                        key={title}
                        className="flex items-center gap-3 rounded-xl border border-[#eef0f4] p-3"
                    >
                        <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#f7f7ff] text-[#635bff]">
                            <Icon size={17} />
                        </div>
                        <div>
                            <div className="text-sm font-semibold">{title}</div>
                            <div className="text-xs text-[#98a2b3]">{detail}</div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
