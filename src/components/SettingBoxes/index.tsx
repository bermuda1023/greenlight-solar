"use client";

import React, { useState, useEffect } from "react";
import { FaUser, FaPhone, FaEnvelope, FaLock } from "react-icons/fa";

import { supabase } from "@/utils/supabase/browserClient";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

const SettingBoxes = () => {
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  const [profile, setProfile] = useState({
    full_name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const toggleForm = () => {
    setShowUpdateForm(!showUpdateForm);
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
          // Fetch the profile data
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (profileError) throw profileError;

          // Update state with fetched profile data
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
  }, []); // Empty array ensures this runs only once on component mount

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

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("User is not authenticated.");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });

      if (signInError) {
        toast.error("Current password is incorrect.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        toast.error("Failed to update password.");
        return;
      }

      toast.success("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error("An error occurred while updating the password.");
      console.error(err);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="mb-2 p-1">
          <h1 className="text-2xl font-bold text-dark">Settings</h1>
          <p className="text-sm text-gray-500">View and manage your Profile</p>
        </div>

        <div className="inline-flex gap-2"></div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Personal Information Section */}
        {!showUpdateForm && (
          <div className="col-span-5 xl:col-span-3">
            <div className="rounded-lg border border-stroke bg-white  dark:border-dark-3 dark:bg-gray-dark">
              <div className="flex justify-between border-b border-stroke px-7 py-4">
                <h3 className="font-medium text-dark dark:text-white">
                  Personal Information
                </h3>

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
                          {profile.phone || "+123-456-789"}
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
            <div className="rounded-lg border border-stroke bg-white  dark:border-dark-3 dark:bg-gray-dark">
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
                      onClick={() =>
                        toast.success("Your changes have been saved!")
                      }
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
        <div className="col-span-5 xl:col-span-3">
          <div className="rounded-lg border border-stroke bg-white  dark:border-dark-3 dark:bg-gray-dark">
            <div className="border-b border-stroke px-7 py-4">
              <h3 className="font-medium text-dark dark:text-white">
                Reset Password
              </h3>
            </div>
            <div className="p-7">
              <form onSubmit={handlePasswordReset}>
                <div className="mb-4">
                  <label className="mb-2.5 block font-medium text-dark dark:text-white">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="Enter your current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full rounded-lg border border-stroke bg-transparent py-[15px] pl-6 pr-11 font-medium text-dark outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowCurrentPassword(!showCurrentPassword)
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 transform text-gray-500"
                    >
                      {showCurrentPassword ? (
                        <FontAwesomeIcon icon={faEyeSlash} />
                      ) : (
                        <FontAwesomeIcon icon={faEye} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="mb-2.5 block font-medium text-dark dark:text-white">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Enter your new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-lg border border-stroke bg-transparent py-[15px] pl-6 pr-11 font-medium text-dark outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 transform text-gray-500"
                    >
                      {showNewPassword ? (
                        <FontAwesomeIcon icon={faEyeSlash} />
                      ) : (
                        <FontAwesomeIcon icon={faEye} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="mb-2.5 block font-medium text-dark dark:text-white">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-lg border border-stroke bg-transparent py-[15px] pl-6 pr-11 font-medium text-dark outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 transform text-gray-500"
                    >
                      {showConfirmPassword ? (
                        <FontAwesomeIcon icon={faEyeSlash} />
                      ) : (
                        <FontAwesomeIcon icon={faEye} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  {/* Clear Fields Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    className="rounded-lg border border-stroke px-6 py-2 font-medium text-dark hover:shadow-1 dark:text-white"
                  >
                    Clear Fields
                  </button>

                  {/* reset password */}
                  <button
                    type="submit"
                    className="rounded-lg bg-primary px-6 py-2 font-medium text-white hover:bg-opacity-90"
                  >
                    Reset Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingBoxes;
