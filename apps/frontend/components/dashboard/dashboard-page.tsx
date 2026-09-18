"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
    AlertTriangle,
    ArrowRight,
    CalendarClock,
    CheckCircle2,
    CreditCard,
    Dumbbell,
    QrCode,
    Sparkles,
    TrendingUp,
    UserRoundPlus,
    Users,
} from "lucide-react";
import { PageTitle } from "@/components/ui/page-title";
import { StatCard } from "@/components/ui/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { RecentMembers } from "@/components/dashboard/recent-members";

type Metrics = {
    today: {
        newMembers: number;
        checkIns: number;
        revenue: number;
        paidTransactions: number;
        newLeads: number;
        followUps: number;
    };
    members: {
        total: number;
        active: number;
        inactive: number;
        expiring7Days: number;
        expired: number;
    };
    finance: {
        monthRevenue: number;
        allTimeRevenue: number;
        pendingAmount: number;
        pendingTransactions: number;
    };
    crm: {
        newLeads: number;
        dueFollowUps: number;
        inactive14Days: number;
    };
    attendance: {
        today: number;
        last7Days: number;
    };
    recentMembers: Array<{
        id: string;
        name: string;
        phone: string;
        packageName: string;
        expiry: string | null;
    }>;
    revenueByMonth: Array<{
        label: string;
        value: number;
    }>;
};

const money = (v: number) => `${Math.round(v).toLocaleString("vi-VN")} VNĐ`;

function Action({
    href,
    icon: Icon,
    title,
    detail,
}: {
    href: string;
    icon: typeof Users;
    title: string;
    detail: string;
}) {
    return (
        <Link
            href={href}
            className="group flex items-center gap-3 rounded-xl border border-[#eef0f4] p-3 transition hover:border-[#d8d5ff] hover:bg-[#fafaff]"
        >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#f1f0ff] text-[#635bff]">
                <Icon size={17} />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{title}</span>
                <span className="block truncate text-xs text-[#98a2b3]">{detail}</span>
            </span>
            <ArrowRight size={16} className="text-[#98a2b3]" />
        </Link>
    );
}

