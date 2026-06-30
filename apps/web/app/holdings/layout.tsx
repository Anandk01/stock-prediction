"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function HoldingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace("/login");
        }
    }, [status, router]);

    if (status === "loading") {
        return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-cyan-400 font-mono animate-pulse">Loading...</div>;
    }
    if (status === "unauthenticated") return null;

    return (
        <div className="min-h-screen bg-[#020617]">
            <Sidebar />
            <main className="ml-[240px] transition-all duration-300">
                {children}
            </main>
        </div>
    );
}
