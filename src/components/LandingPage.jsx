import React from "react";
import { Globe, Users, Clock, Mail } from "lucide-react";

function LandingPage({ onLogin }) {
    const features = [
        {
            icon: <Users className="h-8 w-8" />,
            title: "Truly Anonymous",
            description:
                "No accounts, no sign-ups. Just join and start chatting. Your identity is never stored or tracked.",
        },
        {
            icon: <Clock className="h-8 w-8" />,
            title: "Disappearing Messages",
            description:
                "For your privacy, all messages are automatically deleted from the server 5 minutes after they are sent.",
        },
        {
            icon: <Globe className="h-8 w-8" />,
            title: "Unified Chat Room",
            description:
                "No separate channels. Everyone joins one single, unified conversation.",
        },
        {
            icon: <Mail className="h-8 w-8" />,
            title: "Anonymous Direct Messages",
            description:
                "Start private, one-on-one conversations with other users. All with the same privacy features.",
        },
    ];

    return (
        <div className="h-screen w-screen bg-black text-white flex flex-col items-center justify-center p-4 overflow-hidden">
            <style>{`@keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } } .scrolling-wrapper { animation: scroll 40s linear infinite; } .mask-image-lr{-webkit-mask-image:linear-gradient(to right,transparent,black 20%,black 80%,transparent);mask-image:linear-gradient(to right,transparent,black 20%,black 80%,transparent)}`}</style>
            <div className="text-center mb-12">
                <h1 className="text-5xl font-bold mb-3">uMessage</h1>
                <p className="text-lg text-zinc-400">
                    Ephemeral, Anonymous Chat.
                </p>
            </div>
            <div className="relative w-full max-w-4xl mx-auto overflow-hidden mask-image-lr">
                <div className="flex scrolling-wrapper">
                    {[...features, ...features].map((feature, index) => (
                        <div
                            key={index}
                            className="flex-shrink-0 w-72 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 mx-4"
                        >
                            <div className="text-blue-500 mb-4">
                                {feature.icon}
                            </div>
                            <h3 className="font-bold text-lg mb-2">
                                {feature.title}
                            </h3>
                            <p className="text-zinc-400 text-sm">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
            <div className="mt-12">
                <button
                    onClick={onLogin}
                    className="bg-blue-600 text-white font-bold py-3 px-8 rounded-full text-lg hover:bg-blue-500 transition-colors transform hover:scale-105"
                >
                    Join Anonymously
                </button>
            </div>
        </div>
    );
}

export default LandingPage;
