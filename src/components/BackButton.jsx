import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { ChevronLeft } from "lucide-react";

function BackButton({ setCurrentChat, user, activeChatId }) {
    // Added activeChatId prop
    const [totalUnread, setTotalUnread] = useState(0);

    useEffect(() => {
        const q = query(
            collection(db, "chats"),
            where("participants", "array-contains", user.uid),
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            // FIX: Exclude the currently active chat from the unread count
            const unread = snapshot.docs.reduce((acc, doc) => {
                if (doc.id === activeChatId) {
                    return acc; // Don't count the current chat
                }
                return acc + (doc.data().unreadCount?.[user.uid] || 0);
            }, 0);
            setTotalUnread(unread);
        });
        return unsubscribe;
    }, [user.uid, activeChatId]); // Added activeChatId to dependency array

    return (
        <button
            onClick={() => setCurrentChat({ type: "list" })}
            className="relative text-blue-500 hover:text-blue-400"
        >
            <ChevronLeft className="h-6 w-6" />
            {totalUnread > 0 && (
                <div className="absolute -top-1 left-4 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                    {totalUnread}
                </div>
            )}
        </button>
    );
}

export default BackButton;
