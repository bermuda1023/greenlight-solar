"use client";
import React, { useState } from "react";
import Link from "next/link";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    // Basic email validation
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError("Email is required");
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setEmail("");
      } else {
        setError(data.error || "An error occurred. Please try again.");
      }
    } catch (err) {
      console.error("Error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
      <div className="flex flex-wrap items-center">
        <div className="w-full xl:w-1/2">
          <div className="w-full p-4 sm:p-12.5 xl:p-15">
            <h2 className="mb-2 text-2xl font-bold text-dark dark:text-white sm:text-title-xl2">
              Forgot Password
            </h2>
            <p className="mb-9 text-base text-body">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            {success ? (
              <div className="mb-5 rounded-[10px] border border-green-500 bg-green-50 p-4 dark:bg-green-900/20">
                <p className="text-sm text-green-600 dark:text-green-400">
                  If an account with that email exists, a password reset link has been sent.
                  Please check your inbox.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="mb-5 rounded-[10px] border border-red-500 bg-red-50 p-4 dark:bg-red-900/20">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                <div className="mb-6">
                  <label
                    htmlFor="email"
                    className="mb-2.5 block font-medium text-dark dark:text-white"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-stroke bg-transparent py-[15px] pl-6 pr-11 font-medium text-dark outline-none focus:border-primary focus-visible:shadow-none dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                      disabled={loading}
                      required
                    />
                    <span className="absolute right-4.5 top-1/2 -translate-y-1/2">
                      <svg
                        className="fill-current"
                        width="22"
                        height="22"
                        viewBox="0 0 22 22"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M19.2516 3.30005H2.75156C1.58281 3.30005 0.585938 4.26255 0.585938 5.46567V16.6032C0.585938 17.7719 1.54844 18.7688 2.75156 18.7688H19.2516C20.4203 18.7688 21.4172 17.8063 21.4172 16.6032V5.4313C21.4172 4.26255 20.4203 3.30005 19.2516 3.30005ZM19.2516 4.84692C19.2859 4.84692 19.3203 4.84692 19.3547 4.84692L11.0016 10.2094L2.64844 4.84692C2.68281 4.84692 2.71719 4.84692 2.75156 4.84692H19.2516ZM19.2516 17.1532H2.75156C2.40781 17.1532 2.13281 16.8782 2.13281 16.5344V6.35942L10.1766 11.5157C10.4172 11.6875 10.6922 11.7563 10.9672 11.7563C11.2422 11.7563 11.5172 11.6875 11.7578 11.5157L19.8016 6.35942V16.5688C19.8703 16.9125 19.5953 17.1532 19.2516 17.1532Z"
                          fill=""
                        />
                      </svg>
                    </span>
                  </div>
                </div>

                <div className="mb-4.5">
                  <button
                    type="submit"
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary p-[13px] font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? "Sending..." : "Send Reset Link"}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6 text-center">
              <p className="text-base text-body">
                Remember your password?{" "}
                <Link
                  href="/authentication/signin"
                  className="text-primary hover:underline"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>

        <div className="hidden w-full p-7.5 xl:block xl:w-1/2">
          <div className="custom-gradient-1 overflow-hidden rounded-2xl px-12.5 pt-12.5 dark:!bg-dark-2 dark:bg-none">
            <Link className="mb-10 inline-block" href="/">
              <h1 className="text-2xl font-bold text-white">Greenlight Solar</h1>
            </Link>
            <p className="mb-3 text-xl font-medium text-white">
              Reset Your Password
            </p>
            <h1 className="mb-4 text-2xl font-bold text-white sm:text-heading-3">
              Secure Account Recovery
            </h1>
            <p className="w-full max-w-[375px] font-medium text-white">
              Enter your email address to receive a secure password reset link.
              The link will expire in 1 hour for your security.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
