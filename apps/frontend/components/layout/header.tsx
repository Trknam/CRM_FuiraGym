import { Search } from "lucide-react";
import { UserMenu } from "@/components/auth/user-menu";
import { NotificationBell } from "@/components/layout/notification-bell";

export function Header() {
    return (
        <header className="flex min-h-[72px] items-center justify-between border-b border-[#e8ebf2] bg-white px-5 md:px-8">
            <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">
                    FuiraCRM
                </p>
                <h1 className="text-lg font-bold text-[#172033]">Quản lý phòng Gym</h1>
            </div>
            <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 rounded-xl border border-[#e8ebf2] bg-[#fafbfc] px-3 py-2 sm:flex">
                    <Search size={16} className="text-[#98a2b3]" />
                    <input
                        className="w-44 bg-transparent text-sm outline-none"
                        placeholder="Tìm kiếm..."
                    />
                </div>
                <NotificationBell />
                <UserMenu />
            </div>
        </header>
    );
}
