"use client";

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

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

/* ─── SVG Logo Mark ─── */
function LogoMark({ size = 32 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
            </defs>
            <rect width="32" height="32" rx="8" fill="url(#logoGrad)" />
            <path d="M8 22L13 14L18 18L24 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="24" cy="10" r="2" fill="white" />
        </svg>
    );
}

/* ═══════════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════════ */
export default function LandingPage() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <div className="relative min-h-screen bg-[#020617] overflow-hidden font-sans selection:bg-cyan-500/30 text-white">
            {/* ── Background Shapes ── */}
            <div className="pointer-events-none fixed inset-0 z-0">
                <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-purple-500/8 rounded-full blur-[120px] animate-float-slow" />
                <div className="absolute top-[20%] right-[-8%] w-[400px] h-[400px] bg-cyan-500/8 rounded-full blur-[100px] animate-float" />
                <div className="absolute bottom-[10%] left-[15%] w-[350px] h-[350px] bg-blue-500/6 rounded-full blur-[100px] animate-float-slow" style={{ animationDelay: "2s" }} />
            </div>

            {/* ═══════════════ NAVBAR ═══════════════ */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? "glass-nav shadow-lg shadow-black/20" : "bg-transparent"}`}>
                <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <LogoMark />
                        <span className="text-lg font-bold tracking-tight">
                            Invest<span className="text-cyan-400">Smart</span>
                        </span>
                    </Link>

                    {/* Center Nav (Desktop) */}
                    <div className="hidden md:flex items-center gap-8">
                        {["Features", "How It Works", "Technology"].map((item) => (
                            <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, "-")}`} className="text-sm font-medium text-gray-400 hover:text-white transition-colors duration-300 relative group">
                                {item}
                                <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-cyan-400 group-hover:w-full transition-all duration-300" />
                            </a>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <Link href="/login" className="hidden sm:inline-flex text-sm font-medium text-gray-400 hover:text-white transition-colors px-4 py-2">Sign In</Link>
                        <Link href="/register" className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-sm font-semibold rounded-full hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 active:scale-95">
                            Get Started
                        </Link>
                        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden ml-2 p-2 text-gray-400 hover:text-white">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                {mobileOpen ? <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /> : <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />}
                            </svg>
                        </button>
                    </div>
                </div>

                {mobileOpen && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="md:hidden glass-nav border-t border-white/5 px-6 py-4 space-y-3">
                        {["Features", "How It Works", "Technology"].map((item) => (
                            <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, "-")}`} onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-gray-400 hover:text-white py-2">{item}</a>
                        ))}
                    </motion.div>
                )}
            </nav>

            {/* ═══════════════ HERO ═══════════════ */}
            <section className="relative pt-36 pb-24 px-6">
                <div className="hero-glow" />
                <div className="relative max-w-5xl mx-auto text-center">
                    <FadeUp>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 mb-8">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
                            </span>
                            <span className="text-xs font-semibold text-purple-400 tracking-wide uppercase">AI Stock Prediction Engine</span>
                        </div>
                    </FadeUp>

                    <FadeUp delay={0.1}>
                        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.05] mb-6">
                            Predict stocks
                            <br />
                            <span className="text-gradient-animated">with real AI.</span>
                        </h1>
                    </FadeUp>

                    <FadeUp delay={0.2}>
                        <p className="max-w-2xl mx-auto text-lg sm:text-xl text-gray-400 mb-10 leading-relaxed font-normal">
                            Real-time stock predictions powered by River ML incremental learning and FinBERT sentiment analysis.
                            Get BUY/SELL/HOLD recommendations backed by explainable AI.
                        </p>
                    </FadeUp>

                    <FadeUp delay={0.3}>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                            <Link href="/register" className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-base font-semibold rounded-2xl hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-300 active:scale-95 flex items-center justify-center gap-2">
                                Start Predicting
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                            </Link>
                            <a href="#how-it-works" className="w-full sm:w-auto px-8 py-4 glass text-white text-base font-medium rounded-2xl hover:bg-white/5 transition-all duration-300 active:scale-95">
                                See How It Works
                            </a>
                        </div>
                    </FadeUp>

                    <FadeUp delay={0.4}>
                        <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
                            <span className="flex items-center gap-1.5">
                                <span className="text-base">🇮🇳</span> Indian & Global Stocks
                            </span>
                            <span className="hidden sm:inline text-gray-700">·</span>
                            <span className="flex items-center gap-1.5">
                                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                Incremental Online ML
                            </span>
                            <span className="hidden sm:inline text-gray-700">·</span>
                            <span className="flex items-center gap-1.5">
                                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                Explainable AI
                            </span>
                        </div>
                    </FadeUp>
                </div>
            </section>

            {/* ═══════════════ FEATURES ═══════════════ */}
            <section id="features" className="relative py-24 px-6">
                <div className="max-w-6xl mx-auto">
                    <FadeUp>
                        <div className="text-center mb-16">
                            <span className="text-xs font-semibold text-purple-400 uppercase tracking-widest mb-3 block">Core Features</span>
                            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Intelligent Stock Prediction Platform</h2>
                            <p className="text-gray-400 max-w-xl mx-auto">Three AI-powered modules working together to predict market movements and manage your portfolio.</p>
                        </div>
                    </FadeUp>

                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            {
                                icon: "🤖",
                                gradient: "from-purple-500 to-indigo-600",
                                title: "AI Predictions",
                                desc: "Real-time BUY/SELL/HOLD recommendations using River ML Adaptive Random Forest with incremental online learning. Updates continuously.",
                            },
                            {
                                icon: "📰",
                                gradient: "from-cyan-500 to-blue-600",
                                title: "Sentiment Analysis",
                                desc: "FinBERT NLP model analyzes financial news headlines from Economic Times and MoneyControl to detect market sentiment shifts.",
                            },
                            {
                                icon: "📊",
                                gradient: "from-amber-500 to-orange-600",
                                title: "Portfolio Analytics",
                                desc: "Upload your brokerage statement (NSDL/CDSL) and get AI recommendations on whether to keep or sell each holding.",
                            },
                        ].map((feature, i) => (
                            <FadeUp key={i} delay={i * 0.15}>
                                <div className="glass-card p-8 rounded-2xl h-full">
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-2xl mb-5`}>
                                        {feature.icon}
                                    </div>
                                    <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
                                </div>
                            </FadeUp>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════ HOW IT WORKS ═══════════════ */}
            <section id="how-it-works" className="relative py-24 px-6">
                <div className="max-w-5xl mx-auto">
                    <FadeUp>
                        <div className="text-center mb-16">
                            <span className="text-xs font-semibold text-purple-400 uppercase tracking-widest mb-3 block">Simple Process</span>
                            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">How It Works</h2>
                            <p className="text-gray-400 max-w-xl mx-auto">Get AI-powered stock predictions in three simple steps.</p>
                        </div>
                    </FadeUp>

                    <div className="grid md:grid-cols-3 gap-8 relative">
                        <div className="hidden md:block absolute top-16 left-[calc(16.67%+40px)] right-[calc(16.67%+40px)] h-[2px]">
                            <div className="w-full h-full bg-gradient-to-r from-purple-500/30 via-cyan-500/30 to-amber-500/30 rounded-full" />
                        </div>

                        {[
                            {
                                step: "01",
                                color: "from-purple-500 to-indigo-600",
                                title: "Search Any Stock",
                                desc: "Enter any stock symbol — Indian (TCS.NS, RELIANCE.NS) or global (AAPL, MSFT). Get instant AI predictions.",
                                icon: (
                                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                ),
                            },
                            {
                                step: "02",
                                color: "from-cyan-500 to-blue-600",
                                title: "AI Analyzes Signals",
                                desc: "The engine computes RSI, MACD, EMA trends, scrapes news, and runs FinBERT sentiment in real-time.",
                                icon: (
                                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                ),
                            },
                            {
                                step: "03",
                                color: "from-amber-500 to-orange-600",
                                title: "Get Recommendations",
                                desc: "Receive BUY, SELL, or HOLD with confidence scores, expected returns, and explainable AI justification.",
                                icon: (
                                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                ),
                            },
                        ].map((s, i) => (
                            <FadeUp key={i} delay={i * 0.15}>
                                <div className="relative text-center">
                                    <div className={`w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white shadow-lg relative z-10`}>
                                        {s.icon}
                                    </div>
                                    <span className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2 block">Step {s.step}</span>
                                    <h3 className="text-lg font-semibold text-white mb-2">{s.title}</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
                                </div>
                            </FadeUp>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════ TECHNOLOGY ═══════════════ */}
            <section id="technology" className="relative py-24 px-6">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/[0.02] to-transparent pointer-events-none" />
                <div className="max-w-6xl mx-auto relative">
                    <FadeUp>
                        <div className="text-center mb-16">
                            <span className="text-xs font-semibold text-purple-400 uppercase tracking-widest mb-3 block">Under the Hood</span>
                            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Real ML, Not Just Charts</h2>
                            <p className="text-gray-400 max-w-xl mx-auto">Powered by genuine machine learning models that learn and adapt continuously.</p>
                        </div>
                    </FadeUp>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {[
                            {
                                icon: "🌊",
                                title: "River ML (Online Learning)",
                                desc: "Adaptive Random Forest classifier that learns incrementally from every new candle — never goes stale.",
                            },
                            {
                                icon: "📰",
                                title: "FinBERT Sentiment",
                                desc: "Financial domain BERT model analyzing live news from Economic Times and MoneyControl for sentiment signals.",
                            },
                            {
                                icon: "📈",
                                title: "Live Market Data",
                                desc: "Real-time price data from Yahoo Finance — RSI, MACD, EMA, ATR, and volume indicators computed on the fly.",
                            },
                            {
                                icon: "🧠",
                                title: "Explainable AI",
                                desc: "Every recommendation comes with a human-readable justification explaining why the model decided BUY/SELL/HOLD.",
                            },
                        ].map((tech, i) => (
                            <FadeUp key={i} delay={i * 0.1}>
                                <div className="glass-card p-6 rounded-2xl text-center h-full">
                                    <div className="text-3xl mb-4">{tech.icon}</div>
                                    <h3 className="text-base font-semibold text-white mb-2">{tech.title}</h3>
                                    <p className="text-gray-400 text-xs leading-relaxed">{tech.desc}</p>
                                </div>
                            </FadeUp>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════ CTA BANNER ═══════════════ */}
            <section className="relative py-24 px-6">
                <div className="max-w-4xl mx-auto">
                    <FadeUp>
                        <div className="relative rounded-3xl overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-indigo-600/20 to-cyan-600/20" />
                            <div className="absolute inset-0 bg-[#020617]/60" />
                            <div className="relative p-10 sm:p-16 text-center">
                                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                                    Ready to predict your next trade?
                                </h2>
                                <p className="text-gray-400 max-w-md mx-auto mb-8">
                                    Search any stock, get AI-powered predictions, and make smarter investment decisions backed by data.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <Link href="/register" className="px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-2xl hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-300 active:scale-95">
                                        Get Started Free →
                                    </Link>
                                    <Link href="/login" className="px-8 py-4 glass text-white font-medium rounded-2xl hover:bg-white/5 transition-all duration-300 active:scale-95">
                                        Sign In
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </FadeUp>
                </div>
            </section>

            {/* ═══════════════ FOOTER ═══════════════ */}
            <footer className="relative border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6 py-12">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <LogoMark size={24} />
                            <span className="text-sm font-bold">Invest<span className="text-cyan-400">Smart</span></span>
                        </div>
                        <p className="text-xs text-gray-600">
                            © 2026 InvestSmart · Built with River ML, FinBERT, Next.js & FastAPI
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
