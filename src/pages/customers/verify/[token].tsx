import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/utils/supabase/browserClient";
import { toast } from "react-toastify";

const ENPHASE_AUTH_URL = "https://api.enphaseenergy.com/oauth/authorize";
const CLIENT_ID = "ba5228e4f843a94607e6cc245043bc54";
const REDIRECT_URI = "https://api.enphaseenergy.com/oauth/redirect_uri";

export default function CustomerVerifyPage() {
  const router = useRouter();
  const { token } = router.query;
  const [authCode, setAuthCode] = useState("");
  const [isAuthWindowOpen, setIsAuthWindowOpen] = useState(false);
  const [authWindow, setAuthWindow] = useState<Window | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Validate token and get customerId
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`/api/customers/verify-token?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid && data.customerId) {
          console.log("Retrieved customer ID from token:", data.customerId);
          setCustomerId(data.customerId);
          setError(null);
        } else {
          setError("Invalid or expired verification link.");
        }
      })
      .catch(() => setError("Invalid or expired verification link."))
      .finally(() => setLoading(false));
  }, [token]);

  // Listen for message from Enphase auth window
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // Check if the message contains the authorization code
      if (event.data && event.data.code) {
        setAuthCode(event.data.code);
        setIsAuthWindowOpen(false);
        setAuthWindow(null);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const openEnphaseAuth = () => {
    const authUrl = `${ENPHASE_AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const authWindowRef = window.open(
      authUrl,
      "EnphaseAuth",
      `width=${width},height=${height},left=${left},top=${top}`,
    );
    setAuthWindow(authWindowRef);
    setIsAuthWindowOpen(true);
    const checkWindow = setInterval(() => {
      if (authWindowRef?.closed) {
        clearInterval(checkWindow);
        setIsAuthWindowOpen(false);
        setAuthWindow(null);
      }
    }, 500);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!customerId) return;
    setSubmitting(true);
    console.log("Submitting verification:", { customerId, authCode, token });

    try {
      // First get refresh token from Enphase API if auth code is provided
      let refreshToken = null;

      if (authCode) {
        try {
          const tokenResponse = await fetch("/api/enphase-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: authCode }),
          });

          const tokenData = await tokenResponse.json();

          if (!tokenResponse.ok) {
            throw new Error(tokenData.error || "Failed to get Enphase token");
          }

          refreshToken = tokenData.refresh_token;
        } catch (tokenError) {
          console.error("Error getting Enphase token:", tokenError);
          toast.error(
            "Failed to authorize with Enphase. The authorization code may be expired or invalid.",
          );
          setSubmitting(false);
          return;
        }
      }

      // Now complete the authorization
      console.log("About to make API call to complete-authorization.js");
      console.log("Request payload:", {
        customerId,
        authCode,
        token,
        refreshToken,
      });

      const apiUrl = "/api/customers/complete-authorization";
      console.log("API URL:", apiUrl);
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          authCode,
          token,
          refreshToken,
        }),
      });

      console.log("API response status:", res.status);
      const data = await res.json();
      console.log("API response data:", data);

      if (res.ok) {
        setSuccess(true);
        toast.success("Verification complete!");
      } else {
        toast.error(data.error || "Failed to complete verification.");
      }
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("An error occurred during verification.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  if (error)
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow">
          <h2 className="mb-2 text-2xl font-bold text-red-600">
            Verification Error
          </h2>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    );
  if (success)
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow">
          <svg
            className="mx-auto mb-4 h-16 w-16 text-green-500"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2l4 -4"
            />
          </svg>
          <h2 className="mb-2 text-2xl font-bold text-green-600">
            Verification Complete!
          </h2>
          <p className="text-gray-700">
            Thank you. Your account is now verified.
          </p>
        </div>
      </div>
    );

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <div className="mb-6 flex items-center justify-center">
          <img
            src="/images/logo/logo.svg"
            alt="Greenlight Energy"
            className="h-10"
          />
        </div>
        <h2 className="mb-2 text-center text-2xl font-bold text-primary">
          Customer Verification
        </h2>
        <p className="mb-6 text-center text-gray-600">
          Please complete your verification by entering your Enphase
          authorization code below.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              placeholder="Enter Authorization Code"
              className="w-full rounded border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isAuthWindowOpen || submitting}
              required
            />
            <button
              type="button"
              onClick={openEnphaseAuth}
              disabled={isAuthWindowOpen || submitting}
              className="rounded bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary/90"
            >
              {isAuthWindowOpen ? "Window Open" : "Get Auth Code"}
            </button>
          </div>
          <div className="mb-4 text-sm text-gray-600">
            <ol className="list-decimal pl-4">
              <li>Click the "Get Auth Code" button above</li>
              <li>Log in with your Enphase credentials</li>
              <li>Click "Allow Access" when prompted</li>
              <li>Copy the authorization code shown on the final page</li>
              <li>Paste the code in the input field above</li>
            </ol>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center rounded bg-primary py-2 font-semibold text-white transition hover:bg-primary/90"
          >
            {submitting ? (
              <span className="mr-2 h-5 w-5 animate-spin rounded-full border-b-2 border-white"></span>
            ) : null}
            {submitting ? "Saving..." : "Save"}
          </button>
        </form>
      </div>
    </div>
  );
}
