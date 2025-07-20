import React, { useState, useEffect } from "react";
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    doc,
    deleteDoc,
} from "firebase/firestore";
import { deleteUser } from "firebase/auth";
import {
    ref,
    set,
    serverTimestamp as dbServerTimestamp,
} from "firebase/database";
import { db, auth, rtdb } from "../firebase/config";
import NewChatModal from "./NewChatModal";
import { Globe, PlusSquare, LogOut } from "lucide-react";

function ChatListPage({ user, profile, setCurrentChat }) {
    const [chats, setChats] = useState([]);
    const [showNewChatModal, setShowNewChatModal] = useState(false);

    useEffect(() => {
        const q = query(
            collection(db, "chats"),
            where("participants", "array-contains", user.uid),
            orderBy("lastMessage.timestamp", "desc"),
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chatList = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setChats(chatList);
        });
        return unsubscribe;
    }, [user.uid]);

    const handleLogout = async () => {
        const userToDelete = auth.currentUser;
        if (!userToDelete) return;
        try {
            await set(ref(rtdb, "/status/" + userToDelete.uid), {
                isOnline: false,
                last_changed: dbServerTimestamp(),
            });
            await deleteDoc(doc(db, "users", userToDelete.uid));
            await deleteUser(userToDelete);
        } catch (error) {
            console.error("Error during account deletion:", error);
        }
    };

    return (
        <div className="h-screen bg-black text-white flex flex-col">
            <header className="p-4 border-b border-zinc-800 flex justify-between items-center">
                <h1 className="text-2xl font-bold">Chats</h1>
                <div>
                    <button
                        onClick={() => setShowNewChatModal(true)}
                        className="mr-4 text-blue-500 hover:text-blue-400 inline-flex items-center"
                    >
                        <PlusSquare className="h-5 w-5 mr-1" />
                        New Chat
                    </button>
                    <button
                        onClick={handleLogout}
                        className="text-zinc-500 hover:text-red-500 inline-flex items-center"
                    >
                        <LogOut className="h-5 w-5 mr-1" />
                        Logout
                    </button>
                </div>
            </header>
            <div className="flex-1 overflow-y-auto">
                <div
                    onClick={() => setCurrentChat({ type: "global" })}
                    className="flex items-center p-3 m-2 rounded-lg hover:bg-zinc-800 cursor-pointer"
                >
                    <div className="w-12 h-12 bg-zinc-700 rounded-full flex items-center justify-center mr-4">
                        <Globe className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="font-bold">Global Chat</h2>
                        <p className="text-sm text-zinc-400">
                            Talk with everyone
                        </p>
                    </div>
                </div>
                {chats.map((chat) => {
                    const otherUserId = chat.participants.find(
                        (p) => p !== user.uid,
                    );
                    const otherProfile = chat.participantProfiles[otherUserId];
                    const unreadCount = chat.unreadCount?.[user.uid] || 0;
                    return (
                        <div
                            key={chat.id}
                            onClick={() =>
                                setCurrentChat({ type: "dm", chatId: chat.id })
                            }
                            className="flex items-center p-3 m-2 rounded-lg hover:bg-zinc-800 cursor-pointer"
                        >
                            <div className="relative w-12 h-12 mr-4">
                                <div className="w-12 h-12 bg-zinc-700 rounded-full flex items-center justify-center text-lg">
                                    {otherProfile?.nickname
                                        .charAt(0)
                                        .toUpperCase()}
                                </div>
                                {otherProfile?.isOnline && (
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black"></div>
                                )}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <h2 className="font-bold truncate">
                                    {otherProfile?.nickname}{" "}
                                    <span className="text-sm text-zinc-500">
                                        {otherProfile?.handle}
                                    </span>
                                </h2>
                                <p
                                    className={`text-sm truncate ${unreadCount > 0 ? "text-white font-bold" : "text-zinc-400"}`}
                                >
                                    {chat.lastMessage?.text}
                                </p>
                            </div>
                            {unreadCount > 0 && (
                                <div className="ml-auto w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                    {unreadCount}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {showNewChatModal && (
                <NewChatModal
                    user={user}
                    profile={profile}
                    onClose={() => setShowNewChatModal(false)}
                    setCurrentChat={setCurrentChat}
                />
            )}
        </div>
    );
}

export default ChatListPage;
