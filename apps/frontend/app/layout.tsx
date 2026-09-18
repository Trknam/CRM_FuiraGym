import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "FuiraCRM",
  description: "FuiraCRM - Quản lý phòng Gym",
  icons: {
    icon: "/FuiraGym.png",
    shortcut: "/FuiraGym.png",
    apple: "/FuiraGym.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
