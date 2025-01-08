"use client";

import React, { useState } from "react";
import { FaUser, FaPhone, FaEnvelope, FaLock } from "react-icons/fa";

const SettingBoxes = () => {
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  const toggleForm = () => {
    setShowUpdateForm(!showUpdateForm);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="mb-2 p-1">
          <h1 className="text-2xl font-bold text-dark">Settings</h1>
          <p className="text-sm text-gray-500">View and manage your Profile</p>
        </div>
        <button 
          onClick={toggleForm}
          className="hover:bg-primary-dark rounded-md bg-primary px-4 py-2 text-white"
        >
          {showUpdateForm ? 'Cancel' : 'Edit Info'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Personal Information Section */}
        {!showUpdateForm && (
          <div className="col-span-5 xl:col-span-3">
            <div className="rounded-lg border border-stroke bg-white shadow-md dark:border-dark-3 dark:bg-gray-dark">
              <div className="border-b border-stroke px-7 py-4">
                <h3 className="font-medium text-dark dark:text-white">
                  Personal Information
                </h3>
              </div>
              <div className="p-7">
                <form>
                  <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
                    <div className="w-full sm:w-1/2">
                      <label className="mb-3 block font-medium text-dark dark:text-white">
                        Full Name
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2">
                          <FaUser className="text-gray-500" />
                        </span>
                        <p className="w-full rounded-lg bg-primary/[.07] py-3 pl-12 pr-4 text-dark">
                          Devid Jhon
                        </p>
                      </div>
                    </div>

                    <div className="w-full sm:w-1/2">
                      <label className="mb-3 block font-medium text-dark dark:text-white">
                        Phone Number
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2">
                          <FaPhone className="text-gray-500" />
                        </span>
                        <p className="w-full rounded-lg bg-primary/[.07] py-3 pl-12 pr-4 text-dark">
                          +123 456 7890
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-5.5">
                    <label className="mb-3 block font-medium text-dark dark:text-white">
                      Email Address
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2">
                        <FaEnvelope className="text-gray-500" />
                      </span>
                      <p className="w-full rounded-lg bg-primary/[.07] py-3 pl-12 pr-4 text-dark">
                        devidjond45@gmail.com
                      </p>
                    </div>
                  </div>

                  <div className="mb-5.5">
                    <label className="mb-3 block font-medium text-dark dark:text-white">
                      Username
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2">
                        <FaUser className="text-gray-500" />
                      </span>
                      <p className="w-full rounded-lg bg-primary/[.07] py-3 pl-12 pr-4 text-dark">
                        devidjhon24
                      </p>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Update Information Section */}
        {showUpdateForm && (
          <div className="col-span-5 xl:col-span-3">
            <div className="rounded-lg border border-stroke bg-white shadow-md dark:border-dark-3 dark:bg-gray-dark">
              <div className="border-b border-stroke px-7 py-4">
                <h3 className="font-medium text-dark dark:text-white">
                  Update Information
                </h3>
              </div>
              <div className="p-7">
                <form>
                  <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
                    <div className="w-full sm:w-1/2">
                      <label className="mb-3 block font-medium text-dark dark:text-white">
                        Full Name
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2">
                          <FaUser className="text-gray-500" />
                        </span>
                        <input
                          className="w-full rounded-lg border border-stroke bg-white py-3 pl-12 pr-4 text-dark focus:border-primary focus-visible:outline-none"
                          type="text"
                          placeholder="Enter your Full Name"
                          defaultValue="Devid Jhon"
                        />
                      </div>
                    </div>

                    <div className="w-full sm:w-1/2">
                      <label className="mb-3 block font-medium text-dark dark:text-white">
                        Phone Number
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2">
                          <FaPhone className="text-gray-500" />
                        </span>
                        <input
                          className="w-full rounded-lg border border-stroke bg-white py-3 pl-12 pr-4 text-dark focus:border-primary focus-visible:outline-none"
                          type="text"
                          placeholder="Enter your Phone Number"
                          defaultValue="+123 456 7890"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-5.5">
                    <label className="mb-3 block font-medium text-dark dark:text-white">
                      Email Address
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2">
                        <FaEnvelope className="text-gray-500" />
                      </span>
                      <input
                        className="w-full rounded-lg border border-stroke bg-white py-3 pl-12 pr-4 text-dark focus:border-primary focus-visible:outline-none"
                        type="email"
                        placeholder="Enter your Email"
                        defaultValue="devidjond45@gmail.com"
                      />
                    </div>
                  </div>

                  <div className="mb-5.5">
                    <label className="mb-3 block font-medium text-dark dark:text-white">
                      Username
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2">
                        <FaUser className="text-gray-500" />
                      </span>
                      <input
                        className="w-full rounded-lg border border-stroke bg-white py-3 pl-12 pr-4 text-dark focus:border-primary focus-visible:outline-none"
                        type="text"
                        placeholder="Enter your Username"
                        defaultValue="devidjhon24"
                      />
                    </div>
                  </div>

                  <div className="mb-5.5">
                    <label className="mb-3 block font-medium text-dark dark:text-white">
                      Password
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2">
                        <FaLock className="text-gray-500" />
                      </span>
                      <input
                        className="w-full rounded-lg border border-stroke bg-white py-3 pl-12 pr-4 text-dark focus:border-primary focus-visible:outline-none"
                        type="password"
                        placeholder="Enter your Password"
                        defaultValue="devidjhon24"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={toggleForm}
                      type="button"
                      className="rounded-lg border border-stroke px-6 py-2 font-medium text-dark hover:shadow-1 dark:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-primary px-6 py-2 font-medium text-white hover:bg-opacity-90"
                    >
                      Save
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default SettingBoxes;