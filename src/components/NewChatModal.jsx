import React, { useState } from "react";
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    setDoc,
    getDoc,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";

function NewChatModal({ user, profile, onClose, setCurrentChat }) {
    const [handle, setHandle] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleStartChat = async (e) => {
        e.preventDefault();
        if (!handle.startsWith("@"))
            return setError("Handle must start with @");
        setIsLoading(true);
        setError("");
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("handle", "==", handle));
            const userSnapshot = await getDocs(q);

            if (userSnapshot.empty) {
                setError("User not found.");
                setIsLoading(false);
                return;
            }

            const otherUserDoc = userSnapshot.docs[0];
            if (otherUserDoc.id === user.uid) {
                setError("You can't chat with yourself.");
                setIsLoading(false);
                return;
            }

            const chatId = [user.uid, otherUserDoc.id].sort().join("_");
            const chatRef = doc(db, "chats", chatId);
            const chatSnap = await getDoc(chatRef);

            if (!chatSnap.exists()) {
                await setDoc(chatRef, {
                    participants: [user.uid, otherUserDoc.id],
                    participantProfiles: {
                        [user.uid]: profile,
                        [otherUserDoc.id]: otherUserDoc.data(),
                    },
                    createdAt: serverTimestamp(),
                    lastMessage: {
                        text: "Chat started.",
                        timestamp: serverTimestamp(),
                    },
                    unreadCount: { [user.uid]: 0, [otherUserDoc.id]: 0 },
                });
            }
            setCurrentChat({ type: "dm", chatId });
        } catch (err) {
            setError("Failed to start chat. Check Firestore indexes.");
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-800 p-6 rounded-lg w-full max-w-sm">
                <h2 className="text-xl font-bold mb-4">New Direct Message</h2>
                <form onSubmit={handleStartChat}>
                    <input
                        type="text"
                        value={handle}
                        onChange={(e) => setHandle(e.target.value)}
                        placeholder="Enter user's @handle"
                        className="w-full bg-zinc-700 rounded p-2 mb-4"
                    />
                    {error && (
                        <p className="text-red-500 text-sm mb-4">{error}</p>
                    )}
                    <div className="flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded bg-zinc-600"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 rounded bg-blue-600"
                        >
                            {isLoading ? "Starting..." : "Chat"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default NewChatModal;
