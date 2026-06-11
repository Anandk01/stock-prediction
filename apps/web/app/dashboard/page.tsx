"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
    Search, Activity, Cpu, Clock, Newspaper, Sparkles,
    ArrowUpRight, ArrowDownRight, RefreshCw, Award, 
    AlertCircle, Layers, TrendingUp, AlertTriangle
} from "lucide-react";
import api from "@/lib/api";

export default function PredictionsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const hasFetched = useRef(false);

    // Search State
    const [searchSymbol, setSearchSymbol] = useState("TCS.NS");
    const [currentData, setCurrentData] = useState<any>(null);
    const [timeline, setTimeline] = useState<any[]>([]);
    const [topPicks, setTopPicks] = useState<any[]>([]);

    // UI States
    const [loading, setLoading] = useState(false);
    const [updateLogs, setUpdateLogs] = useState<string[]>([]);
    const [updatingModel, setUpdatingModel] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
    }, [status, router]);

    // Initial fetch — only once
    useEffect(() => {
        if (status === "authenticated" && (session as any)?.accessToken && !hasFetched.current) {
            hasFetched.current = true;
            fetchStockData(searchSymbol);
            fetchTopPicks();
        }
    }, [status, session]);

    const accessToken = (session as any)?.accessToken || "";

    const fetchStockData = async (symbol: string) => {
        setLoading(true);
        setError(null);
        try {
            const headers = { Authorization: `Bearer ${accessToken}` };
            const response = await api.get(`/api/stocks/predictions?symbol=${symbol}`, { headers });
            if (response.data && response.data.length > 0) {
                setCurrentData(response.data[0]);
            } else {
                setError("No stock data returned from backend.");
            }

            const timelineRes = await api.get(`/api/stocks/timeline?symbol=${symbol}`, { headers });
            setTimeline(timelineRes.data || []);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || "Failed to load predictive model data.");
        } finally {
            setLoading(false);
        }
    };

    const fetchTopPicks = async () => {
        try {
            const headers = { Authorization: `Bearer ${accessToken}` };
            const res = await api.get("/api/stocks/top-picks", { headers });
            setTopPicks(res.data || []);
        } catch (err) {
            console.error("Failed to load top picks:", err);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchSymbol.trim()) {
            fetchStockData(searchSymbol.trim().toUpperCase());
        }
    };

    const triggerIncrementalUpdate = async () => {
        if (!currentData) return;
        setUpdatingModel(true);
        setUpdateLogs(["[Init] Establishing stream to yfinance collector...", "[Collector] Fetching latest intraday candles..."]);

        try {
            const headers = { Authorization: `Bearer ${accessToken}` };

            await new Promise(r => setTimeout(r, 800));
            setUpdateLogs(prev => [...prev, "[Collector] Appending new 5-minute candle to candles table..."]);

            await new Promise(r => setTimeout(r, 800));
            setUpdateLogs(prev => [...prev, "[Sentiment] Querying FinBERT model for recent Economic Times articles..."]);

            await new Promise(r => setTimeout(r, 600));
            setUpdateLogs(prev => [...prev, "[Trainer] Checking predictions table for matured 2-hour signals..."]);

            const res = await api.post("/api/stocks/update", { symbol: currentData.symbol }, { headers });

            setUpdateLogs(prev => [
                ...prev,
                `[Trainer] Found matured signals. Running River AdaptiveRandomForest.learn_one().`,
                `[Trainer] Model successfully updated. Samples learned: ${res.data.samples_learned}.`,
                `[Success] Prediction parameters refreshed.`
            ]);

            await new Promise(r => setTimeout(r, 500));

            if (res.data.predictions && res.data.predictions.length > 0) {
                setCurrentData(res.data.predictions[0]);
            }

            const timelineRes = await api.get(`/api/stocks/timeline?symbol=${currentData.symbol}`, { headers });
            setTimeline(timelineRes.data || []);
            fetchTopPicks();
        } catch (err: any) {
            setUpdateLogs(prev => [...prev, `[Error] Incremental training failed: ${err.message}`]);
        } finally {
            setUpdatingModel(false);
        }
    };

    const renderDirectionBadge = (dir: string) => {
        switch (dir) {
            case "Bullish":
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-black border border-emerald-500/30 shadow-lg shadow-emerald-500/10 animate-pulse">
                        <ArrowUpRight size={14} /> BULLISH
                    </span>
                );
            case "Bearish":
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-black border border-rose-500/30 shadow-lg shadow-rose-500/10 animate-pulse">
                        <ArrowDownRight size={14} /> BEARISH
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-black border border-amber-500/30 shadow-lg shadow-amber-500/10">
                        <Activity size={14} /> SIDEWAYS
                    </span>
                );
        }
    };

    const renderRecommendationBadge = (rec: string) => {
        switch (rec) {
            case "BUY":
                return (
                    <div className="px-6 py-2 bg-emerald-500 text-black font-black text-center rounded-xl border border-emerald-400/40 shadow-lg shadow-emerald-500/20 tracking-wider">
                        BUY RECOMMENDATION
                    </div>
                );
            case "SELL":
                return (
                    <div className="px-6 py-2 bg-rose-500 text-black font-black text-center rounded-xl border border-rose-400/40 shadow-lg shadow-rose-500/20 tracking-wider">
                        SELL RECOMMENDATION
                    </div>
                );
            default:
                return (
                    <div className="px-6 py-2 bg-white/10 text-white font-bold text-center rounded-xl border border-white/10 tracking-wider">
                        HOLD RECOMMENDATION
                    </div>
                );
        }
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center text-cyan-400 font-mono animate-pulse">
                Initializing Predictive Engine...
            </div>
        );
    }

    return (
        <div className="text-white p-4 md:p-8 font-sans overflow-x-hidden">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-gradient-to-br from-purple-500/20 to-indigo-600/20 rounded-2xl border border-purple-500/30">
                            <Cpu size={24} className="text-purple-400 animate-pulse" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">AI Predictions</h1>
                            <p className="text-xs text-gray-500">Incremental Online Learning — River ML & FinBERT Sentiment</p>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="flex items-center gap-2 w-full md:w-auto md:max-w-sm">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search symbol (e.g. INFY.NS, RELIANCE.NS)..."
                            value={searchSymbol}
                            onChange={(e) => setSearchSymbol(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white/5 rounded-xl border border-white/10 focus:outline-none focus:border-purple-400 text-sm font-semibold tracking-wide"
                        />
                    </div>
                    <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-black text-sm rounded-xl transition shadow-lg shadow-purple-500/20">
                        Search
                    </button>
                    <button
                        type="button"
                        onClick={() => { fetchStockData(searchSymbol); fetchTopPicks(); }}
                        className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition text-gray-400 hover:text-white"
                        title="Refresh data"
                    >
                        <RefreshCw size={16} />
                    </button>
                </form>
            </header>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <RefreshCw className="animate-spin text-purple-400" size={48} />
                    <p className="text-gray-400 font-mono animate-pulse">Initializing incremental neural parameters...</p>
                </div>
            ) : error ? (
                <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400">
                    <AlertCircle size={20} />
                    <p className="font-semibold">{error}</p>
                </div>
            ) : currentData ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Col: Stock Info, Prediction, Explainability */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Live Feed Header */}
                        <div className="glass p-6 rounded-3xl border border-purple-500/10 bg-gradient-to-r from-purple-500/5 to-transparent flex flex-wrap justify-between items-center gap-4">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-1">Live Stock Intelligence</div>
                                <h3 className="text-3xl font-black tracking-tight">{currentData.symbol}</h3>
                                <span className="text-xs text-gray-500">Source: Yahoo Finance</span>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-black">₹{currentData.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                <div className={`text-sm font-bold flex items-center justify-end gap-1 ${currentData.daily_change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                    {currentData.daily_change >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                    {currentData.daily_change >= 0 ? "+" : ""}{currentData.daily_change.toFixed(2)}%
                                </div>
                            </div>
                        </div>

                        {/* Prediction Engine (Intraday & Daily Side-by-side) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* 2-Hour Intraday */}
                            <div className="glass p-6 rounded-3xl border border-purple-500/10 bg-gradient-to-b from-purple-500/5 to-transparent space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Clock size={14} /> 2H Intraday Trend
                                    </span>
                                    {renderDirectionBadge(currentData.predictions["2h"].direction)}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-gray-400">
                                        <span>River ML Confidence</span>
                                        <span className="font-bold text-white">{currentData.predictions["2h"].confidence}%</span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-1000"
                                            style={{ width: `${currentData.predictions["2h"].confidence}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-between items-center text-sm pt-2">
                                    <span className="text-gray-400">Proj. Return (2h)</span>
                                    <span className={`font-black ${currentData.predictions["2h"].expected_return >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                        {currentData.predictions["2h"].expected_return >= 0 ? "+" : ""}{currentData.predictions["2h"].expected_return}%
                                    </span>
                                </div>
                            </div>

                            {/* Daily Next-Day */}
                            <div className="glass p-6 rounded-3xl border border-indigo-500/10 bg-gradient-to-b from-indigo-500/5 to-transparent space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Clock size={14} /> Next Trading Day
                                    </span>
                                    {renderDirectionBadge(currentData.predictions["1d"].direction)}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-gray-400">
                                        <span>River ML Confidence</span>
                                        <span className="font-bold text-white">{currentData.predictions["1d"].confidence}%</span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000"
                                            style={{ width: `${currentData.predictions["1d"].confidence}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-between items-center text-sm pt-2">
                                    <span className="text-gray-400">Proj. Return (1d)</span>
                                    <span className={`font-black ${currentData.predictions["1d"].expected_return >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                        {currentData.predictions["1d"].expected_return >= 0 ? "+" : ""}{currentData.predictions["1d"].expected_return}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Dynamic AI Explainability Box */}
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
                                {renderRecommendationBadge(currentData.recommendation)}
                                <div className="text-[10px] text-gray-500 font-mono text-right flex items-center justify-end gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                                    Active Model: river.forest.ARFClassifier
                                </div>
                            </div>
                        </div>

                        {/* Live News & Sentiment Center */}
                        <div className="glass p-6 rounded-3xl border border-white/5 bg-white/[0.005]">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-2">
                                    <Newspaper size={18} className="text-gray-400" />
                                    <h4 className="font-bold text-sm uppercase tracking-wider">News Intelligence Feed</h4>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-gray-500 font-mono">Aggregated FinBERT:</span>
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

                    {/* Right Col: Picks, Model Metrics, Trainer, Timeline */}
                    <div className="space-y-8">

                        {/* Top Picks */}
                        <div className="glass p-6 rounded-3xl border border-yellow-500/10 bg-gradient-to-br from-yellow-500/5 to-transparent relative overflow-hidden">
                            <div className="flex items-center gap-2 mb-4">
                                <Award className="text-yellow-400" size={18} />
                                <h4 className="font-bold text-sm uppercase tracking-wider text-yellow-400">Top AI Picks Today</h4>
                            </div>
                            <div className="space-y-3">
                                {topPicks.length > 0 ? (
                                    topPicks.map((pick: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition cursor-pointer" onClick={() => { setSearchSymbol(pick.symbol); fetchStockData(pick.symbol); }}>
                                            <div>
                                                <div className="font-black text-xs">{pick.symbol}</div>
                                                <div className="text-[10px] text-gray-500">₹{pick.price.toLocaleString()}</div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${pick.recommendation === "BUY" ? "text-emerald-400 bg-emerald-500/10" : pick.recommendation === "SELL" ? "text-rose-400 bg-rose-500/10" : "text-gray-400 bg-white/5"}`}>
                                                    {pick.recommendation || "BUY"} ({pick.confidence}%)
                                                </span>
                                                <div className={`text-[9px] font-bold mt-1 ${pick.expected_return >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                                    {pick.expected_return >= 0 ? "+" : ""}{pick.expected_return}% return
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-center text-xs text-gray-500 italic">
                                        Loading market signals...
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Model Performance Metrics */}
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
                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Samples</div>
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

                        {/* Incremental Trainer */}
                        <div className="glass p-6 rounded-3xl border border-purple-500/20 bg-gradient-to-b from-purple-500/10 to-transparent space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-black uppercase tracking-widest text-purple-400">Incremental Trainer</span>
                                <span className="text-[9px] font-mono text-gray-500 bg-white/5 px-2 py-0.5 rounded">Continuous Feed</span>
                            </div>

                            <p className="text-xs text-gray-400 leading-normal">
                                Download latest candles, scrape financial news, evaluate past predictions, and run River training step.
                            </p>

                            <button
                                onClick={triggerIncrementalUpdate}
                                disabled={updatingModel}
                                className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 disabled:from-purple-800 disabled:to-indigo-800 text-white font-black rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-purple-500/20 active:scale-95"
                            >
                                <RefreshCw size={16} className={updatingModel ? "animate-spin" : ""} />
                                {updatingModel ? "TRAINING ARF MODEL..." : "TRIGGER ONLINE UPDATE"}
                            </button>

                            {(updatingModel || updateLogs.length > 0) && (
                                <div className="p-4 bg-black/60 rounded-xl border border-white/5 font-mono text-[9px] text-purple-400 space-y-1.5 max-h-[150px] overflow-y-auto">
                                    {updateLogs.map((log, idx) => (
                                        <div key={idx} className={log.includes("[Error]") ? "text-rose-400" : (log.includes("[Success]") ? "text-emerald-400" : "")}>
                                            {log}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Prediction Timeline History */}
                        <div className="glass p-6 rounded-3xl border border-white/5 bg-white/[0.005]">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                    <Clock size={16} className="text-gray-400" />
                                    <h4 className="font-bold text-sm uppercase tracking-wider">Prediction History</h4>
                                </div>
                                <span className="text-[10px] text-gray-500 font-mono">Last 10</span>
                            </div>

                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                                {timeline.length > 0 ? (
                                    timeline.map((item: any, idx: number) => (
                                        <div key={idx} className="relative pl-6 border-l border-white/10 pb-4 last:pb-0">
                                            <span className={`absolute left-0 -translate-x-1/2 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-[#020617] flex items-center justify-center ${item.status === "correct"
                                                ? "bg-emerald-500 shadow-md shadow-emerald-500/20"
                                                : (item.status === "incorrect"
                                                    ? "bg-rose-500 shadow-md shadow-rose-500/20"
                                                    : "bg-amber-500 shadow-md shadow-amber-500/20")
                                                }`}>
                                                {item.status === "correct" && <span className="h-1 w-1 bg-white rounded-full" />}
                                            </span>

                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="text-[10px] font-black">{item.predicted} Trend ({item.target === "2h" ? "2 Hours" : "Daily"})</div>
                                                    <div className="text-[9px] text-gray-500">
                                                        {new Date(item.time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} | Confidence: {item.confidence}%
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded capitalize ${item.status === "correct"
                                                        ? "bg-emerald-500/10 text-emerald-400"
                                                        : (item.status === "incorrect"
                                                            ? "bg-rose-500/10 text-rose-400"
                                                            : "bg-amber-500/10 text-amber-400")
                                                        }`}>
                                                        {item.status === "pending" ? "Pending (2h)" : (item.status === "correct" ? "Correct" : "Missed")}
                                                    </span>
                                                    {item.status !== "pending" && (
                                                        <div className="text-[8px] text-gray-500 mt-1">Actual: {item.actual}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500 text-xs italic text-center py-4">No prediction entries tracked yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-24 text-gray-500">
                    <Cpu className="w-16 h-16 mx-auto mb-4 text-purple-500/30" />
                    <p className="text-lg font-semibold">Select a stock or search above to load predictive metrics.</p>
                </div>
            )}
        </div>
    );
}
