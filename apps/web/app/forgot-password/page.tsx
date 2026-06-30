"use client";

import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
    const [step, setStep] = useState<'email' | 'reset'>('email');
    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleVerifyEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            setStatus('error');
            setMessage('Please enter your email address.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setStatus('error');
            setMessage('Please enter a valid email address.');
            return;
        }

        try {
            setStatus('loading');
            setMessage('');

            // Verify email exists
            await api.post('/api/auth/verify-email', { email });
            setStep('reset');
            setStatus('idle');
            setMessage('');
        } catch (error: any) {
            setStatus('error');
            setMessage(error.response?.data?.detail || 'Email not found. Please check and try again.');
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newPassword || !confirmPassword) {
            setStatus('error');
            setMessage('Please fill in both password fields.');
            return;
        }

        if (newPassword.length < 6) {
            setStatus('error');
            setMessage('Password must be at least 6 characters long.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setStatus('error');
            setMessage('Passwords do not match.');
            return;
        }

        try {
            setStatus('loading');
            setMessage('');

            await api.post('/api/auth/reset-password', {
                email,
                new_password: newPassword
            });

            setStatus('success');
            setMessage('Password reset successfully! Redirecting to login...');

            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
        } catch (error: any) {
            setStatus('error');
            setMessage(error.response?.data?.detail || 'Password reset failed. Please try again.');
        }
    };

    return (
        <div className="relative min-h-screen bg-[#020617] flex items-center justify-center font-sans overflow-hidden text-white">
            <div className="absolute top-1/4 -left-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>

            <div className="relative w-full max-w-md px-6">
                <div className="glass p-10 rounded-3xl shadow-2xl">
                    <div className="flex justify-center mb-8">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl"></div>
                            <span className="text-2xl font-black text-white">Invest<span className="text-cyan-400">Smart</span></span>
                        </Link>
                    </div>

                    <h2 className="text-3xl font-bold text-white mb-2 text-center">Reset Password</h2>
                    <p className="text-gray-400 mb-8 text-center font-medium">
                        {step === 'email' ? 'Enter your email to reset your password.' : 'Set your new password.'}
                    </p>

                    {step === 'email' ? (
                        <form className="space-y-6" onSubmit={handleVerifyEmail}>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="investor@example.com"
                                    required
                                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-gray-600 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all outline-none"
                                />
                            </div>

                            {status === 'error' && (
                                <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-400/10 p-4 rounded-2xl border border-rose-400/20">
                                    <AlertCircle size={18} />
                                    {message}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="w-full py-4 bg-white text-slate-950 font-black rounded-2xl hover:bg-cyan-500 transition shadow-xl hover:shadow-cyan-500/20 active:scale-[0.98] disabled:opacity-50"
                            >
                                {status === 'loading' ? 'Verifying...' : 'Continue'}
                            </button>
                        </form>
                    ) : (
                        <form className="space-y-6" onSubmit={handleResetPassword}>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-gray-600 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Confirm Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-gray-600 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all outline-none"
                                />
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
                                className="w-full py-4 bg-white text-slate-950 font-black rounded-2xl hover:bg-cyan-500 transition shadow-xl hover:shadow-cyan-500/20 active:scale-[0.98] disabled:opacity-50"
                            >
                                {status === 'loading' ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </form>
                    )}

                    <p className="mt-8 text-center text-gray-400 text-sm">
                        <Link href="/login" className="text-cyan-400 font-bold hover:text-cyan-300 transition-colors flex items-center justify-center gap-1">
                            <ArrowLeft size={14} /> Back to Login
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
