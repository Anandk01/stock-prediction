"use client";

import { CheckCircle, AlertTriangle, TrendingUp, Loader2 } from "lucide-react";

interface HoldingsReviewProps {
    holdings: any[];
    casTotal: number;
    extractedTotal: number;
    confidence: number;
    formatType: string;
    onProcess: () => void;
    processing: boolean;
}

export default function HoldingsReview({
    holdings,
    casTotal,
    extractedTotal,
    confidence,
    formatType,
    onProcess,
    processing
}: HoldingsReviewProps) {
    const confidenceColor = confidence >= 0.95 ? "text-emerald-400" : confidence >= 0.85 ? "text-yellow-400" : "text-rose-400";
    const confidenceBg = confidence >= 0.95 ? "bg-emerald-500/10" : confidence >= 0.85 ? "bg-yellow-500/10" : "bg-rose-500/10";

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-cyan-400" />
                <h2 className="text-3xl font-black mb-2">Parsing Complete</h2>
                <p className="text-gray-400">Review your extracted holdings before processing</p>
            </div>

            {/* Confidence Score */}
            <div className={`glass p-6 rounded-3xl border border-white/5 ${confidenceBg}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Parsing Confidence</p>
                        <p className={`text-4xl font-black ${confidenceColor}`}>{(confidence * 100).toFixed(1)}%</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-400">Format Detected</p>
                        <p className="text-xl font-bold text-white">{formatType}</p>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-gray-500">CAS Total</p>
                        <p className="text-lg font-bold text-white">₹{casTotal.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Extracted Total</p>
                        <p className="text-lg font-bold text-white">₹{extractedTotal.toLocaleString()}</p>
                    </div>
                </div>

                {confidence < 0.95 && (
                    <div className="mt-4 flex items-start gap-2 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                        <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-yellow-200">
                            Parsing confidence is below 95% (minimum threshold: 90%). Some holdings may need manual verification.
                        </p>
                    </div>
                )}
            </div>

            {/* Holdings Table */}
            <div className="glass p-8 rounded-3xl border border-white/5 bg-white/[0.01]">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <TrendingUp className="text-cyan-400 w-5 h-5" />
                    Extracted Holdings ({holdings.length})
                </h3>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left py-3 px-4 text-sm font-bold text-gray-400 uppercase tracking-wider">Asset</th>
                                <th className="text-left py-3 px-4 text-sm font-bold text-gray-400 uppercase tracking-wider">ISIN</th>
                                <th className="text-right py-3 px-4 text-sm font-bold text-gray-400 uppercase tracking-wider">Quantity</th>
                                <th className="text-right py-3 px-4 text-sm font-bold text-gray-400 uppercase tracking-wider">Invested Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {holdings.map((holding, index) => (
                                <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition">
                                    <td className="py-4 px-4 font-medium">{holding.raw_name || holding.asset_name || "Unknown"}</td>
                                    <td className="py-4 px-4 text-gray-400 font-mono text-sm">{holding.isin || "—"}</td>
                                    <td className="py-4 px-4 text-right font-mono">{holding.quantity?.toFixed(2) || "0.00"}</td>
                                    <td className="py-4 px-4 text-right font-mono text-cyan-400">₹{holding.invested_value?.toLocaleString() || "0.00"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Process Button */}
            <div className="flex justify-center">
                <button
                    onClick={onProcess}
                    disabled={processing}
                    className={`px-12 py-5 rounded-3xl font-black text-lg flex items-center justify-center gap-3 transition-all shadow-xl ${processing
                        ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                        : "bg-white text-black hover:bg-cyan-500 shadow-cyan-500/10"
                        }`}
                >
                    {processing ? <><Loader2 className="w-6 h-6 animate-spin" /> Processing Portfolio...</> : "Process Portfolio →"}
                </button>
            </div>
        </div>
    );
}
