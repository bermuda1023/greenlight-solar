"use client";
import Link from "next/link";
import React from "react";
import SignupWithPassword from "../SignupWithPassword";

export default function Signup() {
  return (
    <>
      <div>
        <h1 className="mb-4 text-3xl font-bold text-gray-800 dark:text-gray-200">
          Create an account
        </h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          Create your account to manage your energy solutions.
        </p>
      </div>
      <div>
        <SignupWithPassword/>
      </div>
      <div className="mt-6 text-center">
        <p>
          Already have an account?{" "}
          <Link href="/" className="text-green-500 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </>
  );
}
