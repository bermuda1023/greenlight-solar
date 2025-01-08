"use client";

import React, { useState } from "react";
import { supabase } from "@/utils/supabase/browserClient";
import MonthYearPicker from "../FormElements/DatePicker/MonthPicker";

const AddCustomer = () => {
  const [formData, setFormData] = useState({
    siteName: "",
    email: "",
    siteID: "",
    priceCap: "",
    productionKWH: "",
    selfConsKWH: "",
    consumpKWH: "",
    exportKWH: "",
    belcoPrice: "",
    effectivePrice: "",
    billPeriod: "",
    exDays: "",
    savings: "",
    status: "Pending",
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // Track submission state

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleMonthYearChange = (e: { target: { name: string; value: string } }) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true); // Disable the form submission button

    try {
      const { error } = await supabase.from("customers").insert([
        {
          site_name: formData.siteName,
          email: formData.email,
          site_id: formData.siteID,
          price_cap: formData.priceCap,
          production_kwh: parseFloat(formData.productionKWH) || 0,
          self_cons_kwh: parseFloat(formData.selfConsKWH) || 0,
          consump_kwh: parseFloat(formData.consumpKWH) || 0,
          export_kwh: parseFloat(formData.exportKWH) || 0,
          belco_price: formData.belcoPrice,
          effective_price: formData.effectivePrice,
          bill_period: formData.billPeriod,
          ex_days: parseInt(formData.exDays) || 0,
          savings: formData.savings,
          status: formData.status,
        },
      ]);

      if (error) {
        throw error;
      }

      setSuccess("Customer added successfully!");
      setFormData({
        siteName: "",
        email: "",
        siteID: "",
        priceCap: "",
        productionKWH: "",
        selfConsKWH: "",
        consumpKWH: "",
        exportKWH: "",
        belcoPrice: "",
        effectivePrice: "",
        billPeriod: "",
        exDays: "",
        savings: "",
        status: "Pending",
      });
    } catch (error) {
      setError("Failed to add customer. Please try again.");
    } finally {
      setIsSubmitting(false); // Re-enable the form submission button
    }
  };

  return (
    <div className="rounded-[10px] border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
      <div className="border-b border-stroke px-6.5 py-4 dark:border-dark-3">
        <h3 className="font-semibold text-dark dark:text-white">
          Add New Customer
        </h3>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="p-6.5">
          {/* Site Name and Email Row */}
          <div className="mb-4.5 flex flex-col gap-4.5 xl:flex-row">
            <div className="w-full xl:w-1/2">
              <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                Site Name
              </label>
              <input
                type="text"
                name="siteName"
                value={formData.siteName}
                onChange={handleChange}
                placeholder="Enter site name"
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
                placeholder="Enter customer email"
                className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Site ID and Price Cap Row */}
          <div className="mb-4.5 flex flex-col gap-4.5 xl:flex-row">
            <div className="w-full xl:w-1/2">
              <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                Site ID
              </label>
              <input
                type="text"
                name="siteID"
                value={formData.siteID}
                onChange={handleChange}
                placeholder="Enter site ID"
                className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
              />
            </div>

            <div className="w-full xl:w-1/2">
              <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                Price Cap
              </label>
              <input
                type="text"
                name="priceCap"
                value={formData.priceCap}
                onChange={handleChange}
                placeholder="Enter price cap (e.g., $100)"
                className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
              />
            </div>
          </div>

          {/* Production and Self Consumption Row */}
          <div className="mb-4.5 flex flex-col gap-4.5 xl:flex-row">
            <div className="w-full xl:w-1/2">
              <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                Production (kWh)
              </label>
              <input
                type="number"
                name="productionKWH"
                value={formData.productionKWH}
                onChange={handleChange}
                placeholder="Enter production"
                className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
              />
            </div>

            <div className="w-full xl:w-1/2">
              <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                Self Consumption (kWh)
              </label>
              <input
                type="number"
                name="selfConsKWH"
                value={formData.selfConsKWH}
                onChange={handleChange}
                placeholder="Enter self consumption"
                className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
              />
            </div>
          </div>

          {/* Consumption and Export Row */}
          <div className="mb-4.5 flex flex-col gap-4.5 xl:flex-row">
            <div className="w-full xl:w-1/2">
              <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                Consumption (kWh)
              </label>
              <input
                type="number"
                name="consumpKWH"
                value={formData.consumpKWH}
                onChange={handleChange}
                placeholder="Enter consumption"
                className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
              />
            </div>

            <div className="w-full xl:w-1/2">
              <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                Export (kWh)
              </label>
              <input
                type="number"
                name="exportKWH"
                value={formData.exportKWH}
                onChange={handleChange}
                placeholder="Enter export"
                className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
              />
            </div>
          </div>

          {/* Belco Price and Effective Price Row */}
          <div className="mb-4.5 flex flex-col gap-4.5 xl:flex-row">
            <div className="w-full xl:w-1/2">
              <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                Belco Price ($)
              </label>
              <input
                type="text"
                name="belcoPrice"
                value={formData.belcoPrice}
                onChange={handleChange}
                placeholder="Enter belco price"
                className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
              />
            </div>

            <div className="w-full xl:w-1/2">
              <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                Effective Price ($)
              </label>
              <input
                type="text"
                name="effectivePrice"
                value={formData.effectivePrice}
                onChange={handleChange}
                placeholder="Enter effective price"
                className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
              />
            </div>
          </div>

          {/* Billing Period and Ex. Days Row */}
          <div className="mb-4.5 flex flex-col gap-4.5 xl:flex-row">
            <div className="w-full xl:w-1/2">
              <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                Billing Period
              </label>
              {/* <input
                type="text"
                name="billPeriod"
                value={formData.billPeriod}
                onChange={handleChange}
                placeholder="Enter billing period (e.g., January 2024)"
                className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
              /> */}
              <MonthYearPicker
                value={formData.billPeriod}
                onChange={handleMonthYearChange}
              />
            </div>

            <div className="w-full xl:w-1/2">
              <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                Ex. Days
              </label>
              <input
                type="number"
                name="exDays"
                value={formData.exDays}
                onChange={handleChange}
                placeholder="Enter days (e.g., 31)"
                className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
              />
            </div>
          </div>

          {/* Savings and Status Row */}
          <div className="mb-4.5 flex flex-col gap-4.5 xl:flex-row">
            <div className="w-full xl:w-1/2">
              <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                Savings ($)
              </label>
              <input
                type="text"
                name="savings"
                value={formData.savings}
                onChange={handleChange}
                placeholder="Enter savings"
                className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
              />
            </div>

            <div className="w-full xl:w-1/2">
              <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                Status
              </label>
              <select
                className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
              </select>
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

      {error && <p className="p-4 text-red-500">{error}</p>}
      {success && <p className="p-4 text-green-500">{success}</p>}
    </div>
  );
};

export default AddCustomer;
