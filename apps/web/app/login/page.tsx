"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function LoginPage() {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const router = useRouter();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        if (!formData.email || !formData.password) {
            setStatus('error');
            setMessage('Email and password are required.');
            return;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setStatus('error');
            setMessage('Please enter a valid email address.');
            return;
        }

        try {
            setStatus('loading');
            setMessage('');

            console.log('[LOGIN] Starting signIn with:', { email: formData.email });

            // Add timeout to prevent infinite hang
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Login timeout - please check if backend is running')), 15000)
            );

            const signInPromise = signIn('credentials', {
                redirect: false,
                email: formData.email,
                password: formData.password
            });

            const result = await Promise.race([signInPromise, timeoutPromise]) as any;

            console.log('[LOGIN] signIn result:', result);

            if (result?.error) {
                console.error('[LOGIN] Authentication failed:', result.error);
                setStatus('error');
                setMessage('Invalid email or password. Please check your credentials.');
            } else if (result?.ok) {
                console.log('[LOGIN] Authentication successful');
                setStatus('success');
                setMessage('Login successful! Redirecting...');
                setTimeout(() => {
                    router.push('/dashboard');
                }, 1500);
            } else {
                setStatus('error');
                setMessage('Login failed. Please try again.');
            }

        } catch (error: any) {
            console.error('[LOGIN] Exception during login:', error);
            setStatus('error');
            if (error.message?.includes('timeout')) {
                setMessage('Login timeout. Is the backend running on http://localhost:8000?');
            } else {
                setMessage('Something went wrong. Please try again.');
            }
        } finally {
            console.log('[LOGIN] Login flow completed');
        }
    };

    return (
        <div className="relative min-h-screen bg-[#020617] flex items-center justify-center font-sans overflow-hidden text-white">
            {/* Background Blobs */}
            <div className="absolute top-1/4 -left-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-blob"></div>
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-blob animation-delay-2000"></div>

            <div className="relative w-full max-w-md px-6">
                <div className="glass p-10 rounded-3xl shadow-2xl">
                    <div className="flex justify-center mb-8">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl"></div>
                            <span className="text-2xl font-black text-white">Profolio <span className="text-cyan-400">AI</span></span>
                        </Link>
                    </div>

                    <h2 className="text-3xl font-bold text-white mb-2 text-center">Welcome back</h2>
                    <p className="text-gray-400 mb-8 text-center font-medium">Enter your credentials to access your dashboard.</p>

                    {/* Google OAuth Button - Only show if configured */}
                    {process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === 'true' && (
                        <>
                            <button
                                type="button"
                                onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                                className="w-full py-4 mb-6 bg-white/5 border border-white/10 rounded-2xl text-white font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Continue with Google
                            </button>

                            <div className="relative mb-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-white/10"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-[#0f172a] text-gray-400">Or continue with email</span>
                                </div>
                            </div>
                        </>
                    )}

                    <form className="space-y-6" onSubmit={handleLogin}>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="investor@example.com"
                                required
                                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-gray-600 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Password</label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                placeholder="••••••••"
                                required
                                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-gray-600 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all outline-none"
                            />
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-white/5 accent-cyan-500" />
                                Remember me
                            </label>
                            <a href="#" onClick={(e) => { e.preventDefault(); alert('Please contact support to reset your password.'); }} className="text-cyan-400 font-bold hover:text-cyan-300 transition-colors">Forgot password?</a>
                        </div>

                        {status === 'error' && (
                            <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-400/10 p-4 rounded-2xl border border-rose-400/20">
                                <AlertCircle size={18} />
                                {message}
                            </div>
                        )}

                        {status === 'success' && (
                            <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-400/10 p-4 rounded-2xl border border-emerald-400/20">
                                <CheckCircle size={18} />
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="w-full py-4 bg-white text-slate-950 font-black rounded-2xl hover:bg-cyan-500 transition shadow-xl hover:shadow-cyan-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {status === 'loading' ? 'Signing In...' : 'Sign In'}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-gray-400 text-sm">
                        Don't have an account? <Link href="/register" className="text-cyan-400 font-bold hover:text-cyan-300 transition-colors">Create account</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
