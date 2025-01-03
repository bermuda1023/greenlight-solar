import React from "react";
import Link from "next/link";
import Image from "next/image";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { Metadata } from "next";
import DefaultLayout from "@/components/Layouts/DefaultLaout";
import Signin from "@/components/Auth/Signin";

export const metadata: Metadata = {
  title: 'Signin',
};

const SignIn: React.FC = () => {
  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="flex w-full max-w-6xl overflow-hidden rounded-lg bg-white dark:bg-gray-800">
          {/* Left Side (Form Section) */}
          <div className="flex w-full flex-col p-8 lg:w-1/2 lg:p-12">
            <Signin />
          </div>

          {/* Right Side (Information Section) */}
          <div className="relative hidden flex-col justify-between bg-gradient-to-tr from-green-500 to-teal-600 p-10 text-white lg:flex lg:w-1/2 lg:p-12">
            <div>
              <h1 className="mb-4 text-3xl font-bold">
                Empowering Energy Management
              </h1>
              <p className="mb-6 text-lg font-medium">
                Greenlight Energy makes managing solar installations and billing
                seamless.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-4 w-4 rounded-full bg-green-500"></div>
                  <p>Automate monthly billing with integrated solar data.</p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-4 w-4 rounded-full bg-green-500"></div>
                  <p>
                    Reconcile payments effortlessly with bank statement uploads.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-4 w-4 rounded-full bg-green-500"></div>
                  <p>
                    Manage customer details with a clean and intuitive
                    interface.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-4 w-4 rounded-full bg-green-500"></div>
                  <p>Gain insights with usage and billing reports.</p>
                </li>
              </ul>
            </div>
            <div>
              <Image
                src="/images/grids/grid-02.svg"
                alt="Energy Management Illustration"
                width={405}
                height={325}
                className="mx-auto absolute bottom-0"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SignIn;
