function formatMoney(value: number): string {
    return `${Math.round(value).toLocaleString("vi-VN")} VNĐ`;
}

export function RevenueChart({ values }: { values: Array<{ label: string; value: number }> }) {
    const max = Math.max(...values.map((item) => item.value), 1);
    const total = values.reduce((sum, item) => sum + item.value, 0);
    return (
        <section className="card p-5">
            <div className="mb-5 flex items-center justify-between">
                <div>
                    <h3 className="font-bold">Doanh thu</h3>
                    <p className="text-xs text-[#98a2b3]">6 tháng gần nhất</p>
                </div>
                <span className="rounded-lg border border-[#e8ebf2] px-3 py-2 text-xs font-semibold">
                    {formatMoney(total)}
                </span>
            </div>
            <div className="flex h-64 items-end gap-3 border-b border-[#eef0f4] px-2">
                {values.map((item) => (
                    <div
                        key={item.label}
                        className="group flex h-full flex-1 items-end"
                        title={`${item.label}: ${formatMoney(item.value)}`}
                    >
                        <div
                            className="w-full rounded-t-lg bg-[#dcd9ff] transition group-hover:bg-[#635bff]"
                            style={{
                                height: `${Math.max((item.value / max) * 88, item.value ? 5 : 2)}%`,
                            }}
                        />
                    </div>
                ))}
            </div>
            <div className="mt-3 flex justify-between px-2 text-[11px] text-[#98a2b3]">
                {values.map((item) => (
                    <span key={item.label}>{item.label}</span>
                ))}
            </div>
        </section>
    );
}
