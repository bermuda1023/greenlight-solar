"use client";
import React, { useState } from "react";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faRefresh, 
  faExternalLinkAlt, 
  faSpinner,
  faTimes,
  faCheckCircle,
  faExclamationTriangle,
  faQuestionCircle
} from "@fortawesome/free-solid-svg-icons";
import ReauthorizationGuide from "./ReauthorizationGuide";

interface Customer {
  id: string;
  site_name: string;
  email: string;
  authorization_status?: string;
  token_expires_at?: string;
}

interface TokenRefreshModalProps {
  customer: Customer;
  onClose: () => void;
  onSuccess: () => void;
}

const TokenRefreshModal: React.FC<TokenRefreshModalProps> = ({
  customer,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [authCode, setAuthCode] = useState("");
  const [authWindowOpen, setAuthWindowOpen] = useState(false);
  const [refreshMethod, setRefreshMethod] = useState<"auto" | "manual">("auto");
  const [showGuide, setShowGuide] = useState(false);

  const ENPHASE_AUTH_URL = "https://api.enphaseenergy.com/oauth/authorize";
  const CLIENT_ID = "ba5228e4f843a94607e6cc245043bc54";
  const REDIRECT_URI = "https://api.enphaseenergy.com/oauth/redirect_uri";

  const openEnphaseAuth = () => {
    const authUrl = `${ENPHASE_AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&state=${customer.id}`;
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const authWindow = window.open(
      authUrl,
      "EnphaseAuth",
      `width=${width},height=${height},left=${left},top=${top}`,
    );

    setAuthWindowOpen(true);

    // Check if window was closed
    const checkWindow = setInterval(() => {
      if (authWindow?.closed) {
        clearInterval(checkWindow);
        setAuthWindowOpen(false);
      }
    }, 500);
  };

  const handleAutoRefresh = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/enphase/refresh-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: customer.id,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`Token refreshed successfully for ${customer.site_name}`);
        onSuccess();
        onClose();
      } else {
        if (data.needsReauthorization) {
          toast.warn("Token expired - manual reauthorization required");
          setRefreshMethod("manual");
        } else {
          toast.error(`Failed to refresh token: ${data.details || data.error}`);
        }
      }
    } catch (error) {
      console.error("Error refreshing token:", error);
      toast.error("Failed to refresh token. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    if (!authCode.trim()) {
      toast.error("Please enter the authorization code");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/enphase/refresh-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: customer.id,
          authorizationCode: authCode.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`Authorization updated successfully for ${customer.site_name}`);
        onSuccess();
        onClose();
      } else {
        toast.error(`Failed to update authorization: ${data.details || data.error}`);
      }
    } catch (error) {
      console.error("Error updating authorization:", error);
      toast.error("Failed to update authorization. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isExpired = customer.authorization_status === "ENPHASE_AUTHORIZATION_EXPIRED";
  const isExpiringSoon = customer.token_expires_at && 
    new Date(customer.token_expires_at) < new Date(Date.now() + 24 * 60 * 60 * 1000);

  return (
    <div className="fixed inset-0 z-999 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Refresh Enphase Token
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowGuide(true)}
              className="text-blue-500 hover:text-blue-700"
              title="Show help guide"
            >
              <FontAwesomeIcon icon={faQuestionCircle} />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        </div>

        <div className="mb-4">
          <div className="rounded-md bg-gray-50 p-3">
            <p className="text-sm font-medium text-gray-900">{customer.site_name}</p>
            <p className="text-xs text-gray-600">{customer.email}</p>
            
            {isExpired && (
              <div className="mt-2 flex items-center text-red-600">
                <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1 h-3 w-3" />
                <span className="text-xs">Token expired - requires reauthorization</span>
              </div>
            )}
            
            {isExpiringSoon && !isExpired && (
              <div className="mt-2 flex items-center text-amber-600">
                <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1 h-3 w-3" />
                <span className="text-xs">Token expires soon</span>
              </div>
            )}
          </div>
        </div>

        {/* Method Selection */}
        <div className="mb-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setRefreshMethod("auto")}
              disabled={isExpired}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                refreshMethod === "auto" && !isExpired
                  ? "bg-blue-600 text-white"
                  : isExpired
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <FontAwesomeIcon icon={faRefresh} className="mr-1" />
              Auto Refresh
            </button>
            <button
              onClick={() => setRefreshMethod("manual")}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                refreshMethod === "manual"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <FontAwesomeIcon icon={faExternalLinkAlt} className="mr-1" />
              Manual Auth
            </button>
          </div>
        </div>

        {refreshMethod === "auto" ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Attempt to automatically refresh the existing token.
            </p>
            <button
              onClick={handleAutoRefresh}
              disabled={loading || isExpired}
              className={`w-full rounded-md px-4 py-2 text-white transition ${
                loading || isExpired
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  Refreshing...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faRefresh} className="mr-2" />
                  Refresh Token
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Get New Authorization Code
              </label>
              <button
                onClick={openEnphaseAuth}
                disabled={authWindowOpen || loading}
                className="w-full rounded-md bg-green-600 px-4 py-2 text-white transition hover:bg-green-700 disabled:bg-gray-400"
              >
                {authWindowOpen ? "Window Open..." : "Open Enphase Authorization"}
                <FontAwesomeIcon icon={faExternalLinkAlt} className="ml-2" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Authorization Code
              </label>
              <input
                type="text"
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
                placeholder="Paste authorization code here"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:ring-green-500"
              />
            </div>

            <button
              onClick={handleManualRefresh}
              disabled={loading || !authCode.trim()}
              className={`w-full rounded-md px-4 py-2 text-white transition ${
                loading || !authCode.trim()
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {loading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  Updating...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
                  Update Authorization
                </>
              )}
            </button>

            <div className="rounded-md bg-blue-50 p-3">
              <p className="text-xs text-blue-800">
                <strong>Instructions:</strong>
              </p>
              <ol className="mt-1 list-decimal list-inside text-xs text-blue-700 space-y-1">
                <li>Click "Open Enphase Authorization"</li>
                <li>Log in with customer's Enphase credentials</li>
                <li>Click "Allow Access" when prompted</li>
                <li>Copy the authorization code from the final page</li>
                <li>Paste it above and click "Update Authorization"</li>
              </ol>
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Help Guide Modal */}
      {showGuide && (
        <ReauthorizationGuide
          customerName={customer.site_name}
          onClose={() => setShowGuide(false)}
        />
      )}
    </div>
  );
};

export default TokenRefreshModal;
