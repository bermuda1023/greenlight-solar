"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase/browserClient";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css"; // Import Flatpickr CSS

import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AddCustomer = () => {
  const [formData, setFormData] = useState({
    email: "",
    address: "",
    site_name: "",
    solar_api_key: "",
    installation_date: "",
    installed_capacity: "",
    scaling_factor: "",
    price: "",
    site_ID: "",
    authorization_code: "",
  });

  const [showSimpleForm, setShowSimpleForm] = useState(false);
  const [additionalField, setAdditionalField] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Function to get OAuth token from Enphase API
  const getEnphaseToken = async (authorizationCode: string) => {
    try {
      console.log("Getting Enphase token with auth code:", authorizationCode);

      // Create a serverless function call instead of direct API call
      // to avoid CORS issues
      const response = await fetch("/api/enphase-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: authorizationCode,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Enphase token error:", errorText);
        throw new Error(`Failed to get Enphase token: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Enphase token response:", data);

      return data.refresh_token;
    } catch (error) {
      console.error("Error getting Enphase token:", error);
      throw error;
    }
  };

  const handleSimpleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast.dismiss();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    // Check if any required fields are empty for simple form
    const requiredFields = [
      formData.email,
      formData.address,
      formData.site_name,
      formData.installation_date,
      formData.installed_capacity,
      formData.scaling_factor,
      formData.price,
      formData.authorization_code,
    ];

    if (requiredFields.some((field) => !field)) {
      toast.error("Please fill out all the fields.");
      setIsSubmitting(false);
      return;
    }

    try {
      // Get refresh token from Enphase API
      let refreshToken;
      try {
        toast.info("Getting authorization from Enphase...");
        refreshToken = await getEnphaseToken(formData.authorization_code);
        console.log("Received refresh token:", refreshToken);
      } catch (tokenError) {
        console.error("Error getting Enphase token:", tokenError);
        setError(
          tokenError instanceof Error
            ? tokenError.message
            : "Authorization failed",
        );
        toast.error(
          "Failed to authorize with Enphase. The authorization code may be expired or invalid.",
        );
        setIsSubmitting(false);
        return;
      }

      // Insert customer with refresh token
      const { error } = await supabase.from("customers").insert([
        {
          email: formData.email,
          address: formData.address,
          site_name: formData.site_name,
          installation_date: formData.installation_date,
          installed_capacity: Number(formData.installed_capacity),
          scaling_factor: Number(formData.scaling_factor),
          price: Number(formData.price),
          authorization_code: formData.authorization_code,
          refresh_token: refreshToken, // Save refresh token to database
        },
      ]);

      if (error) {
        throw error;
      }

      toast.success("Enphase customer added successfully!");

      setFormData({
        email: "",
        address: "",
        site_name: "",
        solar_api_key: "",
        installation_date: "",
        installed_capacity: "",
        scaling_factor: "",
        price: "",
        site_ID: "",
        authorization_code: "",
      });
    } catch (error) {
      console.error("Error adding customer:", error);
      toast.error("Failed to add customer. Please try again.");
      setError("Failed to add customer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast.dismiss(); // Dismiss previous toasts before showing new ones
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    // Check if any required fields are empty
    const requiredFields = [
      formData.email,
      formData.address,
      formData.site_name,
      formData.solar_api_key,
      formData.installation_date,
      formData.installed_capacity,
      formData.scaling_factor,
      formData.price,
      formData.site_ID,
    ];

    if (requiredFields.some((field) => !field)) {
      toast.error("Please fill out all the fields."); // Toast error if any field is empty
      setIsSubmitting(false); // Stop submission process
      return;
    }

    try {
      const { error } = await supabase.from("customers").insert([
        {
          email: formData.email,
          address: formData.address,
          site_name: formData.site_name,
          solar_api_key: formData.solar_api_key,
          installation_date: formData.installation_date,
          installed_capacity: formData.installed_capacity,
          scaling_factor: formData.scaling_factor,
          price: formData.price,
          site_ID: formData.site_ID,
        },
      ]);

      if (error) {
        throw error;
      }

      toast.success("Customer added successfully!"); // Toast success message

      setFormData({
        email: "",
        address: "",
        site_name: "",
        solar_api_key: "",
        installation_date: "",
        installed_capacity: "",
        scaling_factor: "",
        price: "",
        site_ID: "",
        authorization_code: "",
      });
    } catch (error) {
      toast.error("Failed to add customer. Please try again."); // Toast error if something goes wrong
      setError("Failed to add customer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const installDatePicker = flatpickr("#installDate", {
      mode: "single",
      static: true,
      monthSelectorType: "static",
      dateFormat: "M j, Y",
      onChange: (selectedDates) => {
        if (selectedDates.length > 0) {
          const dateToFormat = selectedDates[0];
          const formattedDate = new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }).format(dateToFormat);
          setFormData((prevFormData) => ({
            ...prevFormData,
            installation_date: formattedDate,
          }));
        } else {
          setFormData((prevFormData) => ({
            ...prevFormData,
            installation_date: "",
          }));
        }
      },
    });
  }, []);

  return (
    <div className="rounded-[10px] border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
      <div className="flex items-center justify-between border-b border-stroke px-6.5 py-4 dark:border-dark-3">
        <h3 className="font-semibold text-dark dark:text-white">
          {showSimpleForm ? "Add New Enphase Customer" : "Add New Customer"}
        </h3>
        <button
          type="button"
          onClick={() => setShowSimpleForm(!showSimpleForm)}
          className="rounded-md bg-primary px-4 py-2 text-white hover:bg-opacity-90"
        >
          {showSimpleForm ? "Switch to Full Form" : "Switch to Simple Form"}
        </button>
      </div>

      {showSimpleForm ? (
        <form onSubmit={handleSimpleSubmit}>
          <div className="p-6.5">
            <div className="mb-4.5 flex flex-col gap-4.5 xl:flex-row">
              <div className="w-full xl:w-1/2">
                <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                  Site Name
                </label>
                <input
                  type="text"
                  name="site_name"
                  value={formData.site_name}
                  onChange={handleChange}
                  placeholder="John Wick"
                  className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                  disabled={isSubmitting}
                />
              </div>

              <div className="w-full xl:w-1/2">
                <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@example.com"
                  className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="mb-4.5 flex flex-col gap-4.5 xl:flex-row">
              <div className="flex w-full flex-col xl:w-1/2">
                <label
                  className="mb-3 block text-body-sm font-medium text-dark dark:text-white"
                  htmlFor="installDate"
                >
                  Installation Date
                </label>

                <input
                  id="installDate"
                  type="text"
                  name="installation_date"
                  value={formData.installation_date || ""}
                  placeholder="Jan 01, 2025"
                  className={`form-datepicker w-full rounded-[7px] border-[1.5px] ${
                    !formData.installation_date && isSubmitting
                      ? "border-red-500"
                      : "border-stroke"
                  } bg-transparent bg-white px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary`}
                  disabled={isSubmitting}
                />
              </div>

              <div className="w-full xl:w-1/2">
                <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Appartment No. XYZ, New York"
                  className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="mb-4.5 flex flex-col gap-4.5 xl:flex-row">
              <div className="w-full xl:w-1/2">
                <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                  Installed Capacity
                </label>
                <input
                  type="text"
                  name="installed_capacity"
                  value={formData.installed_capacity}
                  onChange={handleChange}
                  placeholder="5"
                  className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                  disabled={isSubmitting}
                />
              </div>
              <div className="w-full xl:w-1/2">
                <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                  Authorization Code
                </label>
                <input
                  type="text"
                  name="authorization_code"
                  value={formData.authorization_code}
                  onChange={handleChange}
                  placeholder="Enter Authorization Code"
                  className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Scalling factor and price */}
            <div className="mb-4.5 flex flex-col gap-4.5 xl:flex-row">
              <div className="w-full xl:w-1/2">
                <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                  Scalling factor
                </label>
                <input
                  type="text"
                  name="scaling_factor"
                  value={formData.scaling_factor}
                  onChange={handleChange}
                  placeholder="1"
                  className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                  disabled={isSubmitting}
                />
              </div>
              <div className="w-full xl:w-1/2">
                <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                  Price
                </label>
                <input
                  type="text"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="Enter Price"
                  className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <button
              type="submit"
              className="flex w-full justify-center rounded-[7px] bg-primary p-[13px] font-medium text-white hover:bg-opacity-90"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Add Customer"}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="p-6.5">
            <div className="mb-4.5 flex flex-col gap-4.5 xl:flex-row">
              <div className="w-full xl:w-1/2">
                <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                  Site Name
                </label>
                <input
                  type="text"
                  name="site_name"
                  value={formData.site_name}
                  onChange={handleChange}
                  placeholder="John Wick"
                  className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                  disabled={isSubmitting}
                />
              </div>

              <div className="w-full xl:w-1/2">
                <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@example.com"
                  className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="mb-4.5 flex flex-col gap-4.5 xl:flex-row">
              <div className="flex w-full flex-col xl:w-1/2">
                <label
                  className="mb-3 block text-body-sm font-medium text-dark dark:text-white"
                  htmlFor="installDate"
                >
                  Installation Date
                </label>

                <input
                  id="installDate"
                  type="text"
                  name="installation_date"
                  value={formData.installation_date || ""}
                  placeholder="Jan 01, 2025"
                  className={`form-datepicker w-full rounded-[7px] border-[1.5px] ${
                    !formData.installation_date && isSubmitting
                      ? "border-red-500"
                      : "border-stroke"
                  } bg-transparent bg-white px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary`}
                  disabled={isSubmitting}
                />
              </div>

              <div className="w-full xl:w-1/2">
                <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Appartment No. XYZ, New York"
                  className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="mb-4.5 flex flex-col gap-4.5 xl:flex-row">
              <div className="w-full xl:w-1/2">
                <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                  Installed Capacity
                </label>
                <input
                  type="text"
                  name="installed_capacity"
                  value={formData.installed_capacity}
                  onChange={handleChange}
                  placeholder="5"
                  className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                  disabled={isSubmitting}
                />
              </div>
              <div className="w-full xl:w-1/2">
                <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                  Authorization Code
                </label>
                <input
                  type="text"
                  name="authorization_code"
                  value={formData.authorization_code}
                  onChange={handleChange}
                  placeholder="Enter Authorization Code"
                  className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Scalling factor and price */}
            <div className="mb-4.5 flex flex-col gap-4.5 xl:flex-row">
              <div className="w-full xl:w-1/2">
                <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                  Scalling factor
                </label>
                <input
                  type="text"
                  name="scaling_factor"
                  value={formData.scaling_factor}
                  onChange={handleChange}
                  placeholder="1"
                  className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                  disabled={isSubmitting}
                />
              </div>
              <div className="w-full xl:w-1/2">
                <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                  Price
                </label>
                <input
                  type="text"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="Enter Price"
                  className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="mb-4.5 flex flex-col gap-4.5 xl:flex-row">
              <div className="w-full">
                <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                  Solar API Key
                </label>
                <input
                  type="text"
                  name="solar_api_key"
                  value={formData.solar_api_key}
                  onChange={handleChange}
                  placeholder="ABCDABCDABCDABCDABCDABCDABCDABCD"
                  className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <button
              type="submit"
              className="flex w-full justify-center rounded-[7px] bg-primary p-[13px] font-medium text-white hover:bg-opacity-90"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Add Customer"}
            </button>
          </div>
        </form>
      )}

      {error && <p className="p-4 text-red-600">{error}</p>}
      {success && <p className="p-4 text-green-600">{success}</p>}
    </div>
  );
};

export default AddCustomer;
