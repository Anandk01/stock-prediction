import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Define providers
const providers: any[] = [
    // Email/Password Provider
    CredentialsProvider({
        name: "Credentials",
        credentials: {
            email: { label: "Email", type: "text", placeholder: "investor@example.com" },
            password: { label: "Password", type: "password" }
        },
        async authorize(credentials) {
            if (!credentials) return null;
            try {
                const form = new URLSearchParams();
                form.append("username", credentials.email);
                form.append("password", credentials.password);

                const res = await axios.post(`${API_URL}/api/auth/login`, form, {
                    headers: { "Content-Type": "application/x-www-form-urlencoded" }
                });

                if (res.data && res.data.access_token) {
                    return {
                        id: credentials.email,
                        email: credentials.email,
                        accessToken: res.data.access_token,
                    };
                }
                return null;
            } catch (error: any) {
                console.error("Auth Exception:", error.response?.data || error.message);
                return null;
            }
        }
    })
];

// Add Google provider if credentials are provided in env
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.unshift(
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })
    );
}

const authOptions = {
    providers,
    debug: true, // Enable debug logs to troubleshoot redirect issues
    callbacks: {
        async jwt({ token, user, account }: any) {
            console.log("[NEXTAUTH] JWT Callback Triggered:", {
                provider: account?.provider,
                hasUser: !!user,
                tokenEmail: token.email
            });

            // Initial sign-in
            if (account && user) {
                token.provider = account.provider;

                // For Google, exchange the id_token for a Profolio JWT
                if (account.provider === "google") {
                    console.log("[NEXTAUTH] " + new Date().toISOString() + " Exchanging Google token for Profolio JWT...");
                    const startTime = Date.now();
                    try {
                        const res = await axios.post(`${API_URL}/api/auth/google`, {
                            id_token: account.id_token
                        }, { timeout: 30000 }); // 30s timeout

                        const duration = Date.now() - startTime;
                        console.log(`[NEXTAUTH] ${new Date().toISOString()} Google token exchange finished in ${duration}ms`);

                        if (res.data && res.data.access_token) {
                            console.log("[NEXTAUTH] Google token exchange successful");
                            token.accessToken = res.data.access_token;
                        }
                    } catch (error: any) {
                        const duration = Date.now() - startTime;
                        console.error(`[NEXTAUTH] ${new Date().toISOString()} Google token exchange FAILED after ${duration}ms:`, error.response?.data || error.message);
                    }

                    token.email = user.email;
                    token.name = user.name;
                }

                // For custom credentials provider (accessToken is on the user object)
                if (user?.accessToken) {
                    token.accessToken = user.accessToken;
                }
            }

            return token;
        },
        async session({ session, token }: any) {
            console.log("[NEXTAUTH] Session Callback Triggered:", {
                provider: token.provider,
                hasTokenAccessToken: !!token.accessToken
            });
            session.accessToken = token.accessToken;
            session.provider = token.provider;
            session.user = {
                ...session.user,
                email: token.email,
                name: token.name
            };
            return session;
        }
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt" as const,
    },
    secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-dev",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
