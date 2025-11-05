"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase/browserClient";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    email: "",
    address: "",
    site_name: "",
    solar_api_key: "",
    installation_date: "",
    installed_capacity: "",
    scaling_factor: "",
    price: "",
    belco_rate: "",
    site_ID: "",
    authorization_code: "",
  });

  const [showSimpleForm, setShowSimpleForm] = useState(false);
  const [isAuthWindowOpen, setIsAuthWindowOpen] = useState(false);
  const [authWindow, setAuthWindow] = useState<Window | null>(null);
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

  const getEnphaseToken = async (authorizationCode: string) => {
    try {
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
      return data.refresh_token;
    } catch (error) {
      console.error("Error getting Enphase token:", error);
      throw error;
    }
  };

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
    setIsSubmitting(true);

    const requiredFields = [
      formData.email,
      formData.address,
      formData.site_name,
      formData.installation_date,
      formData.installed_capacity,
      formData.scaling_factor,
      formData.price,
    ];

    if (requiredFields.some((field) => !field)) {
      toast.error("Please fill out all the fields.");
      setIsSubmitting(false);
      return;
    }

    try {
      let refreshToken;

      if (formData.authorization_code) {
        try {
          toast.info("Getting authorization from Enphase...");
          refreshToken = await getEnphaseToken(formData.authorization_code);
        } catch (tokenError) {
          console.error("Error getting Enphase token:", tokenError);
          toast.error(
            "Failed to authorize with Enphase. The authorization code may be expired or invalid.",
          );
          setIsSubmitting(false);
          return;
        }
      }

      const { data: insertedCustomer, error } = await supabase
        .from("customers")
        .insert([
          {
            email: formData.email,
            address: formData.address,
            site_name: formData.site_name,
            installation_date: formData.installation_date,
            installed_capacity: Number(formData.installed_capacity),
            scaling_factor: Number(formData.scaling_factor),
            price: Number(formData.price),
            belco_rate: formData.belco_rate ? Number(formData.belco_rate) : null,
            authorization_code: formData.authorization_code || null,
            verification: !!formData.authorization_code,
            refresh_token: refreshToken || null,
          },
        ])
        .select();

      if (error) {
        console.error("Supabase insert error:", error);
        throw error;
      }

      if (insertedCustomer && insertedCustomer[0]) {
        const { error: balanceError } = await supabase
          .from("customer_balances")
          .insert([
            {
              customer_id: insertedCustomer[0].id,
              total_billed: 0,
              total_paid: 0,
              current_balance: 0,
            },
          ]);

        if (balanceError) {
          console.error("Error creating customer balance:", balanceError);
          toast.warning("Customer added but balance record creation failed.");
        }
      }

      toast.success("Enphase customer added successfully!");

      if (!formData.authorization_code) {
        const { data: customerData, error: fetchError } = await supabase
          .from("customers")
          .select("id")
          .eq("email", formData.email)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!fetchError && customerData?.id) {
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
        belco_rate: "",
        site_ID: "",
        authorization_code: "",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error adding customer:", error);
      toast.error("Failed to add customer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast.dismiss();
    setIsSubmitting(true);

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
      toast.error("Please fill out all the fields.");
      setIsSubmitting(false);
      return;
    }

    try {
      const { data: insertedCustomer, error } = await supabase
        .from("customers")
        .insert([
          {
            email: formData.email,
            address: formData.address,
            site_name: formData.site_name,
            solar_api_key: formData.solar_api_key,
            installation_date: formData.installation_date,
            installed_capacity: Number(formData.installed_capacity),
            scaling_factor: Number(formData.scaling_factor),
            price: Number(formData.price),
            belco_rate: formData.belco_rate ? Number(formData.belco_rate) : null,
            site_ID: Number(formData.site_ID),
            verification: true,
          },
        ])
        .select();

      if (error) {
        throw error;
      }

      if (insertedCustomer && insertedCustomer[0]) {
        const { error: balanceError } = await supabase
          .from("customer_balances")
          .insert([
            {
              customer_id: insertedCustomer[0].id,
              total_billed: 0,
              total_paid: 0,
              current_balance: 0,
            },
          ]);

        if (balanceError) {
          console.error("Error creating customer balance:", balanceError);
          toast.warning("Customer added but balance record creation failed.");
        }
      }

      toast.success("Customer added successfully!");

      setFormData({
        email: "",
        address: "",
        site_name: "",
        solar_api_key: "",
        installation_date: "",
        installed_capacity: "",
        scaling_factor: "",
        price: "",
        belco_rate: "",
        site_ID: "",
        authorization_code: "",
      });

      onSuccess();
      onClose();
    } catch (error) {
      toast.error("Failed to add customer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const installDatePicker = flatpickr("#installDateModal", {
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

      return () => {
        if (installDatePicker && "destroy" in installDatePicker) {
          (installDatePicker as any).destroy();
        }
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-999 flex items-center justify-center bg-gray-500 bg-opacity-50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[10px] border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
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
                    htmlFor="installDateModal"
                  >
                    Installation Date
                  </label>

                  <input
                    id="installDateModal"
                    type="text"
                    name="installation_date"
                    value={formData.installation_date || ""}
                    placeholder="Jan 01, 2025"
                    className="form-datepicker w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent bg-white px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary"
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
                </div>
              </div>

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

              <div className="mb-4.5">
                <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                  Belco Rate
                </label>
                <input
                  type="text"
                  name="belco_rate"
                  value={formData.belco_rate}
                  onChange={handleChange}
                  placeholder="Enter Belco Rate"
                  className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex w-full justify-center rounded-[7px] border border-stroke bg-gray p-[13px] font-medium text-dark hover:bg-opacity-90 dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex w-full justify-center rounded-[7px] bg-primary p-[13px] font-medium text-white hover:bg-opacity-90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Add Customer"}
                </button>
              </div>
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
                    htmlFor="installDateModal"
                  >
                    Installation Date
                  </label>

                  <input
                    id="installDateModal"
                    type="text"
                    name="installation_date"
                    value={formData.installation_date || ""}
                    placeholder="Jan 01, 2025"
                    className="form-datepicker w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent bg-white px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary"
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
                <div className="w-full xl:w-1/2">
                  <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                    Site ID
                  </label>
                  <input
                    type="text"
                    name="site_ID"
                    value={formData.site_ID}
                    onChange={handleChange}
                    placeholder="Enter Site ID"
                    className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

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

              <div className="mb-4.5">
                <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                  Belco Rate
                </label>
                <input
                  type="text"
                  name="belco_rate"
                  value={formData.belco_rate}
                  onChange={handleChange}
                  placeholder="Enter Belco Rate"
                  className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex w-full justify-center rounded-[7px] border border-stroke bg-gray p-[13px] font-medium text-dark hover:bg-opacity-90 dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex w-full justify-center rounded-[7px] bg-primary p-[13px] font-medium text-white hover:bg-opacity-90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Add Customer"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddCustomerModal;
