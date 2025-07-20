import React from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

function DMFromGlobalModal({
    user,
    profile,
    selectedMessage,
    onClose,
    setCurrentChat,
}) {
    const handleStartDM = async () => {
        const otherUserId = selectedMessage.uid;
        const otherUserProfile = {
            nickname: selectedMessage.nickname,
            handle: selectedMessage.handle,
        };

        const chatId = [user.uid, otherUserId].sort().join("_");
        const chatRef = doc(db, "chats", chatId);
        const chatSnap = await getDoc(chatRef);

        if (!chatSnap.exists()) {
            await setDoc(chatRef, {
                participants: [user.uid, otherUserId],
                participantProfiles: {
                    [user.uid]: profile,
                    [otherUserId]: otherUserProfile,
                },
                createdAt: serverTimestamp(),
                lastMessage: {
                    text: "Chat started.",
                    timestamp: serverTimestamp(),
                },
                unreadCount: { [user.uid]: 0, [otherUserId]: 0 },
            });
        }
        setCurrentChat({ type: "dm", chatId });
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-800 p-6 rounded-lg w-full max-w-sm text-center">
                <p className="mb-4">
                    Start a direct message with{" "}
                    <span className="font-bold">
                        {selectedMessage.nickname}
                    </span>
                    ?
                </p>
                <div className="flex justify-center space-x-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded bg-zinc-600"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleStartDM}
                        className="px-6 py-2 rounded bg-blue-600"
                    >
                        Message
                    </button>
                </div>
            </div>
        </div>
    );
}

export default DMFromGlobalModal;
