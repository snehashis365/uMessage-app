import React, { useState } from "react";
import {
    collection,
    query,
    where,
    getDocs,
    serverTimestamp,
    setDoc,
    doc,
} from "firebase/firestore";
import { db } from "../firebase/config";

function NicknameSelector({ user, onProfileCreated }) {
    const [nickname, setNickname] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (nickname.trim().length < 3)
            return setError("Nickname must be at least 3 characters.");
        setIsLoading(true);
        setError("");
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("nickname", "==", nickname.trim()));
            const querySnapshot = await getDocs(q);
            const handleNumber = querySnapshot.size + 1;
            const handle = `@${nickname.trim().toLowerCase()}-${String(handleNumber).padStart(4, "0")}`;
            const userProfile = {
                nickname: nickname.trim(),
                handle: handle,
                lastSeen: serverTimestamp(),
                isOnline: true,
            };
            await setDoc(doc(db, "users", user.uid), userProfile);
            onProfileCreated(userProfile);
        } catch (err) {
            setError(
                "Could not create profile. Please check your Firestore indexes.",
            );
            setIsLoading(false);
        }
    };

    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-black text-white p-4">
            <div className="w-full max-w-sm text-center">
                <h1 className="text-3xl font-bold mb-2">Welcome to uMessage</h1>
                <p className="text-zinc-400 mb-8">
                    Choose a nickname for this session.
                </p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="Enter your nickname"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-3 px-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        maxLength={20}
                    />
                    {error && (
                        <p className="text-red-500 text-sm mt-2">{error}</p>
                    )}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full mt-4 bg-blue-600 text-white rounded-lg py-3 font-bold disabled:bg-zinc-700 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? "Generating handle..." : "Start Chatting"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default NicknameSelector;
