"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import api from "@/lib/api";
import HoldingsReview from "@/components/HoldingsReview";

type UploadState = "idle" | "parsing" | "parsed" | "processing" | "complete" | "error";

export default function UploadPage() {
    const { data: session } = useSession();
    const [file, setFile] = useState<File | null>(null);
    const [state, setState] = useState<UploadState>("idle");
    const [message, setMessage] = useState("");
    const router = useRouter();

    // Parsed data
    const [parsedData, setParsedData] = useState<any>(null);

    const handleUpload = async () => {
        if (!file || !(session as any)?.accessToken) return;

        try {
            setState("parsing");
            setMessage("Parsing your CAS...");

            const formData = new FormData();
            formData.append("file", file);

            // Step 1: Parse PDF (saves to ParsedPortfolio collection)
            const parseRes = await api.post("/api/pdf-parser/extract", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${(session as any).accessToken}`
                },
            });

            // Step 2: Normalize Holdings
            const rawHoldings = parseRes.data.holdings;
            const normalizeRes = await api.post("/api/asset-resolver/normalize", rawHoldings, {
                headers: { Authorization: `Bearer ${(session as any).accessToken}` }
            });

            // Save normalized holdings to ParsedPortfolio
            const normalizedHoldings = normalizeRes.data.normalized_holdings;

            // Update parsed portfolio with normalized holdings
            await api.post("/api/portfolio/save-parsed",
                { holdings: normalizedHoldings },
                { headers: { Authorization: `Bearer ${(session as any).accessToken}` } }
            );

            setParsedData({
                holdings: normalizedHoldings,
                casTotal: parseRes.data.cas_total,
                extractedTotal: parseRes.data.extracted_total,
                confidence: parseRes.data.confidence,
                formatType: parseRes.data.format_type
            });

            setState("parsed");
            setMessage("Parsing complete. Review your holdings.");

        } catch (error: any) {
            console.error(error);
            setState("error");
            setMessage(error.response?.data?.detail || "Parsing failed.");
        }
    };

    const handleProcess = async () => {
        if (!(session as any)?.accessToken) return;

        try {
            setState("processing");
            setMessage("Processing portfolio...");

            // Call process endpoint
            await api.post("/api/portfolio/process", {}, {
                headers: { Authorization: `Bearer ${(session as any).accessToken}` }
            });

            setState("complete");
            setMessage("Portfolio processed successfully. Redirecting to your holdings...");

            setTimeout(() => router.push("/holdings"), 1500);

        } catch (error: any) {
            console.error(error);
            setState("error");
            setMessage(error.response?.data?.detail || "Processing failed.");
        }
    };

    // Show holdings review after parsing or while processing
    if ((state === "parsed" || state === "processing" || state === "complete") && parsedData) {
        return (
            <div className="text-white p-8 font-sans">
                <HoldingsReview
                    holdings={parsedData.holdings}
                    casTotal={parsedData.casTotal}
                    extractedTotal={parsedData.extractedTotal}
                    confidence={parsedData.confidence}
                    formatType={parsedData.formatType}
                    onProcess={handleProcess}
                    processing={state === "processing"}
                />
            </div>
        );
    }

    // Upload UI
    return (
        <div className="text-white p-8 font-sans">

            <div className="max-w-2xl mx-auto">
                <header className="text-center mb-12">
                    <h1 className="text-5xl font-black mb-4">Ingest Data</h1>
                    <p className="text-xl text-gray-400">Upload your statement and let the agent work.</p>
                </header>

                <div className="glass p-12 rounded-[2.5rem] border border-white/5 bg-white/[0.02] text-center">
                    <div
                        className={`border-2 border-dashed rounded-[2rem] p-12 mb-8 transition-colors ${file ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-white/10 hover:border-cyan-500/30'}`}
                    >
                        <UploadCloud className="w-16 h-16 mx-auto mb-6 text-cyan-400" />
                        <p className="text-lg font-bold mb-2">{file ? file.name : 'Drag your PDF here'}</p>
                        <p className="text-sm text-gray-500 mb-8">Broker statements (NSDL, CDSL, etc.) supported.</p>

                        <input
                            type="file"
                            id="pdf-upload"
                            className="hidden"
                            accept=".pdf"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                        <label
                            htmlFor="pdf-upload"
                            className="px-8 py-3 glass rounded-full hover:bg-white/10 transition cursor-pointer font-bold text-sm"
                        >
                            Select PDF
                        </label>
                    </div>

                    <button
                        onClick={handleUpload}
                        disabled={!file || state === "parsing"}
                        className={`w-full py-5 rounded-3xl font-black text-lg flex justify-center items-center gap-3 transition-all ${!file || state === "parsing" ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-white text-black hover:bg-cyan-500 shadow-xl shadow-cyan-500/10'}`}
                    >
                        {state === "parsing" ? <><Loader2 className="w-6 h-6 animate-spin" /> Parsing CAS...</> : 'Parse Statement'}
                    </button>

                    {state === "complete" && <div className="mt-8 flex items-center justify-center gap-2 text-emerald-400 font-bold"><CheckCircle size={20} /> {message}</div>}
                    {state === "error" && <div className="mt-8 flex items-center justify-center gap-2 text-rose-400 font-bold"><AlertCircle size={20} /> {message}</div>}
                </div>
            </div>
        </div>
    );
}
