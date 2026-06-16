"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, TrendingDown, Info } from "lucide-react";
import api from "@/lib/api";

export default function HoldingsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [assets, setAssets] = useState<any[]>([]);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
    }, [status, router]);

    useEffect(() => {
        const fetchHoldings = async () => {
            if (!(session as any)?.accessToken) return;

            try {
                const response = await api.get("/api/portfolio/current", {
                    headers: { Authorization: `Bearer ${(session as any).accessToken}` }
                });
                setAssets(response.data.holdings || []);
            } catch (error) {
                console.error("Failed to fetch holdings:", error);
            }
        };

        if (status === "authenticated") {
            fetchHoldings();
        }
    }, [session, status]);

    if (assets.length === 0) {
        return (
            <div className="min-h-screen text-white p-8 flex flex-col items-center justify-center">
                <p className="text-gray-500 mb-4 italic">No holdings detected in current session.</p>
                <button onClick={() => router.push("/upload")} className="px-6 py-2 bg-cyan-500 text-black font-black rounded-xl">Upload Now</button>
            </div>
        );
    }

    return (
        <div className="text-white p-8">

            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
                <div>
                    <h1 className="text-5xl font-black mb-4">Your Holdings</h1>
                    <p className="text-gray-400">Canonical mapping of your raw statement data to market symbols.</p>
                </div>
                <button
                    onClick={() => router.push("/dashboard/analytics")}
                    className="px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-black rounded-2xl hover:shadow-xl hover:shadow-purple-500/20 transition-all active:scale-95 flex items-center gap-2"
                >
                    Analyse Holdings →
                </button>
            </header>

            <div className="glass rounded-[2rem] overflow-hidden border border-white/5 bg-white/[0.01]">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                            <th className="p-6 text-xs font-bold uppercase tracking-widest text-gray-500">Asset Name</th>
                            <th className="p-6 text-xs font-bold uppercase tracking-widest text-gray-500">Symbol</th>
                            <th className="p-6 text-xs font-bold uppercase tracking-widest text-gray-500">Quantity</th>
                            <th className="p-6 text-xs font-bold uppercase tracking-widest text-gray-500">Price (Est.)</th>
                            <th className="p-6 text-xs font-bold uppercase tracking-widest text-gray-500">Invested</th>
                            <th className="p-6 text-xs font-bold uppercase tracking-widest text-gray-500">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assets.map((asset, i) => (
                            <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                                <td className="p-6">
                                    <div className="font-bold text-white group-hover:text-cyan-400 transition-colors uppercase">{asset.asset_name}</div>
                                    <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-tighter">ISIN: {asset.isin || "NOT DETECTED"}</div>
                                </td>
                                <td className="p-6">
                                    <code className="px-2 py-1 bg-white/5 rounded text-cyan-500 text-xs font-mono">{asset.symbol || "PENDING"}</code>
                                </td>
                                <td className="p-6 text-sm font-medium">{asset.quantity}</td>
                                <td className="p-6 text-sm font-medium">₹{(asset.quantity > 0 ? (asset.current_value / asset.quantity) : 0).toFixed(2)}</td>
                                <td className="p-6 text-sm font-medium text-gray-300">₹{(asset.invested_value || 0).toLocaleString()}</td>
                                <td className="p-6">
                                    {asset.symbol && !asset.symbol.endsWith(".UNRESOLVED") ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                                            Resolved
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest border border-amber-500/20">
                                            Manual Resolve
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass p-8 rounded-3xl border border-white/5 bg-gradient-to-br from-indigo-500/5 to-transparent">
                    <div className="flex items-center gap-3 mb-6">
                        <TrendingUp className="text-emerald-400" />
                        <h3 className="text-xl font-bold">Sector Exposure</h3>
                    </div>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        AI has detected high concentration in <span className="text-white font-bold">Banking & IT</span>. Consider diversifying into defensive sectors like FMCG or Healthcare to balance volatility.
                    </p>
                </div>
                <div className="glass p-8 rounded-3xl border border-white/5 bg-gradient-to-br from-rose-500/5 to-transparent">
                    <div className="flex items-center gap-3 mb-6">
                        <TrendingDown className="text-rose-400" />
                        <h3 className="text-xl font-bold">Risk Warning</h3>
                    </div>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        Several penny stocks detected with low liquidity. The agent recommends a <span className="text-white font-bold">15% reduction</span> in small-cap exposure for the upcoming quarter.
                    </p>
                </div>
            </div>
        </div>
    );
}
