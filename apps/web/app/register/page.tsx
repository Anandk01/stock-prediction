"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import api from '@/lib/api';

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
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

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Name validation — alphabets only
        if (formData.firstName && !/^[A-Za-z]+$/.test(formData.firstName)) {
            setStatus('error');
            setMessage('First name must contain only alphabets.');
            return;
        }
        if (formData.lastName && !/^[A-Za-z]+$/.test(formData.lastName)) {
            setStatus('error');
            setMessage('Last name must contain only alphabets.');
            return;
        }
        
        // Email validation
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
        
        // Password validation — at least 8 chars, 1 uppercase, 1 lowercase, 1 number
        if (formData.password.length < 8) {
            setStatus('error');
            setMessage('Password must be at least 8 characters long.');
            return;
        }
        if (!/[A-Z]/.test(formData.password)) {
            setStatus('error');
            setMessage('Password must contain at least one uppercase letter.');
            return;
        }
        if (!/[a-z]/.test(formData.password)) {
            setStatus('error');
            setMessage('Password must contain at least one lowercase letter.');
            return;
        }
        if (!/[0-9]/.test(formData.password)) {
            setStatus('error');
            setMessage('Password must contain at least one number.');
            return;
        }

        try {
            setStatus('loading');
            setMessage('');

            // Call Backend Auth API
            await api.post('/api/auth/register', {
                email: formData.email,
                password: formData.password
            });

            setStatus('success');
            setMessage('Account created successfully! Redirecting to login...');

            setTimeout(() => {
                router.push('/login');
            }, 2000);

        } catch (error: any) {
            console.error('Registration Error:', error);
            setStatus('error');
            setMessage(error.response?.data?.detail || 'Registration failed. Please try again.');
        }
    };

    return (
        <div className="relative min-h-screen bg-[#020617] flex items-center justify-center font-sans overflow-hidden text-white">
            {/* Background Blobs */}
            <div className="absolute top-1/4 -right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-blob"></div>
            <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-blob animation-delay-2000"></div>

            <div className="relative w-full max-w-md px-6 py-12">
                <div className="glass p-10 rounded-3xl shadow-2xl">
                    <div className="flex justify-center mb-8">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl"></div>
                            <span className="text-2xl font-black text-white">Invest<span className="text-cyan-400">Smart</span></span>
                        </Link>
                    </div>

                    <h2 className="text-3xl font-bold text-white mb-2 text-center">Create Account</h2>
                    <p className="text-gray-400 mb-8 text-center font-medium">Start your intelligent investing journey today.</p>

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
                                    <span className="px-4 bg-[#0f172a] text-gray-400">Or regiter with email</span>
                                </div>
                            </div>
                        </>
                    )}

                    <form className="space-y-6" onSubmit={handleRegister}>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">First Name</label>
                                <input
                                    type="text"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleInputChange}
                                    placeholder="John"
                                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-gray-600 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all outline-none text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Last Name</label>
                                <input
                                    type="text"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleInputChange}
                                    placeholder="Doe"
                                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-gray-600 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all outline-none text-sm"
                                />
                            </div>
                        </div>
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
                            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black rounded-2xl hover:brightness-110 transition shadow-xl shadow-cyan-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {status === 'loading' ? 'Creating Account...' : 'Start Investing'}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-gray-400 text-sm">
                        Already have an account? <Link href="/login" className="text-cyan-400 font-bold hover:text-cyan-300 transition-colors">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
