import React, { useState, useEffect, useRef } from "react";
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    serverTimestamp,
    doc,
    updateDoc,
    writeBatch,
    increment,
} from "firebase/firestore";
import { ref, onValue } from "firebase/database";
import { db, rtdb } from "../firebase/config";
import { Transition, TransitionGroup } from "react-transition-group";
import ChatRoomHeader from "./ChatRoomHeader";
import BackButton from "./BackButton";
import ChatMessage, { isSender } from "./ChatMessage";
import { Send } from "lucide-react";

function DirectMessageChat({ user, profile, chatId, setCurrentChat }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [otherUser, setOtherUser] = useState(null);
    const [otherUserStatus, setOtherUserStatus] = useState({ isOnline: false });
    const messagesEndRef = useRef(null);

    // Mark chat as read immediately on open
    useEffect(() => {
        const chatRef = doc(db, "chats", chatId);
        updateDoc(chatRef, { [`unreadCount.${user.uid}`]: 0 });
    }, [chatId, user.uid]);

    useEffect(() => {
        const chatRef = doc(db, "chats", chatId);
        const unsubscribe = onSnapshot(chatRef, (doc) => {
            const chatData = doc.data();
            const otherUserId = chatData.participants.find(
                (p) => p !== user.uid,
            );
            setOtherUser({
                uid: otherUserId,
                ...chatData.participantProfiles[otherUserId],
            });
        });
        return unsubscribe;
    }, [chatId, user.uid]);

    useEffect(() => {
        if (!otherUser) return;
        const statusRef = ref(rtdb, "/status/" + otherUser.uid);
        const unsubscribe = onValue(statusRef, (snapshot) => {
            setOtherUserStatus(snapshot.val() || { isOnline: false });
        });
        return unsubscribe;
    }, [otherUser]);

    useEffect(() => {
        const messagesRef = collection(db, `chats/${chatId}/messages`);
        const q = query(messagesRef, orderBy("createdAt", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const serverMessages = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
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
    }, [chatId]);

    // This useEffect now only handles marking received messages as 'read'
    useEffect(() => {
        const messagesToUpdate = messages.filter(
            (m) => m.recipientId === user.uid && m.status !== "read",
        );
        if (messagesToUpdate.length > 0) {
            const batch = writeBatch(db);
            messagesToUpdate.forEach((m) => {
                batch.update(doc(db, `chats/${chatId}/messages`, m.id), {
                    status: "read",
                });
            });
            batch.commit();
        }
    }, [messages, chatId, user.uid]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === "" || !otherUser) return;

        const textToSend = newMessage;
        const tempId = `temp_${Date.now()}`;
        setNewMessage("");

        const optimisticMessage = {
            id: tempId,
            text: textToSend,
            senderId: user.uid,
            recipientId: otherUser.uid,
            createdAt: { toDate: () => new Date() },
            status: "sending",
        };
        setMessages((prev) => [...prev, optimisticMessage]);

        try {
            const isDelivered = otherUserStatus.isOnline;
            const messageData = {
                text: textToSend,
                senderId: user.uid,
                recipientId: otherUser.uid,
                createdAt: serverTimestamp(),
                status: isDelivered ? "delivered" : "sent",
                deliveredAt: isDelivered ? serverTimestamp() : null,
                tempId: tempId,
            };

            await addDoc(
                collection(db, `chats/${chatId}/messages`),
                messageData,
            );
            await updateDoc(doc(db, "chats", chatId), {
                lastMessage: { text: textToSend, timestamp: serverTimestamp() },
                [`unreadCount.${otherUser.uid}`]: increment(1),
            });
        } catch (error) {
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
        }
    };

    return (
        <div className="flex flex-col bg-black h-[100dvh]">
            <ChatRoomHeader
                onBack={
                    <BackButton
                        setCurrentChat={setCurrentChat}
                        user={user}
                        activeChatId={chatId}
                    />
                }
            >
                <div>
                    <h1 className="font-bold text-lg">{otherUser?.nickname}</h1>
                </div>
            </ChatRoomHeader>
            <main className="flex-1 overflow-y-auto p-4">
                <div className="h-16"></div> {/* Spacer for header */}
                <TransitionGroup component={null}>
                    {messages.map((msg, index) => (
                        <Transition key={msg.id} timeout={300}>
                            {(state) => (
                                <ChatMessage
                                    message={msg}
                                    currentUserUid={user.uid}
                                    animationState={state}
                                    showHandle={false}
                                    isDM={true}
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
                <div className="h-20"></div> {/* Spacer for footer */}
            </main>
            <footer className="fixed bottom-0 left-0 right-0 bg-black/50 backdrop-blur-lg p-2 pb-4 border-t border-zinc-800">
                <form
                    onSubmit={sendMessage}
                    className="flex items-center space-x-2 max-w-4xl mx-auto px-2"
                >
                    <input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={`Message ${otherUser?.nickname || ""}`}
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
        </div>
    );
}

export default DirectMessageChat;
