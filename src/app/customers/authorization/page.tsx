"use client";
import React, { useState } from "react";

const ENPHASE_AUTH_URL = "https://api.enphaseenergy.com/oauth/authorize";
const CLIENT_ID = "ba5228e4f843a94607e6cc245043bc54";
const REDIRECT_URI = "https://api.enphaseenergy.com/oauth/redirect_uri";

export default function AuthorizationPage() {
  const [authCode, setAuthCode] = useState("");
  const [isAuthWindowOpen, setIsAuthWindowOpen] = useState(false);
  const [message, setMessage] = useState("");

  // Get token from URL
  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const token = urlParams ? urlParams.get("token") : null;

  const openEnphaseAuth = () => {
    const authUrl = `${ENPHASE_AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const authWindowRef = window.open(
      authUrl,
      "EnphaseAuth",
      `width=${width},height=${height},left=${left},top=${top}`
    );
    setIsAuthWindowOpen(true);
    const checkWindow = setInterval(() => {
      if (authWindowRef?.closed) {
        clearInterval(checkWindow);
        setIsAuthWindowOpen(false);
      }
    }, 500);
  };

  const handleSave = async () => {
    setMessage("");
    if (!authCode || !token) {
      setMessage("Authorization code and token are required.");
      return;
    }
    const res = await fetch("/api/customers/complete-authorization", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, authorization_code: authCode }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage("Authorization completed successfully!");
    } else {
      setMessage(data.error || "Failed to complete authorization.");
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "100px auto", padding: 24, border: "1px solid #eee", borderRadius: 8 }}>
      <h2>Enphase Authorization</h2>
      <div style={{ margin: "16px 0" }}>
        <label>Authorization Code</label>
        <input
          type="text"
          value={authCode}
          onChange={e => setAuthCode(e.target.value)}
          style={{ width: "100%", padding: 8, marginTop: 4, marginBottom: 8 }}
        />
        <button onClick={openEnphaseAuth} disabled={isAuthWindowOpen} style={{ marginRight: 8 }}>
          {isAuthWindowOpen ? "Window Open" : "Get Auth Code"}
        </button>
        <button onClick={handleSave} style={{ background: "#22c55e", color: "white", padding: "8px 16px", border: "none", borderRadius: 4 }}>
          Save
        </button>
      </div>
      {message && <div style={{ color: message.includes("success") ? "green" : "red" }}>{message}</div>}
    </div>
  );
} 