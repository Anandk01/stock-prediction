"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    BarChart3, RefreshCw, Upload, TrendingUp, TrendingDown,
    AlertCircle, Activity, ArrowUpRight, ArrowDownRight, Minus
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import api from "@/lib/api";

const COLORS = ["#22d3ee", "#818cf8", "#f43f5e", "#fbbf24", "#10b981", "#6366f1", "#ec4899", "#14b8a6"];

export default function AnalyticsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const hasFetched = useRef(false);

    const [holdings, setHoldings] = useState<any[]>([]);
    const [recommendations, setRecommendations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
    }, [status, router]);

    useEffect(() => {
        if (status === "authenticated" && (session as any)?.accessToken && !hasFetched.current) {
            hasFetched.current = true;
            fetchPortfolioAnalytics();
        }
    }, [status, session]);

    const accessToken = (session as any)?.accessToken || "";

    const fetchPortfolioAnalytics = async () => {
        setLoading(true);
        setError(null);
        try {
            const headers = { Authorization: `Bearer ${accessToken}` };

            // 1. Fetch user's portfolio holdings
            const pfResponse = await api.get("/api/portfolio/current", { headers });
            const fetchedHoldings = pfResponse.data.holdings || [];
            setHoldings(fetchedHoldings);

            if (fetchedHoldings.length === 0) {
                setLoading(false);
                return;
            }

            // 2. Get predictions/recommendations for top stocks only (limit to 5 for speed)
            const stockHoldings = fetchedHoldings.filter(
                (h: any) => h.symbol && h.symbol !== "Unresolved" && h.asset_type === "STOCK"
            );

            const topStocks = stockHoldings.slice(0, 5);
            const recs: any[] = [];
            for (const h of topStocks) {
                try {
                    const predRes = await api.get(`/api/stocks/predictions?symbol=${h.symbol}`, { headers });
                    if (predRes.data && predRes.data.length > 0) {
                        const pred = predRes.data[0];
                        recs.push({
                            symbol: h.symbol,
                            asset_name: h.asset_name,
                            quantity: h.quantity,
                            invested_value: h.invested_value,
                            current_value: h.current_value,
                            current_price: pred.current_price,
                            daily_change: pred.daily_change,
                            recommendation: pred.recommendation,
                            direction_2h: pred.predictions["2h"].direction,
                            confidence_2h: pred.predictions["2h"].confidence,
                            direction_1d: pred.predictions["1d"].direction,
                            confidence_1d: pred.predictions["1d"].confidence,
                            expected_return: pred.predictions["2h"].expected_return,
                            explanation: pred.predictions["2h"].explanation,
                        });
                    }
                } catch (e) {
                    recs.push({
                        symbol: h.symbol,
                        asset_name: h.asset_name,
                        quantity: h.quantity,
                        invested_value: h.invested_value,
                        current_value: h.current_value,
                        current_price: 0,
                        daily_change: 0,
                        recommendation: "HOLD",
                        direction_2h: "Sideways",
                        confidence_2h: 50,
                        direction_1d: "Sideways",
                        confidence_1d: 50,
                        expected_return: 0,
                        explanation: "Unable to fetch prediction data.",
                    });
                }
            }
            // Add remaining stocks without predictions
            for (const h of stockHoldings.slice(5)) {
                recs.push({
                    symbol: h.symbol,
                    asset_name: h.asset_name,
                    quantity: h.quantity,
                    invested_value: h.invested_value,
                    current_value: h.current_value,
                    current_price: 0,
                    daily_change: 0,
                    recommendation: "HOLD",
                    direction_2h: "Sideways",
                    confidence_2h: 50,
                    direction_1d: "Sideways",
                    confidence_1d: 50,
                    expected_return: 0,
                    explanation: "Prediction pending — click to analyse individually.",
                });
            }
            setRecommendations(recs);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || "Failed to load portfolio.");
        } finally {
            setLoading(false);
        }
    };

    if (status === "loading" || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-purple-400 font-mono animate-pulse">
                Analyzing your holdings...
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

    if (holdings.length === 0) {
        return (
            <div className="min-h-screen text-white p-8 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <Upload className="w-16 h-16 mx-auto mb-6 text-cyan-400" />
                    <h2 className="text-3xl font-black mb-4">No Holdings Found</h2>
                    <p className="text-gray-400 mb-8">Upload your brokerage statement to see analytics and recommendations for your holdings.</p>
                    <button onClick={() => router.push("/upload")} className="px-8 py-4 bg-white text-black rounded-xl hover:bg-cyan-500 transition text-sm font-black shadow-lg">
                        Upload Statement
                    </button>
                </div>
            </div>
        );
    }

    // Prepare chart data
    const allocationData = holdings.map((h: any, i: number) => ({
        name: h.symbol || h.asset_name,
        value: h.current_value,
    }));

    // Bar chart: use top 10 holdings by value
    const sortedHoldings = [...holdings].sort((a: any, b: any) => b.current_value - a.current_value);
    const performanceData = sortedHoldings.slice(0, 10).map((h: any) => ({
        name: (h.symbol || h.asset_name || "").replace(".NS", "").substring(0, 12),
        invested: h.invested_value,
        current: h.current_value,
    }));

    const totalInvested = holdings.reduce((sum: number, h: any) => sum + h.invested_value, 0);
    const totalCurrent = holdings.reduce((sum: number, h: any) => sum + h.current_value, 0);
    const totalPnL = totalCurrent - totalInvested;
    const pnlPercent = totalInvested > 0 ? ((totalPnL / totalInvested) * 100) : 0;

    return (
        <div className="text-white p-4 md:p-8 font-sans overflow-x-hidden">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-2xl border border-cyan-500/30">
                        <BarChart3 size={24} className="text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">Portfolio Analytics</h1>
                        <p className="text-xs text-gray-500">AI recommendations for your uploaded holdings</p>
                    </div>
                </div>
                <button
                    onClick={() => { hasFetched.current = false; fetchPortfolioAnalytics(); }}
                    className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition text-gray-400 hover:text-white"
                    title="Refresh"
                >
                    <RefreshCw size={16} />
                </button>
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="glass p-6 rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-transparent">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Total Invested</div>
                    <div className="text-2xl font-black">₹{totalInvested.toLocaleString()}</div>
                </div>
                <div className="glass p-6 rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-transparent">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Current Value</div>
                    <div className="text-2xl font-black">₹{totalCurrent.toLocaleString()}</div>
                </div>
                <div className={`glass p-6 rounded-3xl border ${totalPnL >= 0 ? "border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent" : "border-rose-500/20 bg-gradient-to-br from-rose-500/10 to-transparent"}`}>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Total P&L</div>
                    <div className={`text-2xl font-black flex items-center gap-2 ${totalPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {totalPnL >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                        {totalPnL >= 0 ? "+" : ""}₹{totalPnL.toLocaleString()} ({pnlPercent.toFixed(2)}%)
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Allocation Pie Chart */}
                <div className="glass rounded-3xl p-6 border border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-cyan-400" /> Holdings Allocation
                    </h3>
                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={allocationData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                    labelLine={false}
                                >
                                    {allocationData.map((_: any, index: number) => (
                                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                                    formatter={(value: any) => `₹${Number(value).toLocaleString()}`}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Performance Bar Chart */}
                <div className="glass rounded-3xl p-6 border border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-purple-400" /> Invested vs Current
                    </h3>
                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={performanceData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-20} textAnchor="end" />
                                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                                <Bar dataKey="invested" name="Invested" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="current" name="Current" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* AI Recommendations Table */}
            <div className="glass rounded-3xl p-6 border border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" /> AI Recommendations — Keep or Sell?
                </h3>

                {recommendations.length > 0 ? (
                    <div className="space-y-4">
                        {recommendations.map((rec, idx) => {
                            const pnl = rec.current_value - rec.invested_value;
                            const pnlPct = rec.invested_value > 0 ? ((pnl / rec.invested_value) * 100) : 0;

                            return (
                                <div key={idx} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition">
                                    {/* Stock Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="font-black text-sm">{rec.symbol}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rec.daily_change >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                                                {rec.daily_change >= 0 ? "+" : ""}{rec.daily_change.toFixed(2)}%
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-gray-500">{rec.asset_name} · Qty: {rec.quantity}</div>
                                    </div>

                                    {/* P&L */}
                                    <div className="text-center min-w-[100px]">
                                        <div className={`text-sm font-black ${pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                            {pnl >= 0 ? "+" : ""}₹{pnl.toLocaleString()}
                                        </div>
                                        <div className="text-[10px] text-gray-500">{pnlPct.toFixed(2)}% P&L</div>
                                    </div>

                                    {/* AI Signal */}
                                    <div className="text-center min-w-[80px]">
                                        <div className="flex items-center gap-1 justify-center">
                                            {rec.direction_2h === "Bullish" ? <ArrowUpRight size={14} className="text-emerald-400" /> :
                                             rec.direction_2h === "Bearish" ? <ArrowDownRight size={14} className="text-rose-400" /> :
                                             <Minus size={14} className="text-gray-400" />}
                                            <span className="text-xs font-bold">{rec.confidence_2h}%</span>
                                        </div>
                                        <div className="text-[9px] text-gray-500">Confidence</div>
                                    </div>

                                    {/* Recommendation Badge */}
                                    <div className="min-w-[120px]">
                                        {rec.recommendation === "BUY" ? (
                                            <div className="px-4 py-2 bg-emerald-500/20 text-emerald-400 font-black text-center rounded-xl border border-emerald-500/30 text-xs">
                                                ✓ KEEP / BUY MORE
                                            </div>
                                        ) : rec.recommendation === "SELL" ? (
                                            <div className="px-4 py-2 bg-rose-500/20 text-rose-400 font-black text-center rounded-xl border border-rose-500/30 text-xs">
                                                ✗ SELL
                                            </div>
                                        ) : (
                                            <div className="px-4 py-2 bg-white/5 text-gray-400 font-bold text-center rounded-xl border border-white/10 text-xs">
                                                ● HOLD
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm text-center py-8">No stock holdings found for analysis. Upload a statement with stock holdings.</p>
                )}

                {/* Disclaimer */}
                <div className="mt-6 text-center text-[10px] text-gray-500 opacity-60">
                    DISCLAIMER: AI recommendations are based on technical indicators and sentiment analysis. Not investment advice. Past performance does not guarantee future results.
                </div>
            </div>
        </div>
    );
}
