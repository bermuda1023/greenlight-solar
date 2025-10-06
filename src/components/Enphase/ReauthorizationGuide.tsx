"use client";
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faInfoCircle, 
  faExternalLinkAlt,
  faClipboard,
  faCheckCircle,
  faExclamationTriangle
} from "@fortawesome/free-solid-svg-icons";

interface ReauthorizationGuideProps {
  customerName: string;
  onClose: () => void;
}

const ReauthorizationGuide: React.FC<ReauthorizationGuideProps> = ({
  customerName,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2 text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Manual Reauthorization Required
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="mb-4 rounded-md bg-orange-50 p-4">
          <p className="text-sm text-orange-800">
            <strong>Customer:</strong> {customerName}
          </p>
          <p className="mt-1 text-sm text-orange-700">
            The Enphase refresh token has completely expired and cannot be renewed automatically. 
            A new authorization code is required from the customer&apos;s Enphase account.
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-md bg-blue-50 p-4">
            <h4 className="mb-2 flex items-center text-sm font-semibold text-blue-900">
              <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
              Why This Happens
            </h4>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• Enphase refresh tokens expire after a certain period (usually 1 year)</li>
              <li>• The customer may have revoked access to their Enphase account</li>
              <li>• There may have been changes to the customer&apos;s Enphase account</li>
            </ul>
          </div>

          <div className="rounded-md bg-green-50 p-4">
            <h4 className="mb-3 flex items-center text-sm font-semibold text-green-900">
              <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
              How to Resolve (Step-by-Step)
            </h4>
            
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="mr-3 flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-xs text-white">
                  1
                </div>
                <div>
                  <p className="text-sm font-medium text-green-900">Click the Token Refresh Button</p>
                  <p className="text-xs text-green-700">
                    In the customer list, click the blue refresh icon next to the customer&apos;s name, 
                    or click the red &quot;Expired - Re-authorize&quot; badge.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="mr-3 flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-xs text-white">
                  2
                </div>
                <div>
                  <p className="text-sm font-medium text-green-900">Choose &quot;Manual Auth&quot; Method</p>
                  <p className="text-xs text-green-700">
                    In the popup modal, select the &quot;Manual Auth&quot; tab since auto-refresh won&apos;t work for expired tokens.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="mr-3 flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-xs text-white">
                  3
                </div>
                <div>
                  <p className="text-sm font-medium text-green-900">Open Enphase Authorization</p>
                  <p className="text-xs text-green-700">
                    Click &quot;Open Enphase Authorization&quot; to open the Enphase login page in a new window.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="mr-3 flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-xs text-white">
                  4
                </div>
                <div>
                  <p className="text-sm font-medium text-green-900">Customer Login Required</p>
                  <p className="text-xs text-green-700">
                    <strong>Important:</strong> The customer must log in with their own Enphase credentials. 
                    You&apos;ll need to contact them or have them present during this process.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="mr-3 flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-xs text-white">
                  5
                </div>
                <div>
                  <p className="text-sm font-medium text-green-900">Grant Permission</p>
                  <p className="text-xs text-green-700">
                    After login, the customer should click &quot;Allow Access&quot; to grant permission to your application.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="mr-3 flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-xs text-white">
                  6
                </div>
                <div>
                  <p className="text-sm font-medium text-green-900">Copy Authorization Code</p>
                  <p className="text-xs text-green-700">
                    Copy the authorization code from the final page and paste it into the &quot;Authorization Code&quot; field.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="mr-3 flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-xs text-white">
                  7
                </div>
                <div>
                  <p className="text-sm font-medium text-green-900">Update Authorization</p>
                  <p className="text-xs text-green-700">
                    Click &quot;Update Authorization&quot; to save the new token. The customer&apos;s status will be updated automatically.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-md bg-yellow-50 p-4">
            <h4 className="mb-2 flex items-center text-sm font-semibold text-yellow-900">
              <FontAwesomeIcon icon={faClipboard} className="mr-2" />
              Alternative: Contact Customer
            </h4>
            <p className="text-sm text-yellow-800">
              If the customer is not available, you can send them the authorization link and ask them to:
            </p>
            <ol className="mt-2 list-decimal list-inside space-y-1 text-sm text-yellow-700">
              <li>Visit the Enphase authorization page</li>
              <li>Log in with their credentials</li>
              <li>Grant access to your application</li>
              <li>Send you the authorization code</li>
            </ol>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="rounded-md bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReauthorizationGuide;
