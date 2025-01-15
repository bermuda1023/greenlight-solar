"use client";

import React, { useState, useEffect } from "react";
import { FaUser, FaPhone, FaEnvelope, FaLock } from "react-icons/fa";
import { supabase } from "@/utils/supabase/browserClient";
import { PassThrough } from "stream";

const SettingBoxes = () => {
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  const [showPassForm, setShowPassForm] = useState(false);

  const [profile, setProfile] = useState({
    full_name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
  });

  const toggleForm = () => {
    setShowUpdateForm(!showUpdateForm);
  };
  const togglePassForm = () => {
    setShowPassForm(!showPassForm);
  };
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Get the current authenticated user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (user) {
          // First get the profile data
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (profileError) throw profileError;

          // We already have the email from the auth user
          setProfile({
            full_name: profileData?.full_name || "",
            username: profileData?.username || "",
            email: user.email || "",
            phone: profileData?.phone || "",
            password: profileData?.password || "",
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const target = e.target as HTMLFormElement;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("No user found");

      // Update profile data
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: (
            target.elements.namedItem("full_name") as HTMLInputElement
          ).value,
          username: (target.elements.namedItem("username") as HTMLInputElement)
            .value,
          phone: (target.elements.namedItem("phone") as HTMLInputElement).value,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      // Refresh profile data
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw profileError;

      setProfile({
        full_name: profileData.full_name || "",
        username: profileData.username || "",
        email: user.email || "",
        phone: profileData.phone || "",
        password: profileData.password || "",
      });

      toggleForm();
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="mb-2 p-1">
          <h1 className="text-2xl font-bold text-dark">Settings</h1>
          <p className="text-sm text-gray-500">View and manage your Profile</p>
        </div>

        <div className="inline-flex gap-2">
          <div>
          {!showPassForm && (
            <button
              onClick={togglePassForm}
              className="hover:bg-primary-dark rounded-md bg-red px-4 py-2 text-white"
            >
              Reset Password
            </button>            )}

          </div>
          <div>
            {!showUpdateForm && (
              <button
                onClick={toggleForm}
                className="hover:bg-primary-dark rounded-md bg-primary px-4 py-2 text-white"
              >
                Edit Info
              </button>
            )}
          </div>
        </div>
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
                          {profile.full_name || "Enter your Full Name"}
                        </p>
                      </div>
                    </div>

                    <div className="w-full sm:w-1/2">
                      <label className="mb-3 block font-medium text-dark dark:text-white">
                        Username
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2">
                          <FaUser className="text-gray-500" />
                        </span>
                        <p className="w-full rounded-lg bg-primary/[.07] py-3 pl-12 pr-4 text-dark">
                          {profile.username || "Enter your Username"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
                    <div className="w-full sm:w-1/2">
                      <label className="mb-3 block font-medium text-dark dark:text-white">
                        Email Address
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2">
                          <FaEnvelope className="text-gray-500" />
                        </span>
                        <p className="w-full rounded-lg bg-primary/[.07] py-3 pl-12 pr-4 text-dark">
                          {profile.email || "Enter your Email"}
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
                          {profile.phone || "Enter your Phone"}
                        </p>
                      </div>
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
                <form onSubmit={handleSubmit}>
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
                          name="full_name"
                          className="w-full rounded-lg border border-stroke bg-white py-3 pl-12 pr-4 text-dark focus:border-primary focus-visible:outline-none"
                          type="text"
                          placeholder="Enter your Full Name"
                          defaultValue={profile.full_name}
                        />
                      </div>
                    </div>

                    <div className="w-full sm:w-1/2">
                      <label className="mb-3 block font-medium text-dark dark:text-white">
                        Username
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2">
                          <FaUser className="text-gray-500" />
                        </span>
                        <input
                          name="username"
                          className="w-full rounded-lg border border-stroke bg-white py-3 pl-12 pr-4 text-dark focus:border-primary focus-visible:outline-none"
                          type="text"
                          placeholder="Enter your Username"
                          defaultValue={profile.username}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
                    <div className="w-full sm:w-1/2">
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
                          defaultValue={profile.email}
                          disabled
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
                          name="phone"
                          className="w-full rounded-lg border border-stroke bg-white py-3 pl-12 pr-4 text-dark focus:border-primary focus-visible:outline-none"
                          type="text"
                          placeholder="Enter your Phone Number"
                          defaultValue={profile.phone}
                        />
                      </div>
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

        {/* Update Password Section */}
        {showPassForm && (
          <div className="col-span-5 xl:col-span-3">
            <div className="rounded-lg border border-stroke bg-white shadow-md dark:border-dark-3 dark:bg-gray-dark">
              <div className="border-b border-stroke px-7 py-4">
                <h3 className="font-medium text-dark dark:text-white">
                  Update Password
                </h3>
              </div>
              <div className="p-7">
                <form onSubmit={handleSubmit}>
                  <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
                    <div className="sm: w-full">
                      <label className="mb-3 block font-medium text-dark dark:text-white">
                        Current Password
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2">
                          <FaLock className="text-gray-500" />
                        </span>
                        <input
                          name="full_name"
                          className="w-full rounded-lg border border-stroke bg-white py-3 pl-12 pr-4 text-dark focus:border-primary focus-visible:outline-none"
                          type="text"
                          placeholder="Enter your Current Password"
                          defaultValue={profile.password}
                        />
                      </div>
                    </div>

                    {/* <div className="w-full sm:w-1/2">
                      <label className="mb-3 block font-medium text-dark dark:text-white">
                        Username
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2">
                          <FaUser className="text-gray-500" />
                        </span>
                        <input
                          name="username"
                          className="w-full rounded-lg border border-stroke bg-white py-3 pl-12 pr-4 text-dark focus:border-primary focus-visible:outline-none"
                          type="text"
                          placeholder="Enter your Username"
                          defaultValue={profile.username}
                        />
                      </div>
                    </div> */}
                  </div>
                  <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
                    <div className="w-full sm:w-1/2">
                      <label className="mb-3 block font-medium text-dark dark:text-white">
                        New Password
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2">
                          <FaLock className="text-gray-500" />
                        </span>
                        <input
                          className="w-full rounded-lg border border-stroke bg-white py-3 pl-12 pr-4 text-dark focus:border-primary focus-visible:outline-none"
                          type="email"
                          placeholder="Enter your New Password"
                        />
                      </div>
                    </div>
                    <div className="w-full sm:w-1/2">
                      <label className="mb-3 block font-medium text-dark dark:text-white">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2">
                          <FaLock className="text-gray-500" />
                        </span>
                        <input
                          name="phone"
                          className="w-full rounded-lg border border-stroke bg-white py-3 pl-12 pr-4 text-dark focus:border-primary focus-visible:outline-none"
                          type="text"
                          placeholder="Confirm your password"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={togglePassForm}
                      type="button"
                      className="rounded-lg border border-stroke px-6 py-2 font-medium text-dark hover:shadow-1 dark:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={togglePassForm}
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
