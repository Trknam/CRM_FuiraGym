import Image from "next/image";
import Link from "next/link";

export function AuthShell({ children }: { children: React.ReactNode }) {
    return (
        <main className="min-h-screen bg-[var(--background)] px-4 py-10">
            <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center">
                <Link href="/" className="mx-auto mb-7 flex items-center justify-center">
                    <Image
                        src="/Logokemten.png"
                        alt="FuiraCRM"
                        width={190}
                        height={58}
                        className="h-14 w-auto object-contain"
                        priority
                    />
                </Link>
                {children}
            </div>
        </main>
    );
}
