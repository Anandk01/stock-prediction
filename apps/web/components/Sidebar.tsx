"use client";

import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
    Cpu,
    BarChart3,
    Wallet,
    Upload,
    LogOut,
    Activity,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
    {
        label: "Upload",
        href: "/upload",
        icon: Upload,
        primary: false,
        description: "Import brokerage PDF",
    },
    {
        label: "Holdings",
        href: "/holdings",
        icon: Wallet,
        primary: false,
        description: "Your asset breakdown",
    },
    {
        label: "Analytics",
        href: "/dashboard/analytics",
        icon: BarChart3,
        primary: false,
        description: "Portfolio metrics & risk",
    },
    {
        label: "AI Predictions",
        href: "/dashboard",
        icon: Cpu,
        primary: true,
        description: "Live ML predictions & signals",
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <aside
            className={`fixed left-0 top-0 h-screen z-50 flex flex-col bg-[#060a1a] border-r border-white/5 transition-all duration-300 ${
                collapsed ? "w-[72px]" : "w-[240px]"
            }`}
        >
            {/* Logo */}
            <div className="p-4 flex items-center gap-3 border-b border-white/5 min-h-[64px]">
                <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex-shrink-0">
                    <Activity className="w-5 h-5 text-white" />
                </div>
                {!collapsed && (
                    <span className="text-sm font-black tracking-tight text-white truncate">
                        Profolio AI
                    </span>
                )}
            </div>

            {/* Nav Items */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.href}
                            onClick={() => router.push(item.href)}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative ${
                                isActive
                                    ? item.primary
                                        ? "bg-gradient-to-r from-purple-500/20 to-indigo-600/20 border border-purple-500/30 text-white shadow-lg shadow-purple-500/10"
                                        : "bg-white/10 border border-white/10 text-white"
                                    : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                            }`}
                            title={collapsed ? item.label : undefined}
                        >
                            <div
                                className={`p-1.5 rounded-lg flex-shrink-0 ${
                                    isActive && item.primary
                                        ? "bg-purple-500/20 text-purple-300"
                                        : isActive
                                        ? "bg-cyan-500/20 text-cyan-400"
                                        : "text-gray-500 group-hover:text-gray-300"
                                }`}
                            >
                                <Icon className={`w-4 h-4 ${isActive && item.primary ? "animate-pulse" : ""}`} />
                            </div>

                            {!collapsed && (
                                <div className="flex flex-col items-start overflow-hidden">
                                    <span className="text-xs font-bold truncate">
                                        {item.label}
                                    </span>
                                    <span className="text-[10px] text-gray-500 truncate">
                                        {item.description}
                                    </span>
                                </div>
                            )}

                            {/* Primary badge */}
                            {item.primary && !collapsed && (
                                <span className="ml-auto text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                    Main
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Bottom Actions */}
            <div className="p-3 border-t border-white/5 space-y-2">
                <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-400 hover:bg-rose-500/10 transition group border border-transparent hover:border-rose-500/20"
                    title={collapsed ? "Logout" : undefined}
                >
                    <LogOut className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span className="text-xs font-semibold">Logout</span>}
                </button>

                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-full flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition"
                >
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
            </div>
        </aside>
    );
}
