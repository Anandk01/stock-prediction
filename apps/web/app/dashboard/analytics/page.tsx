"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    Sparkles, Newspaper, Award, Layers, RefreshCw,
    ArrowUpRight, ArrowDownRight, Activity, AlertCircle, Cpu
} from "lucide-react";
import api from "@/lib/api";

export default function AnalyticsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const hasFetched = useRef(false);

    const [currentData, setCurrentData] = useState<any>(null);
    const [topPicks, setTopPicks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
    }, [status, router]);

    useEffect(() => {
        if (status === "authenticated" && (session as any)?.accessToken && !hasFetched.current) {
            hasFetched.current = true;
            fetchData();
        }
    }, [status, session]);

    const accessToken = (session as any)?.accessToken || "";

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const headers = { Authorization: `Bearer ${accessToken}` };

            // Fetch predictions for the user's portfolio stocks or default
            const response = await api.get("/api/stocks/predictions", { headers });
            if (response.data && response.data.length > 0) {
                setCurrentData(response.data[0]);
            }

            // Fetch top picks
            const picksRes = await api.get("/api/stocks/top-picks", { headers });
            setTopPicks(picksRes.data || []);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || "Failed to load analytics data.");
        } finally {
            setLoading(false);
        }
    };

    if (status === "loading" || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-purple-400 font-mono animate-pulse">
                Loading Analytics...
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-white p-8">
                <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400">
                    <AlertCircle size={20} />
                    <p className="font-semibold">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="text-white p-4 md:p-8 font-sans overflow-x-hidden">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-2xl border border-cyan-500/30">
                        <Cpu size={24} className="text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">Analytics</h1>
                        <p className="text-xs text-gray-500">AI-Powered Market Intelligence</p>
                    </div>
                </div>
                <button
                    onClick={() => { hasFetched.current = false; fetchData(); }}
                    className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition text-gray-400 hover:text-white"
                    title="Refresh"
                >
                    <RefreshCw size={16} />
                </button>
            </header>

            {currentData ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Explainable AI Justification */}
                        <div className="glass p-6 rounded-3xl border border-purple-500/10 bg-gradient-to-br from-purple-500/5 to-transparent relative overflow-hidden">
                            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 p-8 bg-purple-500/10 rounded-full blur-2xl" />
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="text-purple-400 animate-pulse" size={20} />
                                <h4 className="font-black text-sm uppercase tracking-wider text-purple-400">Explainable AI Justification</h4>
                            </div>
                            <p className="text-gray-300 text-sm leading-relaxed tracking-wide font-medium">
                                &ldquo;{currentData.predictions["2h"].explanation}&rdquo;
                            </p>

                            <div className="mt-6 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 pt-4 border-t border-white/5">
                                {currentData.recommendation === "BUY" ? (
                                    <div className="px-6 py-2 bg-emerald-500 text-black font-black text-center rounded-xl border border-emerald-400/40 shadow-lg shadow-emerald-500/20 tracking-wider">
                                        BUY RECOMMENDATION
                                    </div>
                                ) : currentData.recommendation === "SELL" ? (
                                    <div className="px-6 py-2 bg-rose-500 text-black font-black text-center rounded-xl border border-rose-400/40 shadow-lg shadow-rose-500/20 tracking-wider">
                                        SELL RECOMMENDATION
                                    </div>
                                ) : (
                                    <div className="px-6 py-2 bg-white/10 text-white font-bold text-center rounded-xl border border-white/10 tracking-wider">
                                        HOLD RECOMMENDATION
                                    </div>
                                )}
                                <div className="text-[10px] text-gray-500 font-mono text-right flex items-center justify-end gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                                    Active Model: river.forest.ARFClassifier
                                </div>
                            </div>
                        </div>

                        {/* News Intelligence Feed */}
                        <div className="glass p-6 rounded-3xl border border-white/5 bg-white/[0.005]">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-2">
                                    <Newspaper size={18} className="text-gray-400" />
                                    <h4 className="font-bold text-sm uppercase tracking-wider">News Intelligence Feed</h4>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-gray-500 font-mono">FinBERT:</span>
                                    <span className={`text-xs font-black px-2.5 py-0.5 rounded border ${currentData.sentiment.classification === "POSITIVE"
                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                        : (currentData.sentiment.classification === "NEGATIVE"
                                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                            : "bg-white/5 text-gray-400 border-white/10")
                                        }`}>
                                        {currentData.sentiment.classification} ({currentData.sentiment.score > 0 ? "+" : ""}{currentData.sentiment.score})
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {currentData.sentiment.headlines && currentData.sentiment.headlines.length > 0 ? (
                                    currentData.sentiment.headlines.map((item: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-start gap-4 p-3.5 bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 rounded-xl transition-all">
                                            <p className="text-xs font-medium text-gray-300 leading-normal">{item.title}</p>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${item.sentiment === "POSITIVE"
                                                ? "bg-emerald-500/10 text-emerald-400"
                                                : (item.sentiment === "NEGATIVE"
                                                    ? "bg-rose-500/10 text-rose-400"
                                                    : "bg-white/5 text-gray-500")
                                                }`}>
                                                {item.sentiment}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500 text-xs italic text-center py-4">No recent articles parsed for this stock.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-8">

                        {/* Top AI Picks Today */}
                        <div className="glass p-6 rounded-3xl border border-yellow-500/10 bg-gradient-to-br from-yellow-500/5 to-transparent">
                            <div className="flex items-center gap-2 mb-4">
                                <Award className="text-yellow-400" size={18} />
                                <h4 className="font-bold text-sm uppercase tracking-wider text-yellow-400">Top AI Picks Today</h4>
                            </div>
                            <div className="space-y-3">
                                {topPicks.length > 0 ? (
                                    topPicks.map((pick: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition">
                                            <div>
                                                <div className="font-black text-xs">{pick.symbol}</div>
                                                <div className="text-[10px] text-gray-500">₹{pick.price.toLocaleString()}</div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] font-black text-emerald-400 px-2 py-0.5 bg-emerald-500/10 rounded-full">
                                                    BUY ({pick.confidence}%)
                                                </span>
                                                <div className="text-[9px] text-emerald-500 font-bold mt-1">+{pick.expected_return}% return</div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-center text-xs text-gray-500 italic">
                                        Scanning market watchlists... No high-confidence BUY signals currently.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Model Performance (Live) */}
                        <div className="glass p-6 rounded-3xl border border-white/5 bg-white/[0.01] space-y-4">
                            <div className="flex items-center gap-2">
                                <Layers className="text-gray-400" size={18} />
                                <h4 className="font-bold text-sm uppercase tracking-wider">Model Performance (Live)</h4>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-white/5 rounded-xl text-center border border-white/5">
                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Accuracy</div>
                                    <div className="text-2xl font-black text-purple-400">{(currentData.metrics.accuracy * 100).toFixed(0)}%</div>
                                </div>
                                <div className="p-3 bg-white/5 rounded-xl text-center border border-white/5">
                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Predictions</div>
                                    <div className="text-2xl font-black text-purple-400">{currentData.metrics.total_predictions}</div>
                                </div>
                                <div className="p-3 bg-white/5 rounded-xl text-center border border-white/5">
                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Precision</div>
                                    <div className="text-lg font-black">{(currentData.metrics.precision * 100).toFixed(0)}%</div>
                                </div>
                                <div className="p-3 bg-white/5 rounded-xl text-center border border-white/5">
                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Recall</div>
                                    <div className="text-lg font-black">{(currentData.metrics.recall * 100).toFixed(0)}%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-24 text-gray-500">
                    <Cpu className="w-16 h-16 mx-auto mb-4 text-purple-500/30" />
                    <p className="text-lg font-semibold">Upload a portfolio or wait for prediction data to load.</p>
                </div>
            )}
        </div>
    );
}
