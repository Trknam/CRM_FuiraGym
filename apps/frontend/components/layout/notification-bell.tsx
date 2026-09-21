"use client";

import { Bell, CheckCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type NotificationItem = {
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
};

export function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [unread, setUnread] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    async function load() {
        try {
            const response = await fetch("/api/notifications", {
                credentials: "include",
                cache: "no-store",
            });
            if (!response.ok) return;
            const data = await response.json();
            setItems(data.data ?? []);
            setUnread(Number(data.unreadCount ?? 0));
        } catch {}
    }

    useEffect(() => {
        void load();
        const handleNotificationCreated = () => {
            void load();
        };
        window.addEventListener("fuira:notification-created", handleNotificationCreated);
        const timer = window.setInterval(() => void load(), 30000);
        return () => {
            window.clearInterval(timer);
            window.removeEventListener("fuira:notification-created", handleNotificationCreated);
        };
    }, []);

    useEffect(() => {
        if (!open) return;

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target;
            if (target instanceof Node && !containerRef.current?.contains(target)) {
                setOpen(false);
            }
        };

        document.addEventListener("pointerdown", handlePointerDown);
        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
        };
    }, [open]);

    async function read(id: string) {
        await fetch("/api/notifications/" + id + "/read", {
            method: "PATCH",
            credentials: "include",
        });
        await load();
    }

    async function readAll() {
        await fetch("/api/notifications/read-all", {
            method: "POST",
            credentials: "include",
        });
        await load();
    }

    return (
        <div ref={containerRef} className="relative">
            <button
                aria-label="Thông báo"
                onClick={() => setOpen((value) => !value)}
                className="relative grid h-10 w-10 place-items-center rounded-xl border border-[#e8ebf2] bg-white"
            >
                <Bell size={18} />
                {unread > 0 && (
                    <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1 text-[10px] font-bold leading-5 text-white">
                        {unread > 99 ? "99+" : unread}
                    </span>
                )}
            </button>
            {open && (
                <div className="absolute right-0 top-12 z-50 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[#e8ebf2] bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-[#e8ebf2] px-4 py-3">
                        <div className="font-bold">Thông báo</div>
                        {unread > 0 && (
                            <button
                                className="flex items-center gap-1 text-xs font-semibold text-[var(--primary)]"
                                onClick={() => void readAll()}
                            >
                                <CheckCheck size={14} />
                                Đọc tất cả
                            </button>
                        )}
                    </div>
                    <div className="max-h-[420px] overflow-y-auto">
                        {items.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                                Chưa có thông báo.
                            </div>
                        ) : (
                            items.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => void read(item.id)}
                                    className={
                                        "block w-full border-b border-[#f0f2f6] px-4 py-3 text-left hover:bg-[#fafbfc] " +
                                        (item.isRead ? "" : "bg-blue-50/50")
                                    }
                                >
                                    <div className="text-sm font-semibold">{item.title}</div>
                                    <div className="mt-1 text-xs leading-5 text-[var(--muted)]">
                                        {item.message}
                                    </div>
                                    <div className="mt-1 text-[10px] text-[#98a2b3]">
                                        {new Date(item.createdAt).toLocaleString("vi-VN")}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
