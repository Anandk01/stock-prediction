"use client";

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';

/* ─── Fade-up wrapper ─── */
function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: "-60px" });
    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 28 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

/* ═══════════════════════════════════════════════════
   TOUR PAGE
   ═══════════════════════════════════════════════════ */
export default function TourPage() {
    const heroRef = useRef(null);
    const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
    const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
    const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

    return (
        <div className="relative min-h-screen bg-[#020617] overflow-hidden font-sans selection:bg-cyan-500/30 text-white">

            {/* ── Background Shapes ── */}
            <div className="pointer-events-none fixed inset-0 z-0 opacity-40">
                <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[0%] right-[-10%] w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px]" />
            </div>

            {/* ═══════════════ NAVBAR ═══════════════ */}
            <nav className="fixed top-0 w-full z-50 glass-nav">
                <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                            <rect width="32" height="32" rx="8" fill="url(#logoGrad)" />
                            <path d="M8 22L13 14L18 18L24 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="24" cy="10" r="2" fill="white" />
                            <defs>
                                <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
                                    <stop offset="0%" stopColor="#22d3ee" />
                                    <stop offset="100%" stopColor="#3b82f6" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <span className="text-lg font-bold tracking-tight">Invest<span className="text-cyan-400">Smart</span></span>
                    </Link>
                    <Link href="/register" className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-semibold transition-colors">
                        Create Account
                    </Link>
                </div>
            </nav>

            {/* ═══════════════ HERO ═══════════════ */}
            <section ref={heroRef} className="relative min-h-[90vh] flex items-center justify-center pt-20 px-6">
                <motion.div style={{ y, opacity }} className="relative z-10 text-center max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-8 animate-fade-in">
                        <span className="text-xs font-semibold text-indigo-400 tracking-wide uppercase">Inside the Engine</span>
                    </div>
                    <h1 className="text-5xl sm:text-7xl md:text-8xl font-extrabold tracking-tight leading-[1.05] mb-8">
                        How we turn <br />
                        <span className="text-gradient-animated">chaos into clarity.</span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                        A deep dive into the three powerful engines that power InvestSmart:
                        The Parser, The Resolver, and The Intelligence.
                    </p>
                </motion.div>

                {/* Scroll Indicator */}
                <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 text-gray-600"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                </motion.div>
            </section>

            {/* ═══════════════ ENGINE 1: PARSER ═══════════════ */}
            <section className="relative py-32 px-6 border-t border-white/5">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
                    <FadeUp>
                        <div className="relative">
                            <span className="text-8xl font-black text-white/[0.03] absolute -top-20 -left-10 select-none">01</span>
                            <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4 block">The Extraction Engine</span>
                            <h2 className="text-4xl sm:text-5xl font-bold mb-6">Universal PDF Parser</h2>
                            <p className="text-gray-400 text-lg leading-relaxed mb-8">
                                Most portfolio trackers require manual entry or Excel uploads. Our engine uses OCR and regex pattern matching to extract data from any Indian brokerage statement directly.
                            </p>

                            <ul className="space-y-4">
                                {["Supports NSDL, CDSL, CAMS CAS statements", "Handles Zerodha, Groww, Upstox contract notes", "Detects table structures automatically", "99.8% extraction accuracy"].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-gray-300">
                                        <div className="w-6 h-6 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0">
                                            <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </FadeUp>

                    <FadeUp delay={0.2}>
                        <div className="glass-card rounded-3xl p-8 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-50">
                                <span className="text-xs font-mono text-cyan-400">System.Out: PROCESSING</span>
                            </div>

                            {/* Visual Representation of Parsing */}
                            <div className="space-y-4 font-mono text-sm">
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-gray-500">
                                    <div className="flex items-center gap-3 mb-2 pb-2 border-b border-white/5">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        <span>statement_march_2026.pdf</span>
                                    </div>
                                    <div className="opacity-50 text-xs">
                                        RAW_CONTENT_DETECTED...<br />
                                        &gt; HDFC BANK LTD<br />
                                        &gt; ISIN: INE040A01034<br />
                                        &gt; QTY: 50.00
                                    </div>
                                </div>

                                <div className="flex justify-center">
                                    <svg className="w-6 h-6 text-cyan-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                                </div>

                                <div className="p-4 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-100">
                                    <div className="text-xs text-cyan-400 mb-2">PARSED_JSON_OUTPUT</div>
                                    <pre className="text-xs opacity-80">
                                        {`{
  "symbol": "HDFCBANK",
  "isin": "INE040A01034",
  "quantity": 50,
  "confidence": 0.99
}`}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </FadeUp>
                </div>
            </section>

            {/* ═══════════════ ENGINE 2: RESOLVER ═══════════════ */}
            <section className="relative py-32 px-6 border-t border-white/5 bg-white/[0.01]">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center lg:flex-row-reverse">
                    <FadeUp delay={0.2} className="lg:order-2">
                        <div className="relative">
                            <span className="text-8xl font-black text-white/[0.03] absolute -top-20 -left-10 select-none">02</span>
                            <span className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-4 block">The Resolution Layer</span>
                            <h2 className="text-4xl sm:text-5xl font-bold mb-6">Asset Resolution Engine</h2>
                            <p className="text-gray-400 text-lg leading-relaxed mb-8">
                                Raw names in statements are messy. "REL IND" could be Reliance Industries or Reliance Infra. Our engine resolves ambiguity using a 3-step waterfall logic.
                            </p>

                            <div className="space-y-6">
                                {[
                                    { title: "ISIN Registry Check", desc: "First, we match the unique 12-digit ISIN against a master database of 5000+ Indian securities." },
                                    { title: "Fuzzy Name Matching", desc: "If ISIN is missing, we use Levenshtein distance algorithms to find the closest NSE/BSE match." },
                                    { title: "Ticker Mapping", desc: "Finally, we append identifiers like '.NS' or '.BO' to fetch real-time data from Yahoo Finance." }
                                ].map((item, i) => (
                                    <div key={i} className="pl-4 border-l-2 border-purple-500/20">
                                        <h4 className="text-white font-semibold mb-1">{item.title}</h4>
                                        <p className="text-sm text-gray-500">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </FadeUp>

                    <FadeUp className="lg:order-1">
                        <div className="glass-card rounded-3xl p-1 relative min-h-[400px] flex items-center justify-center bg-grid-white/[0.02]">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent opacity-50" />

                            <div className="relative z-10 w-full max-w-sm space-y-3">
                                <div className="flex items-center justify-between p-4 bg-[#0F172A] rounded-xl border border-red-500/30">
                                    <span className="text-red-400 font-mono">"REL IND LTD - EQ"</span>
                                    <span className="text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded">Unresolved</span>
                                </div>
                                <div className="flex justify-center">
                                    <div className="w-0.5 h-8 bg-white/10" />
                                </div>
                                <div className="p-4 bg-[#0F172A] rounded-xl border border-purple-500/30 text-center">
                                    <span className="text-purple-400 text-xs tracking-widest uppercase mb-1 block">Resolving...</span>
                                    <div className="flex justify-center gap-1 mb-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse delay-100" />
                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse delay-200" />
                                    </div>
                                </div>
                                <div className="flex justify-center">
                                    <div className="w-0.5 h-8 bg-white/10" />
                                </div>
                                <div className="flex items-center justify-between p-4 bg-[#0F172A] rounded-xl border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                                    <div>
                                        <div className="text-emerald-400 font-bold font-mono">RELIANCE.NS</div>
                                        <div className="text-xs text-gray-500">Reliance Industries Ltd</div>
                                    </div>
                                    <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded">Calculated</span>
                                </div>
                            </div>
                        </div>
                    </FadeUp>
                </div>
            </section>

            {/* ═══════════════ ENGINE 3: INTELLIGENCE ═══════════════ */}
            <section className="relative py-32 px-6 border-t border-white/5">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
                    <FadeUp>
                        <div className="relative">
                            <span className="text-8xl font-black text-white/[0.03] absolute -top-20 -left-10 select-none">03</span>
                            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-4 block">The Intelligence Core</span>
                            <h2 className="text-4xl sm:text-5xl font-bold mb-6">Neural Predictive Model</h2>
                            <p className="text-gray-400 text-lg leading-relaxed mb-8">
                                This isn't just a spreadsheet wrapper. We run a PyTorch LSTM (Long Short-Term Memory) neural network in the background to analyze price momentum, combined with a BERT-based sentiment analyzer.
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="text-3xl mb-2">🧠</div>
                                    <h4 className="font-bold text-white mb-1">LSTM Model</h4>
                                    <p className="text-xs text-gray-400">Time-series forecasting for price trends.</p>
                                </div>
                                <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="text-3xl mb-2">📰</div>
                                    <h4 className="font-bold text-white mb-1">FinBERT</h4>
                                    <p className="text-xs text-gray-400">NLP sentiment scoring of market news.</p>
                                </div>
                            </div>
                        </div>
                    </FadeUp>

                    <FadeUp delay={0.2}>
                        <div className="glass-card rounded-3xl p-8 min-h-[300px] flex flex-col justify-between">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-8">Model Architecture</h3>

                            <div className="flex justify-between items-center text-xs font-mono text-gray-500">
                                <span>Input Layer</span>
                                <span>Hidden Layers (50 nodes)</span>
                                <span>Output</span>
                            </div>

                            <div className="grow relative my-6">
                                {/* Simplified Neural Net Visualization */}
                                <svg className="absolute inset-0 w-full h-full" overflow="visible">
                                    <line x1="10%" y1="20%" x2="50%" y2="50%" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                                    <line x1="10%" y1="50%" x2="50%" y2="50%" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                                    <line x1="10%" y1="80%" x2="50%" y2="50%" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

                                    <line x1="50%" y1="50%" x2="90%" y2="50%" stroke="rgba(251, 191, 36, 0.4)" strokeWidth="2" />

                                    <circle cx="10%" cy="20%" r="4" fill="#334155" />
                                    <circle cx="10%" cy="50%" r="4" fill="#334155" />
                                    <circle cx="10%" cy="80%" r="4" fill="#334155" />

                                    <circle cx="50%" cy="50%" r="12" fill="rgba(251, 191, 36, 0.2)" stroke="#FBBF24" />

                                    <circle cx="90%" cy="50%" r="4" fill="#FBBF24" />
                                </svg>
                            </div>

                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                <div className="flex justify-between items-center">
                                    <span className="text-amber-400 font-bold">Predicted Trend</span>
                                    <span className="text-amber-400">+1.24% <span className="opacity-60 text-xs">(Confidence: 87%)</span></span>
                                </div>
                            </div>
                        </div>
                    </FadeUp>
                </div>
            </section>

            {/* ═══════════════ CTA ═══════════════ */}
            <section className="relative py-32 px-6 text-center">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-4xl sm:text-5xl font-bold mb-8">Seen enough?</h2>
                    <p className="text-xl text-gray-400 mb-10">
                        The engine is ready. Your portfolio is waiting.
                        Join the future of personal asset management today.
                    </p>
                    <Link
                        href="/register"
                        className="inline-flex px-10 py-5 bg-white text-slate-950 text-lg font-bold rounded-full hover:bg-cyan-400 transition-all duration-300 shadow-xl hover:shadow-cyan-400/20 active:scale-95"
                    >
                        Start Building Now
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 text-center text-sm text-gray-600 border-t border-white/5">
                © 2026 InvestSmart. All systems operational.
            </footer>
        </div>
    );
}
