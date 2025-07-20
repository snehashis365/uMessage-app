import React, { useState, useEffect, useRef } from "react";
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    addDoc,
    serverTimestamp,
    Timestamp,
    getDoc,
    doc,
    setDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { Transition, TransitionGroup } from "react-transition-group";
import ChatRoomHeader from "./ChatRoomHeader";
import BackButton from "./BackButton";
import ChatMessage, { isSender } from "./ChatMessage";
import DMFromGlobalModal from "./DMFromGlobalModal";
import { Send } from "lucide-react";

function GlobalChatRoom({ user, profile, setCurrentChat }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [selectedMessage, setSelectedMessage] = useState(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const fiveMinutesAgo = Timestamp.fromMillis(Date.now() - 5 * 60 * 1000);
        const q = query(
            collection(db, "global_messages"),
            where("createdAt", ">", fiveMinutesAgo),
            orderBy("createdAt", "asc"),
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const serverMessages = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                status: "sent",
            }));

            setMessages((currentMessages) => {
                const optimisticMessages = currentMessages.filter(
                    (m) => m.status === "sending",
                );
                const newMessages = [...serverMessages];

                optimisticMessages.forEach((optMsg) => {
                    if (
                        !newMessages.find((sMsg) => sMsg.tempId === optMsg.id)
                    ) {
                        newMessages.push(optMsg);
                    }
                });

                return newMessages;
            });
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === "") return;
        const textToSend = newMessage;
        const tempId = `temp_${Date.now()}`;
        setNewMessage("");

        const optimisticMessage = {
            id: tempId,
            text: textToSend,
            uid: user.uid,
            handle: profile.handle,
            nickname: profile.nickname,
            createdAt: { toDate: () => new Date() },
            status: "sending",
        };

        setMessages((prev) => [...prev, optimisticMessage]);

        try {
            await addDoc(collection(db, "global_messages"), {
                text: textToSend,
                createdAt: serverTimestamp(),
                uid: user.uid,
                handle: profile.handle,
                nickname: profile.nickname,
                tempId: tempId, // Include tempId to reconcile
            });
        } catch (error) {
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
        }
    };

    return (
        <div className="h-screen bg-black">
            {" "}
            {/* Main container for viewport height */}
            <ChatRoomHeader
                onBack={
                    <BackButton setCurrentChat={setCurrentChat} user={user} />
                }
            >
                <h1 className="font-bold text-lg">Global Chat</h1>
            </ChatRoomHeader>
            {/* Scrollable message area */}
            <main className="h-full overflow-y-auto p-4 pt-20 pb-24">
                <TransitionGroup component={null}>
                    {messages.map((msg, index) => (
                        <Transition key={msg.id} timeout={300}>
                            {(state) => (
                                <ChatMessage
                                    message={msg}
                                    currentUserUid={user.uid}
                                    animationState={state}
                                    showHandle={
                                        index === 0 ||
                                        messages[index - 1].uid !== msg.uid
                                    }
                                    onMessageTap={setSelectedMessage}
                                    isLastInSequence={
                                        isSender(msg, user.uid) &&
                                        (index === messages.length - 1 ||
                                            !isSender(
                                                messages[index + 1],
                                                user.uid,
                                            ))
                                    }
                                />
                            )}
                        </Transition>
                    ))}
                </TransitionGroup>
                <div ref={messagesEndRef} />
            </main>
            <footer className="fixed bottom-0 left-0 right-0 bg-black/50 backdrop-blur-lg p-2 pb-4 border-t border-zinc-800">
                <form
                    onSubmit={sendMessage}
                    className="flex items-center space-x-2 max-w-4xl mx-auto px-2"
                >
                    <input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Message Global Chat"
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-full py-2 px-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage}
                        className="bg-blue-600 text-white rounded-full p-2 disabled:bg-zinc-700"
                    >
                        <Send className="w-6 h-6" />
                    </button>
                </form>
            </footer>
            {selectedMessage && (
                <DMFromGlobalModal
                    user={user}
                    profile={profile}
                    selectedMessage={selectedMessage}
                    onClose={() => setSelectedMessage(null)}
                    setCurrentChat={setCurrentChat}
                />
            )}
        </div>
    );
}

export default GlobalChatRoom;
