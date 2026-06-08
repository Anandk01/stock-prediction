"use client";

import Sidebar from "@/components/Sidebar";

export default function HoldingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#020617]">
            <Sidebar />
            <main className="ml-[240px] transition-all duration-300">
                {children}
            </main>
        </div>
    );
}
