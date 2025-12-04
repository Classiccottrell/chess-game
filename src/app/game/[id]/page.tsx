"use client";

import { useState, useEffect, use } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, Copy } from "lucide-react";
import { doc, onSnapshot, updateDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function GamePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);

    const [game, setGame] = useState(new Chess());
    const [moveHistory, setMoveHistory] = useState<string[]>([]);
    const [user, setUser] = useState<any>(null);
    const [gameData, setGameData] = useState<any>(null);
    const [orientation, setOrientation] = useState<"white" | "black">("white");

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (id === "local") return;

        const unsubscribe = onSnapshot(doc(db, "games", id), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setGameData(data);

                // Update board state
                const newGame = new Chess(data.fen);
                setGame(newGame);
                setMoveHistory(data.history || []);

                // Determine orientation
                if (user && data.black?.uid === user.uid) {
                    setOrientation("black");
                } else {
                    setOrientation("white");
                }
            }
        });
        return () => unsubscribe();
    }, [id, user]);

    async function onDrop(sourceSquare: string, targetSquare: string) {
        // Local game logic
        if (id === "local") {
            const gameCopy = new Chess(game.fen());
            try {
                const result = gameCopy.move({
                    from: sourceSquare,
                    to: targetSquare,
                    promotion: "q",
                });
                if (result) {
                    setGame(gameCopy);
                    setMoveHistory(prev => [...prev, result.san]);
                    return true;
                }
            } catch (e) { return false; }
            return false;
        }

        // Online game logic
        if (!gameData || !user) return false;

        // Check turn
        if (game.turn() === 'w' && gameData.white.uid !== user.uid) return false;
        if (game.turn() === 'b' && (!gameData.black || gameData.black.uid !== user.uid)) return false;

        const gameCopy = new Chess(game.fen());
        try {
            const result = gameCopy.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: "q",
            });

            if (result) {
                // Optimistic update
                setGame(gameCopy);

                // Update Firestore
                await updateDoc(doc(db, "games", id), {
                    fen: gameCopy.fen(),
                    history: [...(gameData.history || []), result.san],
                    turn: gameCopy.turn(),
                    lastMove: Date.now()
                });
                return true;
            }
        } catch (e) { return false; }
        return false;
    }

    function resetGame() {
        if (id === "local") {
            setGame(new Chess());
            setMoveHistory([]);
        }
    }

    const copyGameId = () => {
        navigator.clipboard.writeText(id);
        alert("Game ID copied!");
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-white flex flex-col md:flex-row">
            {/* Sidebar / Info */}
            <div className="w-full md:w-80 bg-neutral-900 border-r border-neutral-800 p-6 flex flex-col">
                <button
                    onClick={() => router.push("/home")}
                    className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-8"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Home
                </button>

                <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                        {id === "local" ? "Practice Match" : "Online Match"}
                        {id !== "local" && (
                            <button onClick={copyGameId} className="p-1 hover:bg-neutral-800 rounded text-neutral-500 hover:text-white" title="Copy Game ID">
                                <Copy className="w-4 h-4" />
                            </button>
                        )}
                    </h2>
                    <p className="text-neutral-500 text-sm mb-4">
                        {id === "local" ? "Playing against yourself" : `ID: ${id}`}
                    </p>

                    {id !== "local" && gameData && (
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between p-2 bg-neutral-800 rounded">
                                <span className="text-neutral-400">White</span>
                                <span className="font-bold">{gameData.white?.screenName || "Unknown"}</span>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-neutral-800 rounded">
                                <span className="text-neutral-400">Black</span>
                                <span className="font-bold">{gameData.black?.screenName || "Waiting..."}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto bg-neutral-950 rounded-lg p-4 mb-4 border border-neutral-800">
                    <h3 className="text-sm font-bold text-neutral-400 mb-2 uppercase tracking-wider">Move History</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                        {moveHistory.map((move, i) => (
                            <div key={i} className="flex gap-2">
                                <span className="text-neutral-600">{Math.floor(i / 2) + 1}.</span>
                                <span className={i % 2 === 0 ? "text-white" : "text-neutral-400"}>{move}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {id === "local" && (
                    <button
                        onClick={resetGame}
                        className="flex items-center justify-center gap-2 w-full bg-neutral-800 hover:bg-neutral-700 text-white py-3 rounded-lg transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Reset Board
                    </button>
                )}
            </div>

            {/* Board Area */}
            <div className="flex-1 flex items-center justify-center p-4 bg-neutral-950">
                <div className="w-full max-w-[600px] aspect-square shadow-2xl shadow-purple-900/20 rounded-lg overflow-hidden border-4 border-neutral-800">
                    <Chessboard
                        position={game.fen()}
                        onPieceDrop={onDrop}
                        boardOrientation={orientation}
                        customDarkSquareStyle={{ backgroundColor: "#779556" }}
                        customLightSquareStyle={{ backgroundColor: "#ebecd0" }}
                        boardWidth={600}
                    />
                </div>
            </div>
        </div>
    );
}
