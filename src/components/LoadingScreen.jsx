import React from "react";

const LoadingScreen = ({ text }) => (
    <div className="h-screen w-screen flex items-center justify-center bg-black text-white p-4 text-center">
        <p>{text}</p>
    </div>
);

export default LoadingScreen;
