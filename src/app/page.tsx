"use client";

import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, githubProvider } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Github, Sword } from "lucide-react";
import { motion } from "framer-motion";

export default function SplashPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async () => {
        setLoading(true);
        setError("");
        try {
            await signInWithPopup(auth, githubProvider);
            router.push("/home");
        } catch (err: any) {
            console.error("Login failed:", err);
            setError(err.message || "Failed to login with GitHub");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 text-white p-4 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900 rounded-full blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="z-10 flex flex-col items-center space-y-8 max-w-md w-full text-center"
            >
                <div className="bg-neutral-900 p-6 rounded-2xl shadow-2xl border border-neutral-800">
                    <Sword className="w-16 h-16 mb-4 mx-auto text-purple-500" />
                    <h1 className="text-4xl font-bold tracking-tighter mb-2 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                        GitHub Chess
                    </h1>
                    <p className="text-neutral-400 mb-8">
                        Connect with developers. Play chess.
                    </p>

                    <button
                        onClick={handleLogin}
                        disabled={loading}
                        className="w-full bg-white text-black hover:bg-neutral-200 transition-colors font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <Github className="w-5 h-5" />
                                Login with GitHub
                            </>
                        )}
                    </button>

                    {error && (
                        <p className="text-red-400 text-sm mt-4">{error}</p>
                    )}
                </div>

                <div className="text-xs text-neutral-500 space-x-4">
                    <a href="#" className="hover:text-neutral-300 transition-colors">Terms & Conditions</a>
                    <span>•</span>
                    <a href="#" className="hover:text-neutral-300 transition-colors">Privacy Policy</a>
                </div>
            </motion.div>
        </div>
    );
}
