"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { status } = useSession();
    const router = useRouter();

    // Redirect to login if not authenticated
    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace("/login");
        }
    }, [status, router]);

    // Clear forward history — user can go back but not forward
    useEffect(() => {
        if (window.history.state && window.history.state.idx !== undefined) {
            window.history.replaceState(null, '', window.location.href);
        }
    }, []);

    if (status === "loading") {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center text-cyan-400 font-mono animate-pulse">
                Loading...
            </div>
        );
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
