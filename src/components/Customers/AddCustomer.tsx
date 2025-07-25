"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase/browserClient";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css"; // Import Flatpickr CSS

import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { v4 as uuidv4 } from "uuid";

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
  const [isAuthWindowOpen, setIsAuthWindowOpen] = useState(false);
  const [authWindow, setAuthWindow] = useState<Window | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ENPHASE_AUTH_URL = "https://api.enphaseenergy.com/oauth/authorize";
  const CLIENT_ID = "ba5228e4f843a94607e6cc245043bc54";
  const REDIRECT_URI = "https://api.enphaseenergy.com/oauth/redirect_uri";

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
      const response = await fetch("http://localhost:3000/api/enphase-token", {
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

  // Function to handle opening the auth window
  const openEnphaseAuth = () => {
    const authUrl = `${ENPHASE_AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const authWindowRef = window.open(
      authUrl,
      "EnphaseAuth",
      `width=${width},height=${height},left=${left},top=${top}`,
    );

    setAuthWindow(authWindowRef);
    setIsAuthWindowOpen(true);

    // Check if window was closed
    const checkWindow = setInterval(() => {
      if (authWindowRef?.closed) {
        clearInterval(checkWindow);
        setIsAuthWindowOpen(false);
        setAuthWindow(null);
      }
    }, 500);
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
      // formData.authorization_code,
    ];

    if (requiredFields.some((field) => !field)) {
      toast.error("Please fill out all the fields.");
      setIsSubmitting(false);
      return;
    }

    try {
      // Get refresh token from Enphase API ONLY if authorization code is provided
      let refreshToken;

      if (formData.authorization_code) {
        try {
          console.log(
            "Getting Enphase token with auth code:",
            formData.authorization_code,
          );
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
      }

      // Insert customer with refresh token
      console.log("Inserting customer with refresh token:", refreshToken);
      const { error } = await supabase.from("customers").insert([
        {
          email: formData.email,
          address: formData.address,
          site_name: formData.site_name,
          installation_date: formData.installation_date,
          installed_capacity: Number(formData.installed_capacity),
          scaling_factor: Number(formData.scaling_factor),
          price: Number(formData.price),
          authorization_code: formData.authorization_code || null,
          verification: !!formData.authorization_code,
          refresh_token: refreshToken || null,
        },
      ]);

      if (error) {
        console.error("Supabase insert error:", error);
        throw error;
      }

      console.log("Customer added successfully!");
      toast.success("Enphase customer added successfully!");

      // After successful insert in handleSimpleSubmit
      if (!formData.authorization_code) {
        console.log("No auth code provided, generating verification link...");
        // Get the new customer ID (fetch by email, or if Supabase returns it, use that)
        const { data: customerData, error: fetchError } = await supabase
          .from("customers")
          .select("id")
          .eq("email", formData.email)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!fetchError && customerData?.id) {
          console.log("Generating auth link for customer ID:", customerData.id);
          // Call the API to generate the link and send the email
          await fetch("/api/customers/generate-auth-link", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerId: customerData.id,
              customerEmail: formData.email,
            }),
          });
        }
      }

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
      // formData.site_ID,
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
          installed_capacity: Number(formData.installed_capacity),
          scaling_factor: Number(formData.scaling_factor),
          price: Number(formData.price),
          site_ID: Number(formData.site_ID),
          verification: true,
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
      <div className="border-b border-stroke px-6.5 py-4 dark:border-dark-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-dark dark:text-white">
              Add New Customer
            </h3>
            <p className="text-body-color mt-1 text-sm">
              Current Provider:{" "}
              <span className="font-medium text-primary">
                {showSimpleForm ? "Enphase" : "Solar API"}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSimpleForm(true)}
              className={`rounded-md px-4 py-2 text-sm transition-all ${
                showSimpleForm
                  ? "bg-primary text-white"
                  : "text-body-color dark:hover:bg-dark-1 bg-gray-1 hover:bg-gray-2 dark:bg-dark-2"
              }`}
            >
              Enphase Provider
            </button>
            <button
              type="button"
              onClick={() => setShowSimpleForm(false)}
              className={`rounded-md px-4 py-2 text-sm transition-all ${
                !showSimpleForm
                  ? "bg-primary text-white"
                  : "text-body-color dark:hover:bg-dark-1 bg-gray-1 hover:bg-gray-2 dark:bg-dark-2"
              }`}
            >
              Solar API Provider
            </button>
          </div>
        </div>
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
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="authorization_code"
                    value={formData.authorization_code}
                    onChange={handleChange}
                    placeholder="Enter Authorization Code"
                    className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={openEnphaseAuth}
                    disabled={isAuthWindowOpen || isSubmitting}
                    className="flex-shrink-0 rounded-[7px] bg-primary px-4 py-3 text-white transition hover:bg-opacity-90 disabled:bg-opacity-50"
                  >
                    {isAuthWindowOpen ? "Window Open" : "Get Auth Code"}
                  </button>
                </div>
                <div className="text-body-color mt-2 space-y-1 text-sm">
                  <p>Follow these steps to get the authorization code:</p>
                  <ol className="list-decimal pl-4">
                    <li>Click the &ldquo;Get Auth Code&rdquo; button above</li>
                    <li>
                      Log in with the customer&rsquo;s Enphase credentials
                    </li>
                    <li>Click &ldquo;Allow Access&rdquo; when prompted</li>
                    <li>Copy the authorization code shown on the final page</li>
                    <li>Paste the code in the input field above</li>
                  </ol>
                </div>
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
      )}

      {error && <p className="p-4 text-red-600">{error}</p>}
      {success && <p className="p-4 text-green-600">{success}</p>}
    </div>
  );
};

export default AddCustomer;
