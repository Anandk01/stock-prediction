import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AuthContext from '../components/AuthContext'

const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-inter',
})

export const metadata: Metadata = {
    title: 'InvestSmart: AI - Stock Portfolio Optimization',
    description: 'AI-powered stock predictions and portfolio optimization using River ML and FinBERT sentiment analysis.',
    keywords: ['stock prediction', 'AI', 'portfolio optimization', 'Indian stocks', 'machine learning', 'sentiment analysis'],
    openGraph: {
        title: 'InvestSmart: AI - Stock Portfolio Optimization',
        description: 'AI-powered stock predictions for smart investors.',
        type: 'website',
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className={`${inter.variable} dark`}>
            <body className="font-sans antialiased">
                <AuthContext>
                    {children}
                </AuthContext>
            </body>
        </html>
    )
}
