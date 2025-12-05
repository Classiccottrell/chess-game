"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, onSnapshot, addDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { LogOut, User, Play, Monitor } from "lucide-react";
import { motion } from "framer-motion";

interface UserProfile {
    uid: string;
    displayName: string;
    photoURL: string;
    screenName?: string;
    status: "online" | "in-game" | "offline";
}

export default function HomePage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [screenNameInput, setScreenNameInput] = useState("");
    const [loading, setLoading] = useState(true);
    const [openGames, setOpenGames] = useState<any[]>([]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                router.push("/");
            } else {
                setUser(currentUser);
                fetchProfile(currentUser.uid);
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        // Listen for open games
        const q = query(collection(db, "games"), where("status", "==", "waiting"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const games = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setOpenGames(games);
        });
        return () => unsubscribe();
    }, []);

    const fetchProfile = async (uid: string) => {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
        } else {
            // Profile doesn't exist yet
            setProfile(null);
        }
        setLoading(false);
    };

    const handleSetScreenName = async () => {
        if (!user || !screenNameInput.trim()) return;
        const newProfile: UserProfile = {
            uid: user.uid,
            displayName: user.displayName || "Anonymous",
            photoURL: user.photoURL || "",
            screenName: screenNameInput,
            status: "online",
        };
        await setDoc(doc(db, "users", user.uid), newProfile);
        setProfile(newProfile);
    };

    const handleLogout = async () => {
        await signOut(auth);
        router.push("/");
    };

    const startSelfGame = () => {
        router.push("/game/local");
    };

    const createGame = async () => {
        if (!profile) return;
        const newGame = {
            white: { uid: profile.uid, screenName: profile.screenName, photoURL: profile.photoURL },
            black: null,
            fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            history: [],
            status: "waiting",
            createdAt: Date.now(),
        };
        const docRef = await addDoc(collection(db, "games"), newGame);
        router.push(`/game/${docRef.id}`);
    };

    const joinGame = async (gameId: string) => {
        if (!profile) return;
        const gameRef = doc(db, "games", gameId);
        await updateDoc(gameRef, {
            black: { uid: profile.uid, screenName: profile.screenName, photoURL: profile.photoURL },
            status: "active"
        });
        router.push(`/game/${gameId}`);
    };

    if (loading) return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">Loading...</div>;

    if (!profile) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white p-4">
                <div className="bg-neutral-900 p-8 rounded-2xl max-w-md w-full border border-neutral-800">
                    <h2 className="text-2xl font-bold mb-4">Choose your Screen Name</h2>
                    <input
                        type="text"
                        value={screenNameInput}
                        onChange={(e) => setScreenNameInput(e.target.value)}
                        className="w-full bg-neutral-800 border border-neutral-700 rounded p-3 mb-4 text-white focus:outline-none focus:border-purple-500"
                        placeholder="e.g. GrandmasterFlash"
                    />
                    <button
                        onClick={handleSetScreenName}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded transition-colors"
                    >
                        Continue
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-white p-6">
            <header className="flex justify-between items-center mb-12">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                    Chess Arena
                </h1>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-neutral-900 px-4 py-2 rounded-full border border-neutral-800">
                        {profile.photoURL && <img src={profile.photoURL} alt="Avatar" className="w-6 h-6 rounded-full" />}
                        <span className="font-medium">{profile.screenName}</span>
                    </div>
                    <button onClick={handleLogout} className="p-2 hover:bg-neutral-800 rounded-full transition-colors">
                        <LogOut className="w-5 h-5 text-neutral-400" />
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Actions */}
                <div className="space-y-4">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 hover:border-purple-500/50 transition-colors cursor-pointer group"
                        onClick={startSelfGame}
                    >
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                <Monitor className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold">Play vs Self</h3>
                        </div>
                        <p className="text-neutral-400">Practice your moves on a local board.</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 hover:border-blue-500/50 transition-colors cursor-pointer group"
                        onClick={createGame}
                    >
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                <Play className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold">Create Online Game</h3>
                        </div>
                        <p className="text-neutral-400">Start a new game and wait for a challenger.</p>
                    </motion.div>
                </div>

                {/* Lobby / History */}
                <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-green-400" />
                        Open Games
                    </h3>
                    <div className="space-y-2">
                        {openGames.length === 0 ? (
                            <p className="text-neutral-500 text-sm italic">No open games. Create one!</p>
                        ) : (
                            openGames.map((game) => (
                                <div key={game.id} className="flex items-center justify-between bg-neutral-800 p-3 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <img src={game.white.photoURL} className="w-6 h-6 rounded-full" />
                                        <span className="text-sm font-medium">{game.white.screenName}</span>
                                    </div>
                                    <button
                                        onClick={() => joinGame(game.id)}
                                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors"
                                    >
                                        Join
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
