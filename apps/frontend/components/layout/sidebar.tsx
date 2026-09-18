"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";
import {
    LayoutDashboard,
    Users,
    UserRoundPlus,
    Dumbbell,
    CreditCard,
    QrCode,
    UserCog,
    LibraryBig,
    Sparkles,
    HeartHandshake,
    BarChart3,
    Settings,
} from "lucide-react";

const groups = [
    { title: "TỔNG QUAN", items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }] },
    {
        title: "QUẢN LÝ",
        items: [
            { href: "/leads", label: "Leads", icon: UserRoundPlus },
            { href: "/members", label: "Hội viên", icon: Users },
            { href: "/packages", label: "Gói tập", icon: Dumbbell },
            { href: "/payments", label: "Thanh toán", icon: CreditCard },
            { href: "/checkin", label: "Check-in", icon: QrCode },
            { href: "/trainers", label: "PT / Trainer", icon: UserCog },
        ],
    },
    {
        title: "AI & CRM",
        items: [
            { href: "/exercises", label: "Exercise Database", icon: LibraryBig },
            { href: "/ai-workout", label: "AI Workout", icon: Sparkles },
            { href: "/crm", label: "CRM chăm sóc", icon: HeartHandshake },
            { href: "/reports", label: "Báo cáo", icon: BarChart3 },
        ],
    },
];

export function Sidebar() {
    const pathname = usePathname();
    const { user, can } = useAuth();
    const visibleGroups = groups.map((group) => ({
        ...group,
        items: group.items.filter((item) => {
            const permissionMap: Record<string, string> = {
                "/leads": "lead.read",
                "/members": "member.read",
                "/packages": "package.read",
                "/payments": "payment.read",
                "/checkin": "checkin.read",
                "/trainers": "trainer.read",
                "/exercises": "exercise.read",
                "/ai-workout": "workout.read",
                "/crm": "crm.read",
                "/reports": "report.read",
            };
            return !permissionMap[item.href] || can(permissionMap[item.href]);
        }),
    }));

    return (
        <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[250px] border-r border-[#e8ebf2] bg-white md:block">
            <div className="flex h-[72px] items-center gap-3 border-b border-[#e8ebf2] px-5">
                <Image
                    src="/Logokemten.png"
                    alt="FuiraCRM"
                    width={180}
                    height={54}
                    className="h-11 w-auto object-contain"
                    priority
                />
            </div>
            <nav className="h-[calc(100vh-72px)] overflow-y-auto px-3 py-5">
                {visibleGroups.map((group) => (
                    <div key={group.title} className="mb-6">
                        <div className="mb-2 px-3 text-[10px] font-bold tracking-[.14em] text-[#98a2b3]">
                            {group.title}
                        </div>
                        <div className="space-y-1">
                            {group.items.map(({ href, label, icon: Icon }) => {
                                const active =
                                    href === "/" ? pathname === "/" : pathname.startsWith(href);
                                return (
                                    <Link
                                        key={href}
                                        href={href}
                                        className={`sidebar-item ${active ? "active" : ""}`}
                                    >
                                        <Icon size={18} />
                                        <span className="text-sm">{label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
                <div className="mt-8 rounded-xl bg-[#f7f7ff] p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <Sparkles size={16} className="text-[#635bff]" />
                        AI Workout
                    </div>
                    <p className="mb-3 text-xs leading-5 text-[#667085]">
                        Tạo kế hoạch tập cá nhân hóa từ mục tiêu, trình độ và lịch tập.
                    </p>
                    <Link href="/ai-workout" className="text-xs font-semibold text-[#635bff]">
                        Mở AI Planner →
                    </Link>
                </div>
                {user.role === "SUPER_ADMIN" && (
                    <Link href="/settings" className="sidebar-item mt-5">
                        <Settings size={18} />
                        <span className="text-sm">Cài đặt</span>
                    </Link>
                )}
            </nav>
        </aside>
    );
}
