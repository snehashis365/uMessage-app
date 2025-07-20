import React, { useState, useEffect } from "react";
import { Transition } from "react-transition-group";

export const isSender = (message, currentUserUid) =>
    (message.uid || message.senderId) === currentUserUid;

function ChatMessage({
    message,
    currentUserUid,
    animationState,
    showHandle,
    isDM,
    onMessageTap,
    isLastInSequence,
}) {
    const [showStatus, setShowStatus] = useState(false);
    const messageIsSender = isSender(message, currentUserUid);
    const messageClass = messageIsSender ? "sent" : "received";

    const transitionStyles = {
        entering: { opacity: 0, transform: "translateY(10px) scale(0.95)" },
        entered: { opacity: 1, transform: "translateY(0) scale(1)" },
        exiting: { opacity: 0, transform: "scale(0.9)" },
        exited: { opacity: 0, transform: "scale(0.9)" },
    };

    const handleTap = () => {
        if (onMessageTap && !messageIsSender) {
            onMessageTap(message);
        } else if (messageIsSender) {
            setShowStatus(!showStatus);
        }
    };

    const SendingIndicator = () => {
        const [dots, setDots] = useState("");
        useEffect(() => {
            const timer = setInterval(() => {
                setDots((d) => (d.length >= 3 ? "" : d + "."));
            }, 300);
            return () => clearInterval(timer);
        }, []);
        return <span className="text-xs text-zinc-500">Sending{dots}</span>;
    };

    return (
        <div
            className={`flex flex-col transition-all duration-300 ease-in-out ${messageClass === "sent" ? "items-end" : "items-start"} ${showHandle ? "mt-2" : "mt-1"}`}
            style={{ ...transitionStyles[animationState] }}
        >
            {showHandle && (
                <p className="text-xs text-zinc-400 ml-4 mb-1">
                    {message.nickname} {message.handle}
                </p>
            )}
            <div
                onClick={handleTap}
                className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-3xl break-words ${messageIsSender || (onMessageTap && !messageIsSender) ? "cursor-pointer" : ""} ${messageClass === "sent" ? "bg-blue-500 text-white rounded-br-lg" : "bg-zinc-700 text-white rounded-bl-lg"}`}
            >
                {message.text}
            </div>
            <div
                className={`mt-1 px-2 w-full max-w-xs md:max-w-md lg:max-w-lg flex ${messageClass === "sent" ? "justify-end" : "justify-start"} ${messageIsSender && (showStatus || isLastInSequence) ? "h-4" : "h-0"} transition-all`}
            >
                {messageIsSender && (showStatus || isLastInSequence) && (
                    <>
                        {message.status === "sending" && <SendingIndicator />}
                        {message.status && message.status !== "sending" && (
                            <span className="text-xs text-zinc-500">
                                {isDM
                                    ? message.status.charAt(0).toUpperCase() +
                                      message.status.slice(1)
                                    : "Sent"}
                            </span>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default ChatMessage;
