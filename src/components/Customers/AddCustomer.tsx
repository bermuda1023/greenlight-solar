"use client";

import React from "react";
import DatePickerCustomer from "../FormElements/DatePicker/DatePickerCustomer";

const AddCustomer = () => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Handle form submission logic here
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
                placeholder="Enter site name"
                className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
              />
            </div>

            <div className="w-full xl:w-1/2">
              <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                Email
              </label>
              <input
                type="email"
                placeholder="Enter customer email"
                className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
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
              <input
                type="text"
                placeholder="Enter billing period (e.g., January 2024)"
                className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
              />
            </div>

            <div className="w-full xl:w-1/2">
              <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                Ex. Days
              </label>
              <input
                type="number"
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
                placeholder="Enter savings"
                className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
              />
            </div>

            <div className="w-full xl:w-1/2">
              <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                Status
              </label>
              <select className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary">
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="flex w-full justify-center rounded-[7px] bg-primary p-[13px] font-medium text-white hover:bg-opacity-90"
          >
            Add Customer
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddCustomer;
