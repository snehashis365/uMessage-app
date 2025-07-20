import React, { useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithCustomToken,
} from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import {
  ref,
  onValue,
  set,
  onDisconnect,
  serverTimestamp as dbServerTimestamp,
} from "firebase/database";

import { auth, db, rtdb } from "./firebase/config";

import LoadingScreen from "./components/LoadingScreen";
import LandingPage from "./components/LandingPage";
import NicknameSelector from "./components/NicknameSelector";
import ChatListPage from "./components/ChatListPage";
import ChatRoom from "./components/ChatRoom"; // <-- Import the new unified component

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(undefined);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [currentChat, setCurrentChat] = useState({ type: "list" });

  // --- Presence Management (RTDB) ---
  useEffect(() => {
    if (!user || !profile) return;

    const userStatusDatabaseRef = ref(rtdb, "/status/" + user.uid);
    const isOnlineForRTDB = {
      isOnline: true,
      last_changed: dbServerTimestamp(),
    };
    const isOfflineForRTDB = {
      isOnline: false,
      last_changed: dbServerTimestamp(),
    };

    const userStatusFirestoreRef = doc(db, "users", user.uid);
    const isOnlineForFirestore = {
      isOnline: true,
      lastSeen: serverTimestamp(),
    };

    const con = ref(rtdb, ".info/connected");
    const unsubscribe = onValue(con, (snapshot) => {
      if (snapshot.val() === false) return;
      onDisconnect(userStatusDatabaseRef)
        .set(isOfflineForRTDB)
        .then(() => {
          set(userStatusDatabaseRef, isOnlineForRTDB);
          updateDoc(userStatusFirestoreRef, isOnlineForFirestore);
        });
    });
    return () => unsubscribe();
  }, [user, profile]);

  // --- Auth State Listener ---
  useEffect(() => {
    const handleAuthChange = async (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        setProfile(docSnap.exists() ? docSnap.data() : null);
      } else {
        setProfile(undefined);
        setCurrentChat({ type: "list" });
      }
    };
    const unsubscribe = onAuthStateChanged(auth, handleAuthChange);
    return () => unsubscribe();
  }, []);

  // --- PWA Setup ---
  useEffect(() => {
    const manifest = {
      name: "uMessage",
      short_name: "uMessage",
      start_url: ".",
      display: "standalone",
      background_color: "#000000",
      theme_color: "#0B84FF",
      icons: [
        {
          src: "https://placehold.co/512x512/0B84FF/FFFFFF?text=UM",
          sizes: "512x512",
          type: "image/png",
        },
      ],
    };
    const manifestBlob = new Blob([JSON.stringify(manifest)], {
      type: "application/json",
    });
    const manifestUrl = URL.createObjectURL(manifestBlob);
    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = manifestUrl;
    document.head.appendChild(link);

    const metaViewport =
      document.querySelector('meta[name="viewport"]') ||
      document.createElement("meta");
    metaViewport.name = "viewport";
    metaViewport.content =
      "width=device-width, initial-scale=1, user-scalable=no, viewport-fit=cover";
    if (!metaViewport.parentNode) document.head.appendChild(metaViewport);
  }, []);

  const handleLogin = async () => {
    setIsAuthLoading(true);
    try {
      const initialToken =
        typeof __initial_auth_token !== "undefined"
          ? __initial_auth_token
          : null;
      if (initialToken) {
        await signInWithCustomToken(auth, initialToken);
      } else {
        await signInAnonymously(auth);
      }
    } catch (error) {
      setIsAuthLoading(false);
    }
  };

  if (isAuthLoading) return <LoadingScreen text="Loading..." />;
  if (!user) return <LandingPage onLogin={handleLogin} />;
  if (profile === undefined) return <LoadingScreen text="Loading Profile..." />;
  if (profile === null)
    return <NicknameSelector user={user} onProfileCreated={setProfile} />;

  // --- UPDATED ROUTER ---
  switch (currentChat.type) {
    case "global":
    case "dm":
      return (
        <ChatRoom
          user={user}
          profile={profile}
          chatConfig={currentChat}
          setCurrentChat={setCurrentChat}
        />
      );
    default:
      return (
        <ChatListPage
          user={user}
          profile={profile}
          setCurrentChat={setCurrentChat}
        />
      );
  }
}
