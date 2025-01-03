import React from "react";
import Link from "next/link";
import Image from "next/image";

const Navbar: React.FC = () => {
  return (
    <nav>
      <div className="bg-white mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/">
              <Image
                src="/images/logo/logo.svg"
                alt="Logo"
                width={300}
                height={60}
              />
            </Link>
          </div>
          {/* Sign-in Button */}
          <div>
            <Link
              href="/signin"
              className="text-base font-medium text-white bg-primary px-6 py-3 rounded-lg"
            >
              Account
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
