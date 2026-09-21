"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react";

export default function MemberQrCheckinPage() {
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("Đang xác nhận check-in...");

    useEffect(() => {
        const code = new URLSearchParams(window.location.search).get("code") ?? "";
        if (!code) {
            setStatus("error");
            setMessage("Mã QR không hợp lệ.");
            return;
        }

        let cancelled = false;
        fetch("/api/checkins/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ qrCode: code }),
        })
            .then(async (response) => {
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || "Không thể check-in.");
                if (!cancelled) {
                    setStatus("success");
                    setMessage(result.message || "Check-in thành công.");
                }
            })
            .catch((error) => {
                if (!cancelled) {
                    setStatus("error");
                    setMessage(error instanceof Error ? error.message : "Không thể check-in.");
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <main className="min-h-screen bg-[var(--surface-subtle)] px-5 py-10">
            <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center">
                <section className="card w-full p-8 text-center shadow-lg">
                    {status === "loading" && (
                        <Loader2 className="mx-auto animate-spin" size={52} />
                    )}
                    {status === "success" && (
                        <CheckCircle2 className="mx-auto" size={64} />
                    )}
                    {status === "error" && (
                        <CircleAlert className="mx-auto" size={64} />
                    )}
                    <h1 className="mt-5 text-2xl font-bold">
                        {status === "success" ? "Check-in thành công" : "Check-in"}
                    </h1>
                    <p className="mt-3 text-sm text-[var(--muted)]">{message}</p>
                </section>
            </div>
        </main>
    );
}