export function DashboardPage() {
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [user, setUser] = useState<{ fullName: string } | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        Promise.all([
            fetch("/api/dashboard", {
                cache: "no-store",
                credentials: "include",
            }),
            fetch("/api/auth/me", {
                cache: "no-store",
                credentials: "include",
            }),
        ])
            .then(async ([m, u]) => {
                const md = await m.json();
                const ud = await u.json();

                if (m.status === 401 || u.status === 401) {
                    window.location.replace("/login");
                    return;
                }

                if (!m.ok) {
                    throw new Error(md.message || "Không thể tải Dashboard.");
                }

                setMetrics(md.data);

                if (u.ok) {
                    setUser(ud.user);
                }
            })
            .catch((e) => setError(e instanceof Error ? e.message : "Không thể tải Dashboard."));
    }, []);

    if (error) {
        return (
            <>
                <PageTitle
                    title="Dashboard"
                    description="Trung tâm điều hành hoạt động phòng Gym"
                />
                <div className="px-5 pb-8 md:px-8">
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {error}
                    </div>
                </div>
            </>
        );
    }

    if (!metrics) {
        return (
            <>
                <PageTitle
                    title="Dashboard"
                    description="Trung tâm điều hành hoạt động phòng Gym"
                />
                <div className="p-10 text-center text-sm text-[var(--muted)]">Đang tải dữ liệu</div>
            </>
        );
    }

    const stats = [
        {
            label: "Hội viên",
            value: metrics.members.total.toLocaleString("vi-VN"),
            change: `${metrics.members.active} đang hoạt động`,
            icon: Users,
            href: "/members",
        },
        {
            label: "Check-in hôm nay",
            value: metrics.today.checkIns.toLocaleString("vi-VN"),
            change: `${metrics.attendance.last7Days} lượt / 7 ngày`,
            icon: QrCode,
            href: "/checkin",
        },
        {
            label: "Doanh thu tháng",
            value: money(metrics.finance.monthRevenue),
            change: `${metrics.today.paidTransactions} giao dịch hôm nay`,
            icon: CreditCard,
            href: "/payments",
        },
        {
            label: "Cần follow-up",
            value: metrics.crm.dueFollowUps.toLocaleString("vi-VN"),
            change: "Cần xử lý",
            icon: UserRoundPlus,
            href: "/crm",
        },
    ];

    return (
        <>
            <PageTitle
                title="Dashboard"
                description="Trung tâm điều hành hoạt động phòng Gym"
                action={
                    <Link
                        href="/ai-workout"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#635bff] px-4 py-2.5 text-sm font-semibold text-white"
                    >
                        <Sparkles size={17} />
                        Tạo AI Workout
                    </Link>
                }
            />

            <div className="px-5 pb-8 md:px-8">
                <div className="mb-6">
                    <h3 className="text-xl font-bold">
                        Chào buổi sáng, {user?.fullName?.trim() || "bạn"} 👋
                    </h3>
                    <p className="mt-1 text-sm text-[#667085]">Tổng quan hệ thống</p>
                </div>

                <section>
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-sm font-bold uppercase tracking-wide text-[#667085]">
                            Hôm nay
                        </h2>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {stats.map((s) => (
                            <StatCard key={s.label} {...s} />
                        ))}
                    </div>
                </section>

                <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
                    <RevenueChart values={metrics.revenueByMonth} />

                    <section className="card p-5">
                        <div className="mb-4">
                            <h3 className="font-bold">Cảnh báo & hành động</h3>
                            <p className="text-xs text-[#98a2b3]">
                                Những việc nhân viên nên xử lý trước
                            </p>
                        </div>

                        <div className="space-y-3">
                            <Action
                                href="/members"
                                icon={CalendarClock}
                                title={`${metrics.members.expiring7Days} hội viên sắp hết hạn`}
                                detail="Trong 7 ngày tới"
                            />
                            <Action
                                href="/members"
                                icon={AlertTriangle}
                                title={`${metrics.crm.inactive14Days} hội viên ít hoạt động`}
                                detail="Không check-in trong 14 ngày"
                            />
                            <Action
                                href="/crm"
                                icon={UserRoundPlus}
                                title={`${metrics.crm.dueFollowUps} Lead cần follow-up`}
                                detail="Đến hạn liên hệ"
                            />
                        </div>
                    </section>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
                    <section className="card p-5">
                        <div className="mb-5">
                            <h3 className="font-bold">Tình hình hội viên</h3>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-[#eef0f4] p-4">
                                <div className="flex items-center gap-2 text-sm text-[#667085]">
                                    <CheckCircle2 size={16} />
                                    Đang hoạt động
                                </div>
                                <div className="mt-2 text-2xl font-bold">
                                    {metrics.members.active}
                                </div>
                            </div>

                            <div className="rounded-xl border border-[#eef0f4] p-4">
                                <div className="flex items-center gap-2 text-sm text-[#667085]">
                                    <AlertTriangle size={16} />
                                    Sắp hết hạn
                                </div>
                                <div className="mt-2 text-2xl font-bold">
                                    {metrics.members.expiring7Days}
                                </div>
                            </div>

                            <div className="rounded-xl border border-[#eef0f4] p-4">
                                <div className="flex items-center gap-2 text-sm text-[#667085]">
                                    <TrendingUp size={16} />
                                    Mới hôm nay
                                </div>
                                <div className="mt-2 text-2xl font-bold">
                                    {metrics.today.newMembers}
                                </div>
                            </div>

                            <div className="rounded-xl border border-[#eef0f4] p-4">
                                <div className="flex items-center gap-2 text-sm text-[#667085]">
                                    <Users size={16} />
                                    Đã hết hạn
                                </div>
                                <div className="mt-2 text-2xl font-bold">
                                    {metrics.members.expired}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="card p-5">
                        <div className="mb-5">
                            <h3 className="font-bold">Tài chính</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between border-b border-[#eef0f4] pb-4 text-sm">
                                <span className="text-[#667085]">Doanh thu tháng</span>
                                <strong>{money(metrics.finance.monthRevenue)}</strong>
                            </div>

                            <div className="flex justify-between border-b border-[#eef0f4] pb-4 text-sm">
                                <span className="text-[#667085]">Tổng doanh thu</span>
                                <strong>{money(metrics.finance.allTimeRevenue)}</strong>
                            </div>

                            <div className="flex justify-between text-sm">
                                <span className="text-[#667085]">Còn phải thu</span>
                                <strong>{money(metrics.finance.pendingAmount)}</strong>
                            </div>
                        </div>
                    </section>
                </div>

                <RecentMembers
                    members={metrics.recentMembers.map((m) => ({
                        ...m,
                        expiry: m.expiry ? new Date(m.expiry) : null,
                    }))}
                />

                <section className="mt-6 card p-5">
                    <div className="mb-4 flex items-center gap-2">
                        <Dumbbell size={18} className="text-[#635bff]" />
                        <div>
                            <h3 className="font-bold">Thao tác nhanh</h3>
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <Action
                            href="/members"
                            icon={Users}
                            title="Thêm hội viên"
                            detail="Tạo hồ sơ hội viên mới"
                        />
                        <Action
                            href="/payments"
                            icon={CreditCard}
                            title="Ghi nhận thanh toán"
                            detail="Tạo giao dịch mới"
                        />
                        <Action
                            href="/checkin"
                            icon={QrCode}
                            title="Check-in"
                            detail="Ghi nhận lượt vào gym"
                        />
                        <Action
                            href="/ai-workout"
                            icon={Sparkles}
                            title="AI Workout"
                            detail="Tạo và lưu lịch tập"
                        />
                    </div>
                </section>
            </div>
        </>
    );
}
