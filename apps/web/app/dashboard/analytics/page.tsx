"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, DollarSign, ShieldAlert, TrendingUp, Upload, BarChart3, PieChart as PieIcon, Radio } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import api from "@/lib/api";

import PortfolioScore from "@/components/dashboard/PortfolioScore";
import SectorAllocation from "@/components/dashboard/SectorAllocation";
import IntelligenceFeed from "@/components/dashboard/IntelligenceFeed";
import BenchmarkChart from "@/components/dashboard/BenchmarkChart";
import SimulatorPanel from "@/components/dashboard/SimulatorPanel";
import RiskHeatmap from "@/components/dashboard/RiskHeatmap";
import OptimizationPanel from "@/components/dashboard/OptimizationPanel";
import EfficientFrontierChart from "@/components/dashboard/EfficientFrontierChart";
import DrawdownChart from "@/components/dashboard/DrawdownChart";

export default function AnalyticsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [data, setData] = useState<any>(null);
    const [holdings, setHoldings] = useState<any[]>([]);
    const [scoreData, setScoreData] = useState<any>(null);
    const [feedItems, setFeedItems] = useState<any[]>([]);
    const [isSimOpen, setSimOpen] = useState(false);
    const [simData, setSimData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [simHoldings, setSimHoldings] = useState<any[]>([]);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
    }, [status, router]);

    useEffect(() => {
        const fetchData = async () => {
            if (!(session as any)?.accessToken) return;
            try {
                setLoading(true);
                setError(null);
                const token = (session as any).accessToken;
                const headers = { Authorization: `Bearer ${token}` };

                const pfResponse = await api.get("/api/portfolio/current", { headers });
                const fetchedHoldings = pfResponse.data.holdings || [];
                setHoldings(fetchedHoldings);
                setSimHoldings(fetchedHoldings.map((h: any) => ({ ...h })));

                if (fetchedHoldings.length > 0) {
                    setData(pfResponse.data);

                    const [scoreRes, feedRes] = await Promise.allSettled([
                        api.get("/api/analytics/score", { headers }),
                        api.get("/api/intelligence/feed", { headers })
                    ]);

                    if (scoreRes.status === "fulfilled") setScoreData(scoreRes.value.data);
                    if (feedRes.status === "fulfilled") setFeedItems(feedRes.value.data.items);
                } else {
                    setData(null);
                }
            } catch (error: any) {
                console.error("Analytics Error:", error);
                if (!data) setError(error.response?.data?.detail || "Failed to load portfolio data");
            } finally {
                setLoading(false);
            }
        };

        if (status === "authenticated") fetchData();
    }, [session, status]);

    if (status === "loading" || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-cyan-400 font-mono animate-pulse">
                Loading Analytics...
            </div>
        );
    }

    if (!data && !error) {
        return (
            <div className="min-h-screen text-white p-8 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <Upload className="w-16 h-16 mx-auto mb-6 text-cyan-400" />
                    <h2 className="text-3xl font-black mb-4">No Portfolio Data</h2>
                    <p className="text-gray-400 mb-8">Upload your brokerage statement to see analytics.</p>
                    <button onClick={() => router.push("/upload")} className="px-8 py-4 bg-white text-black rounded-xl hover:bg-cyan-500 transition text-sm font-black shadow-lg">Upload Statement</button>
                </div>
            </div>
        );
    }

    const metrics = data?.portfolio_metrics;
    const simMetrics = simData?.metrics;
    const activeHoldings = simData?.holdings || holdings;

    const originalAllocation = data?.allocation_breakdown || [];
    const simulatedAllocation = simData?.allocation || [];
    const comparativeChartData = originalAllocation.map((orig: any) => {
        const sim = simulatedAllocation.find((s: any) => s.name === orig.name);
        return { name: orig.name, current: orig.value, simulated: sim ? sim.value : 0 };
    });

    const handleReset = () => {
        setSimData(null);
        setSimHoldings(holdings.map(h => ({ ...h })));
    };

    return (
        <div className="text-white p-4 md:p-8 font-sans overflow-x-hidden">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-400 flex items-center gap-2 mb-1">
                        <BarChart3 className="w-5 h-5" /> Analytics
                    </h1>
                    <h2 className="text-3xl font-black text-white tracking-tight">Portfolio Intelligence</h2>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setSimOpen(true)}
                        className={`px-5 py-2.5 rounded-xl transition text-sm font-bold flex items-center gap-2 ${simData ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20" : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-cyan-500/20"}`}
                    >
                        <Activity size={16} /> {simData ? "Simulator Active" : "Simulator"}
                    </button>
                    {simData && (
                        <button onClick={handleReset} className="px-4 py-2 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20 text-xs font-bold">
                            Reset Plan
                        </button>
                    )}
                </div>
            </header>

            {/* Simulator Drawer */}
            {!isSimOpen && (
                <button
                    onClick={() => setSimOpen(true)}
                    className="fixed right-0 top-1/2 -translate-y-1/2 z-[55] bg-cyan-500 text-black px-2 py-8 rounded-l-2xl font-black text-[10px] uppercase tracking-[0.2em] [writing-mode:vertical-lr] flex items-center gap-2 hover:bg-cyan-400 transition-all shadow-2xl shadow-cyan-500/20 active:scale-95 group"
                >
                    <Activity className="w-4 h-4 -rotate-90 group-hover:scale-110 transition-transform" />
                    Portfolio Simulator
                </button>
            )}

            <SimulatorPanel
                isOpen={isSimOpen}
                onClose={() => setSimOpen(false)}
                holdings={simHoldings}
                setHoldings={setSimHoldings}
                currentMetrics={metrics}
                onSimulate={(results) => setSimData(results)}
            />

            {/* Top Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <MetricCard label="Total Value" value={metrics ? `₹${metrics.total_value.toLocaleString()}` : "₹0"} simValue={simMetrics?.total_value ? `₹${simMetrics.total_value.toLocaleString()}` : null} icon={<DollarSign className="w-5 h-5" />} color="cyan" />
                <MetricCard label="Sharpe Ratio" value={metrics ? metrics.sharpe_ratio.toFixed(2) : "0.00"} simValue={simMetrics?.sharpe_ratio?.toFixed(2)} icon={<Activity className="w-5 h-5" />} color="green" />
                <MetricCard label="Risk (VaR)" value={metrics ? `${(metrics.VaR_95_daily * 100).toFixed(2)}%` : "0.00%"} simValue={simMetrics?.VaR_95_daily ? `${(simMetrics.VaR_95_daily * 100).toFixed(2)}%` : null} icon={<ShieldAlert className="w-5 h-5" />} color="red" />
                <MetricCard label="Diversification" value={metrics ? `${(metrics.diversification_score * 100).toFixed(0)}/100` : "0/100"} simValue={simMetrics?.diversification_score ? `${(simMetrics.diversification_score * 100).toFixed(0)}/100` : null} icon={<TrendingUp className="w-5 h-5" />} color="purple" />
            </div>

            {/* Intelligence Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="glass rounded-3xl p-6 border border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400"><Activity className="w-5 h-5" /></div>
                        <h3 className="font-bold text-lg">Portfolio Health</h3>
                    </div>
                    <PortfolioScore data={simData?.score || scoreData} isSimulated={!!simData} />
                </div>

                <div className="glass rounded-3xl p-6 border border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><PieIcon className="w-5 h-5" /></div>
                        <h3 className="font-bold text-lg">Asset Breakdown</h3>
                    </div>
                    <div className="h-[200px]">
                        <SectorAllocation holdings={activeHoldings} />
                    </div>
                </div>

                <div className="glass rounded-3xl p-6 border border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent lg:row-span-2 flex flex-col min-h-[500px] max-h-[729.5px]">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-teal-500/20 rounded-lg text-teal-400"><Radio className="w-5 h-5" /></div>
                            <h3 className="font-bold text-lg animate-pulse">Live Intelligence</h3>
                        </div>
                        <span className="text-xs font-mono text-gray-500 bg-white/5 px-2 py-1 rounded">
                            {feedItems.length} Signals
                        </span>
                    </div>
                    <IntelligenceFeed items={feedItems} />
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="glass rounded-3xl p-6 border border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent">
                        <BenchmarkChart holdings={activeHoldings} />
                    </div>
                </div>
            </div>

            {/* Asset Allocation & Efficient Frontier */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="glass rounded-3xl p-6 border border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent min-h-[400px]">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400"><Activity className="w-5 h-5" /></div>
                        <h3 className="font-bold text-lg">Asset Allocation</h3>
                    </div>
                    {!loading && comparativeChartData.length > 0 ? (
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={comparativeChartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} angle={-15} textAnchor="end" height={60} />
                                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />
                                    <Bar dataKey="current" name="Current Allocation" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={20} />
                                    <Bar dataKey="simulated" name="Simulated Scenario" fill="#22d3ee" radius={[4, 4, 0, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-gray-500">No data available</div>
                    )}
                </div>

                <div className="glass rounded-3xl p-6 border border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent">
                    <EfficientFrontierChart holdings={activeHoldings} />
                </div>
            </div>

            {/* Risk & Strategy Section */}
            <div className="mb-8">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <ShieldAlert className="w-6 h-6 text-cyan-400" />
                    Risk & Strategy
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-6">
                        <div className="glass rounded-3xl p-6 border border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent min-h-[850px]">
                            <RiskHeatmap holdings={activeHoldings} />
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="glass rounded-3xl p-6 border border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent">
                            <DrawdownChart holdings={activeHoldings} />
                        </div>
                        <div className="glass rounded-3xl p-6 border border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent">
                            <OptimizationPanel holdings={activeHoldings} />
                        </div>
                    </div>
                </div>

                <div className="text-center text-[10px] text-gray-500 max-w-2xl mx-auto opacity-60">
                    DISCLAIMER: All analytics, including efficient frontier and optimization, are based on historical standardized returns.
                    Past performance is not indicative of future results. Not investment advice.
                </div>
            </div>
        </div>
    );
}

function MetricCard({ label, value, simValue, icon, color }: any) {
    const colors: any = {
        cyan: "from-cyan-500/10 to-blue-500/10 text-cyan-400 border-cyan-500/20",
        green: "from-emerald-500/10 to-teal-500/10 text-emerald-400 border-emerald-500/20",
        red: "from-rose-500/10 to-red-500/10 text-rose-400 border-rose-500/20",
        purple: "from-purple-500/10 to-indigo-500/10 text-purple-400 border-purple-500/20"
    };

    return (
        <div className={`glass p-6 rounded-3xl border ${colors[color]} bg-gradient-to-br transition-all duration-500`}>
            <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 text-white">{label}</span>
                <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
            </div>
            <div className="flex items-baseline gap-2">
                <div className="text-2xl font-black text-white tracking-tight">{value}</div>
                {simValue && (
                    <div className={`text-xs font-bold animate-pulse ${simValue.includes('-') || (label === "Risk" && parseFloat(simValue) > parseFloat(value)) ? "text-rose-400" : "text-emerald-400"}`}>
                        → {simValue}
                    </div>
                )}
            </div>
        </div>
    );
}
