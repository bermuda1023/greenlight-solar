"use client";
import Link from "next/link";
import React from "react";
import SigninWithPassword from "../SigninWithPassword";

export default function Signin() {
  return (
    <>
      <div>
        <h1 className="mb-4 text-3xl font-bold text-gray-800 dark:text-gray-200">
          Welcome Back!
        </h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          Sign in to your account to continue managing your energy solutions.
        </p>
      </div>
      <div>
        <SigninWithPassword />
      </div>
      {/* <div className="mt-6 text-center">
        <p>
          Don’t have an account?{" "}
          <Link href="/authentication/signup" className="text-green-500 hover:underline">
            Sign Up
          </Link>
        </p>
      </div> */}
    </>
  );
}
