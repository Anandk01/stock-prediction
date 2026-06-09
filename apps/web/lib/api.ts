import axios from "axios";
import { signOut } from "next-auth/react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// Create axios instance with base configuration
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Add response interceptor for 401 handling
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Log the error but don't force signout immediately 
            // as it causes redirect loops with OAuth providers
            console.warn("[API] 401 Unauthorized - Token may be invalid or expired");

            // Optional: only signout if we are NOT on the login page
            // if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            //     await signOut({ redirect: true, callbackUrl: "/" });
            // }
        }
        return Promise.reject(error);
    }
);

export default api;
export { API_BASE_URL };
