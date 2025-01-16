"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase/browserClient";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css"; // Import Flatpickr CSS

const AddCustomer = () => {
  const [formData, setFormData] = useState({
    email: "",
    address: "",
    site_name: "",
    solar_api_key: "",
    installation_date: "",
    installed_capacity: "",
    electricity_tariff: "",
    status: "Pending",
  });

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("customers").insert([
        {
          email: formData.email,
          address: formData.address,
          site_name: formData.site_name,
          solar_api_key: formData.solar_api_key,
          installation_date: formData.installation_date,
          installed_capacity: formData.installed_capacity,
          electricity_tariff: formData.electricity_tariff,
          status: formData.status,
        },
      ]);

      if (error) {
        throw error;
      }

      setSuccess("Customer added successfully!");
      setFormData({
        email: "",
        address: "",
        site_name: "",
        solar_api_key: "",
        installation_date: "",
        installed_capacity: "",
        electricity_tariff: "",
        status: "Pending",
      });
    } catch (error) {
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
        <h3 className="font-semibold text-dark dark:text-white">
          Add New Customer
        </h3>
      </div>

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
                placeholder="5 KWH"
                className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                disabled={isSubmitting}
              />
            </div>
            <div className="w-full xl:w-1/2">
              <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                Electricity Tariff
              </label>
              <input
                type="text"
                name="electricity_tariff"
                value={formData.electricity_tariff}
                onChange={handleChange}
                placeholder="$0.0163"
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

      {error && <p className="p-4 text-red-600">{error}</p>}
      {success && <p className="p-4 text-green-600">{success}</p>}
    </div>
  );
};

export default AddCustomer;
