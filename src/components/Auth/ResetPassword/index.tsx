"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ResetPasswordProps {
  token: string;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ token }) => {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    // Verify token on component mount
    const verifyToken = async () => {
      try {
        const response = await fetch(`/api/auth/verify-reset-token?token=${token}`);
        const data = await response.json();

        if (response.ok && data.valid) {
          setTokenValid(true);
          setEmail(data.email);
        } else {
          setError(data.error || "Invalid or expired token");
          setTokenValid(false);
        }
      } catch (err) {
        console.error("Error verifying token:", err);
        setError("An error occurred verifying the token");
        setTokenValid(false);
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    // Validation
    if (!password || !confirmPassword) {
      setError("All fields are required");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setPassword("");
        setConfirmPassword("");

        // Redirect to signin after 3 seconds
        setTimeout(() => {
          router.push("/authentication/signin");
        }, 3000);
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

  if (verifying) {
    return (
      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="w-full p-4 sm:p-12.5 xl:p-15">
          <div className="flex items-center justify-center py-10">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
          </div>
          <p className="text-center text-base text-body">Verifying token...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="w-full p-4 sm:p-12.5 xl:p-15">
          <h2 className="mb-2 text-2xl font-bold text-dark dark:text-white sm:text-title-xl2">
            Invalid or Expired Link
          </h2>
          <div className="mb-5 rounded-[10px] border border-red-500 bg-red-50 p-4 dark:bg-red-900/20">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
          <p className="mb-6 text-base text-body">
            The password reset link is invalid or has expired. Please request a new one.
          </p>
          <Link
            href="/authentication/forgot-password"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 font-medium text-white transition hover:bg-opacity-90"
          >
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
      <div className="flex flex-wrap items-center">
        <div className="w-full xl:w-1/2">
          <div className="w-full p-4 sm:p-12.5 xl:p-15">
            <h2 className="mb-2 text-2xl font-bold text-dark dark:text-white sm:text-title-xl2">
              Reset Your Password
            </h2>
            <p className="mb-2 text-base text-body">
              Enter your new password for: <strong>{email}</strong>
            </p>
            <p className="mb-9 text-sm text-body">
              Password must be at least 6 characters long.
            </p>

            {success ? (
              <div className="mb-5 rounded-[10px] border border-green-500 bg-green-50 p-4 dark:bg-green-900/20">
                <p className="text-sm text-green-600 dark:text-green-400">
                  Your password has been reset successfully! Redirecting to sign in...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="mb-5 rounded-[10px] border border-red-500 bg-red-50 p-4 dark:bg-red-900/20">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                <div className="mb-5">
                  <label
                    htmlFor="password"
                    className="mb-2.5 block font-medium text-dark dark:text-white"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type="password"
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                          d="M16.1547 6.80626V5.91251C16.1547 3.16251 14.0922 0.825009 11.4797 0.618759C10.0359 0.481259 8.59219 0.996884 7.52656 1.95938C6.46094 2.92188 5.84219 4.29688 5.84219 5.70626V6.80626C3.84844 7.18438 2.33594 8.93751 2.33594 11.0688V17.2906C2.33594 19.5594 4.19219 21.3813 6.42656 21.3813H15.5016C17.7703 21.3813 19.6266 19.525 19.6266 17.2563V11C19.6609 8.93751 18.1484 7.21876 16.1547 6.80626ZM8.55781 3.09376C9.31406 2.40626 10.3109 2.06251 11.3422 2.16563C13.1641 2.33751 14.6078 3.98751 14.6078 5.91251V6.70313H7.38906V5.67188C7.38906 4.70938 7.80156 3.78126 8.55781 3.09376ZM18.1141 17.2906C18.1141 18.7 16.9453 19.8688 15.5359 19.8688H6.46094C5.05156 19.8688 3.91719 18.7344 3.91719 17.325V11.0688C3.91719 9.52189 5.15469 8.28438 6.70156 8.28438H15.2953C16.8422 8.28438 18.1141 9.52188 18.1141 11V17.2906Z"
                          fill=""
                        />
                        <path
                          d="M10.9977 11.8594C10.5852 11.8594 10.207 12.2031 10.207 12.65V16.2594C10.207 16.6719 10.5508 17.05 10.9977 17.05C11.4102 17.05 11.7883 16.7063 11.7883 16.2594V12.6156C11.7883 12.2031 11.4102 11.8594 10.9977 11.8594Z"
                          fill=""
                        />
                      </svg>
                    </span>
                  </div>
                </div>

                <div className="mb-6">
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2.5 block font-medium text-dark dark:text-white"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
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
                          d="M16.1547 6.80626V5.91251C16.1547 3.16251 14.0922 0.825009 11.4797 0.618759C10.0359 0.481259 8.59219 0.996884 7.52656 1.95938C6.46094 2.92188 5.84219 4.29688 5.84219 5.70626V6.80626C3.84844 7.18438 2.33594 8.93751 2.33594 11.0688V17.2906C2.33594 19.5594 4.19219 21.3813 6.42656 21.3813H15.5016C17.7703 21.3813 19.6266 19.525 19.6266 17.2563V11C19.6609 8.93751 18.1484 7.21876 16.1547 6.80626ZM8.55781 3.09376C9.31406 2.40626 10.3109 2.06251 11.3422 2.16563C13.1641 2.33751 14.6078 3.98751 14.6078 5.91251V6.70313H7.38906V5.67188C7.38906 4.70938 7.80156 3.78126 8.55781 3.09376ZM18.1141 17.2906C18.1141 18.7 16.9453 19.8688 15.5359 19.8688H6.46094C5.05156 19.8688 3.91719 18.7344 3.91719 17.325V11.0688C3.91719 9.52189 5.15469 8.28438 6.70156 8.28438H15.2953C16.8422 8.28438 18.1141 9.52188 18.1141 11V17.2906Z"
                          fill=""
                        />
                        <path
                          d="M10.9977 11.8594C10.5852 11.8594 10.207 12.2031 10.207 12.65V16.2594C10.207 16.6719 10.5508 17.05 10.9977 17.05C11.4102 17.05 11.7883 16.7063 11.7883 16.2594V12.6156C11.7883 12.2031 11.4102 11.8594 10.9977 11.8594Z"
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
                    {loading ? "Resetting Password..." : "Reset Password"}
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
              Create New Password
            </p>
            <h1 className="mb-4 text-2xl font-bold text-white sm:text-heading-3">
              Almost There!
            </h1>
            <p className="w-full max-w-[375px] font-medium text-white">
              Choose a strong password that you haven't used elsewhere. Your new
              password will take effect immediately after reset.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
