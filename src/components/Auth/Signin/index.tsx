"use client";
import Link from "next/link";
import React from "react";
import GoogleSigninButton from "../GoogleSigninButton";
import SigninWithPassword from "../SigninWithPassword";

export default function Signin() {
  return (
    <>
      {/* <GoogleSigninButton text="Sign in" /> */}

      {/* <div className="my-6 flex items-center justify-center">
        <span className="block h-px w-full bg-stroke dark:bg-dark-3"></span>
        <div className="block w-full min-w-fit bg-white px-3 text-center font-medium dark:bg-gray-dark">
          Or sign in with email
        </div>
        <span className="block h-px w-full bg-stroke dark:bg-dark-3"></span>
      </div> */}

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
      <div className="mt-6 text-center">
        <p>
          Don’t have an account?{" "}
          <Link href="/auth/signup" className="text-green-500 hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </>
  );
}
