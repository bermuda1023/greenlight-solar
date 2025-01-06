import React from 'react';

const CustomersListTable = () => {
  const customerData = [
    {
      name: "John Doe",
      email: "john.doe@example.com",
      siteName: "Site A",
      solarApiKey: "API12345",
      installationDate: "2023-01-15",
      installedCapacity: "5 kW",
      electricityTariff: "$0.10/kWh",
      billingPeriod: "January 2025",
      consumption: "400",
      export: "50",
      billAmount: "$35.00",
      status: "Paid",
    },
    {
      name: "Jane Smith",
      email: "jane.smith@example.com",
      siteName: "Site B",
      solarApiKey: "API67890",
      installationDate: "2023-03-22",
      installedCapacity: "7 kW",
      electricityTariff: "$0.12/kWh",
      billingPeriod: "January 2025",
      consumption: "350",
      export: "80",
      billAmount: "$30.00",
      status: "Pending",
    },
    {
      name: "John Doe",
      email: "john.doe@example.com",
      siteName: "Site A",
      solarApiKey: "API12345",
      installationDate: "2023-01-15",
      installedCapacity: "5 kW",
      electricityTariff: "$0.10/kWh",
      billingPeriod: "January 2025",
      consumption: "400",
      export: "50",
      billAmount: "$35.00",
      status: "Paid",
    },
    {
      name: "Jane Smith",
      email: "jane.smith@example.com",
      siteName: "Site B",
      solarApiKey: "API67890",
      installationDate: "2023-03-22",
      installedCapacity: "7 kW",
      electricityTariff: "$0.12/kWh",
      billingPeriod: "January 2025",
      consumption: "350",
      export: "80",
      billAmount: "$30.00",
      status: "Pending",
    },
  ];

  return (
    <div className="w-full rounded-lg bg-white p-6 dark:bg-gray-800">
      {/* Table Header */}
      <h2 className="mb-6 text-xl font-bold text-gray-900 dark:text-white">
        Customer Billing Information
      </h2>

      {/* Table Container */}
      <div className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="relative w-full overflow-x-auto">
          <div className="min-w-[1400px]"> {/* Increased minimum width */}
            {/* Table Header Row */}
            <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900">
              <div className="grid grid-cols-12 border-b border-gray-200 dark:border-gray-700">
                {/* Fixed Header Columns */}
                <div className="sticky left-0 z-20 col-span-3 bg-gray-50 dark:bg-gray-900">
                  <div className="grid grid-cols-2">
                    <div className="w-48 p-4"> {/* Fixed width for name */}
                      <h5 className="truncate text-sm font-semibold text-gray-900 dark:text-white">Name</h5>
                    </div>
                    <div className="w-64 p-4"> {/* Fixed width for email */}
                      <h5 className="truncate text-sm font-semibold text-gray-900 dark:text-white">Email</h5>
                    </div>
                  </div>
                </div>

                {/* Scrollable Header Columns */}
                <div className="col-span-9 grid grid-cols-10">
                  <div className="w-32 p-4"> {/* Site Name */}
                    <h5 className="truncate text-sm font-semibold text-gray-900 dark:text-white">Site Name</h5>
                  </div>
                  <div className="w-32 p-4"> {/* API Key */}
                    <h5 className="truncate text-sm font-semibold text-gray-900 dark:text-white">Solar API Key</h5>
                  </div>
                  <div className="w-36 p-4"> {/* Installation Date */}
                    <h5 className="truncate text-sm font-semibold text-gray-900 dark:text-white">Installation Date</h5>
                  </div>
                  <div className="w-36 p-4"> {/* Installed Capacity */}
                    <h5 className="truncate text-sm font-semibold text-gray-900 dark:text-white">Installed Capacity</h5>
                  </div>
                  <div className="w-32 p-4"> {/* Electricity Tariff */}
                    <h5 className="truncate text-sm font-semibold text-gray-900 dark:text-white">Electricity Tariff</h5>
                  </div>
                  <div className="w-36 p-4"> {/* Billing Period */}
                    <h5 className="truncate text-sm font-semibold text-gray-900 dark:text-white">Billing Period</h5>
                  </div>
                  <div className="w-36 p-4"> {/* Consumption */}
                    <h5 className="truncate text-sm font-semibold text-gray-900 dark:text-white">Consumption (kWh)</h5>
                  </div>
                  <div className="w-32 p-4"> {/* Export */}
                    <h5 className="truncate text-sm font-semibold text-gray-900 dark:text-white">Export (kWh)</h5>
                  </div>
                  <div className="w-28 p-4"> {/* Bill Amount */}
                    <h5 className="truncate text-sm font-semibold text-gray-900 dark:text-white">Bill Amount</h5>
                  </div>
                  <div className="w-24 p-4"> {/* Status */}
                    <h5 className="truncate text-sm font-semibold text-gray-900 dark:text-white">Status</h5>
                  </div>
                </div>
              </div>
            </div>

            {/* Table Body */}
            {customerData.map((customer, index) => (
              <div 
                key={index} 
                className={`grid grid-cols-12 border-b border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800`}
              >
                {/* Fixed Body Columns */}
                <div className="sticky left-0 z-10 col-span-3 bg-white dark:bg-gray-800">
                  <div className="grid grid-cols-2">
                    <div className="w-48 p-4"> {/* Name */}
                      <p className="truncate text-sm text-gray-900 dark:text-gray-200">
                        {customer.name}
                      </p>
                    </div>
                    <div className="w-64 p-4"> {/* Email */}
                      <p className="truncate text-sm text-gray-900 dark:text-gray-200">
                        {customer.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Scrollable Body Columns */}
                <div className="col-span-9 grid grid-cols-10">
                  <div className="w-32 p-4">
                    <p className="truncate text-sm text-gray-900 dark:text-gray-200">
                      {customer.siteName}
                    </p>
                  </div>
                  <div className="w-32 p-4">
                    <p className="truncate text-sm text-gray-900 dark:text-gray-200">
                      {customer.solarApiKey}
                    </p>
                  </div>
                  <div className="w-36 p-4">
                    <p className="truncate text-sm text-gray-900 dark:text-gray-200">
                      {customer.installationDate}
                    </p>
                  </div>
                  <div className="w-36 p-4">
                    <p className="truncate text-sm text-gray-900 dark:text-gray-200">
                      {customer.installedCapacity}
                    </p>
                  </div>
                  <div className="w-32 p-4">
                    <p className="truncate text-sm text-gray-900 dark:text-gray-200">
                      {customer.electricityTariff}
                    </p>
                  </div>
                  <div className="w-36 p-4">
                    <p className="truncate text-sm text-gray-900 dark:text-gray-200">
                      {customer.billingPeriod}
                    </p>
                  </div>
                  <div className="w-36 p-4">
                    <p className="truncate text-sm text-gray-900 dark:text-gray-200">
                      {customer.consumption}
                    </p>
                  </div>
                  <div className="w-32 p-4">
                    <p className="truncate text-sm text-gray-900 dark:text-gray-200">
                      {customer.export}
                    </p>
                  </div>
                  <div className="w-28 p-4">
                    <p className="truncate text-sm font-medium text-green-500">
                      {customer.billAmount}
                    </p>
                  </div>
                  <div className="w-24 p-4">
                    <p className={`truncate text-sm font-medium ${
                      customer.status === "Paid" 
                        ? "text-green-500" 
                        : "text-red-500"
                    }`}>
                      {customer.status}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomersListTable;