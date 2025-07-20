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
    doc,
    setDoc,
    getDoc,
    updateDoc,
    writeBatch,
    increment,
} from "firebase/firestore";
import { ref, onValue, get } from "firebase/database";
import { db, rtdb } from "../firebase/config";
import { Transition, TransitionGroup } from "react-transition-group";
import BackButton from "./BackButton";
import ChatMessage, { isSender } from "./ChatMessage";
import DMFromGlobalModal from "./DMFromGlobalModal";
import { Send } from "lucide-react";

function ChatRoomHeader({ children, onBack }) {
    return (
        <header className="bg-zinc-900/70 backdrop-blur-md text-white p-3 border-b border-zinc-700 fixed top-0 left-0 right-0 z-10 flex items-center">
            <div className="w-20">{onBack}</div>
            <div className="flex-1 text-center">{children}</div>
            <div className="w-20"></div>
        </header>
    );
}

function ChatRoom({ user, profile, chatConfig, setCurrentChat }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [otherUser, setOtherUser] = useState(null);
    const [otherUserStatus, setOtherUserStatus] = useState({ isOnline: false });
    const [selectedMessage, setSelectedMessage] = useState(null);
    const messagesEndRef = useRef(null);

    const isGlobal = chatConfig.type === "global";
    const collectionPath = isGlobal
        ? "global_messages"
        : `chats/${chatConfig.chatId}/messages`;

    // --- Message Fetching & Optimistic UI ---
    useEffect(() => {
        const messagesRef = collection(db, collectionPath);
        const q = isGlobal
            ? query(
                  messagesRef,
                  where(
                      "createdAt",
                      ">",
                      Timestamp.fromMillis(Date.now() - 5 * 60 * 1000),
                  ),
                  orderBy("createdAt", "asc"),
              )
            : query(messagesRef, orderBy("createdAt", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const serverMessages = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                status: isGlobal ? "sent" : doc.data().status,
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
    }, [collectionPath, isGlobal]);

    // --- DM Specific Logic ---
    useEffect(() => {
        if (isGlobal) return;

        // Mark chat as read on open
        const chatRef = doc(db, "chats", chatConfig.chatId);
        updateDoc(chatRef, { [`unreadCount.${user.uid}`]: 0 });

        // Get other user's profile
        const unsubChat = onSnapshot(chatRef, (doc) => {
            const chatData = doc.data();
            const otherUserId = chatData.participants.find(
                (p) => p !== user.uid,
            );
            setOtherUser({
                uid: otherUserId,
                ...chatData.participantProfiles[otherUserId],
            });
        });

        // Mark received messages as read
        const messagesToUpdate = messages.filter(
            (m) => m.recipientId === user.uid && m.status !== "read",
        );
        if (messagesToUpdate.length > 0) {
            const batch = writeBatch(db);
            messagesToUpdate.forEach((m) => {
                batch.update(doc(db, collectionPath, m.id), { status: "read" });
            });
            batch.commit();
        }

        return () => unsubChat();
    }, [chatConfig.chatId, user.uid, isGlobal, messages, collectionPath]);

    // --- DM Presence Tracking ---
    useEffect(() => {
        if (isGlobal || !otherUser) return;
        const statusRef = ref(rtdb, "/status/" + otherUser.uid);
        const unsubscribe = onValue(statusRef, (snapshot) => {
            setOtherUserStatus(snapshot.val() || { isOnline: false });
        });
        return unsubscribe;
    }, [isGlobal, otherUser]);

    // --- Scroll to bottom ---
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // --- Send Message Handler ---
    const sendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === "" || (!isGlobal && !otherUser)) return;

        const textToSend = newMessage;
        const tempId = `temp_${Date.now()}`;
        setNewMessage("");

        const optimisticMessage = {
            id: tempId,
            text: textToSend,
            createdAt: { toDate: () => new Date() },
            status: "sending",
            uid: isGlobal ? user.uid : undefined,
            senderId: isGlobal ? undefined : user.uid,
            recipientId: isGlobal ? undefined : otherUser?.uid,
            handle: profile.handle,
            nickname: profile.nickname,
        };
        setMessages((prev) => [...prev, optimisticMessage]);

        try {
            let messageData;
            if (isGlobal) {
                messageData = {
                    text: textToSend,
                    createdAt: serverTimestamp(),
                    uid: user.uid,
                    handle: profile.handle,
                    nickname: profile.nickname,
                    tempId: tempId,
                };
            } else {
                const isDelivered = otherUserStatus.isOnline;
                messageData = {
                    text: textToSend,
                    senderId: user.uid,
                    recipientId: otherUser.uid,
                    createdAt: serverTimestamp(),
                    status: isDelivered ? "delivered" : "sent",
                    deliveredAt: isDelivered ? serverTimestamp() : null,
                    tempId: tempId,
                };
            }

            await addDoc(collection(db, collectionPath), messageData);

            if (!isGlobal) {
                await updateDoc(doc(db, "chats", chatConfig.chatId), {
                    lastMessage: {
                        text: textToSend,
                        timestamp: serverTimestamp(),
                    },
                    [`unreadCount.${otherUser.uid}`]: increment(1),
                });
            }
        } catch (error) {
            console.error("Failed to send message:", error);
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
                        activeChatId={isGlobal ? null : chatConfig.chatId}
                    />
                }
            >
                <h1 className="font-bold text-lg">
                    {isGlobal ? "Global Chat" : otherUser?.nickname}
                </h1>
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
                                    showHandle={
                                        isGlobal &&
                                        (index === 0 ||
                                            messages[index - 1].uid !== msg.uid)
                                    }
                                    onMessageTap={
                                        isGlobal ? setSelectedMessage : null
                                    }
                                    isDM={!isGlobal}
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
                        placeholder={
                            isGlobal
                                ? "Message Global Chat"
                                : `Message ${otherUser?.nickname || ""}`
                        }
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

export default ChatRoom;
