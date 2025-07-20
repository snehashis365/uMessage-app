import React from "react";

function ChatRoomHeader({ children, onBack }) {
    return (
        <header className="bg-zinc-900/70 backdrop-blur-md text-white p-3 border-b border-zinc-700 fixed top-0 left-0 right-0 z-10 flex items-center">
            <div className="w-20">{onBack}</div>
            <div className="flex-1 text-center">{children}</div>
            <div className="w-20"></div>
        </header>
    );
}

export default ChatRoomHeader;
