import Link from "next/link";

type RecentMember = { name: string; phone: string; packageName: string; expiry: Date | null };

function getStatus(expiry: Date | null): string {
    if (!expiry) return "Chưa có gói";
    const days = Math.ceil((expiry.getTime() - Date.now()) / 86400000);
    if (days < 0) return "Hết hạn";
    if (days <= 7) return "Sắp hết hạn";
    return "Đang hoạt động";
}

function formatDate(date: Date | null): string {
    if (!date) return "—";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${date.getFullYear()}`;
}

export function RecentMembers({ members }: { members: RecentMember[] }) {
    return (
        <section className="card mt-6 overflow-hidden">
            <div className="flex items-center justify-between p-5">
                <div>
                    <h3 className="font-bold">Hội viên gần đây</h3>
                </div>
                <Link href="/members" className="text-xs font-semibold text-[#635bff]">
                    Xem tất cả
                </Link>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="bg-[#fafbfc] text-xs text-[#667085]">
                        <tr>
                            <th className="px-5 py-3">Hội viên</th>
                            <th>Số điện thoại</th>
                            <th>Gói tập</th>
                            <th>Trạng thái</th>
                            <th>Ngày hết hạn</th>
                        </tr>
                    </thead>
                    <tbody>
                        {members.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="px-5 py-8 text-center text-sm text-[#98a2b3]"
                                >
                                    Chưa có dữ liệu hội viên.
                                </td>
                            </tr>
                        ) : (
                            members.map((member) => {
                                const status = getStatus(member.expiry);
                                return (
                                    <tr
                                        key={`${member.phone}-${member.name}`}
                                        className="border-t border-[#eef0f4]"
                                    >
                                        <td className="px-5 py-3 font-medium">{member.name}</td>
                                        <td>{member.phone}</td>
                                        <td>{member.packageName}</td>
                                        <td>
                                            <span className="rounded-full bg-[#f1f0ff] px-2.5 py-1 text-xs">
                                                {status}
                                            </span>
                                        </td>
                                        <td>{formatDate(member.expiry)}</td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
