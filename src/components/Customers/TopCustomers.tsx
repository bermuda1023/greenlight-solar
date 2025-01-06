import React from "react";

const TopCustomers = () => {
  const customerData = [
    {
      name: "John Doe",
      email: "john.doe@example.com",
      siteName: "Site A",
      installedCapacity: "5 kW",
      electricityTariff: "$0.10/kWh",
      consumption: "400",
    },
    {
      name: "Jane Smith",
      email: "jane.smith@example.com",
      siteName: "Site B",
      installedCapacity: "7 kW",
      electricityTariff: "$0.12/kWh",
      consumption: "350",
    },
  ];

  return (
    <div className="w-full h-full rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      {/* Table Header */}
      <h2 className="mb-6 text-xl font-bold text-gray-900 dark:text-white">
        Top Customers
      </h2>

      {/* Table Container */}
      <div className="relative overflow-x-auto">
        <table className="min-w-full table-auto border-collapse">
          {/* Table Header */}
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              {/* Responsive Fixed Columns */}
              <th
                className="relative md:sticky md:left-0 z-20 bg-gray-100 px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:bg-gray-700 dark:text-white"
                style={{ minWidth: "150px" }}
              >
                Name
              </th>
              <th
                className="relative md:sticky md:left-[150px] z-20 bg-gray-100 px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:bg-gray-700 dark:text-white"
                style={{ minWidth: "200px" }}
              >
                Email
              </th>

              {/* Scrollable Columns */}
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                Site Name
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                Installed Capacity
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                Electricity Tariff
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                Consumption (kWh)
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {customerData.map((customer, index) => (
              <tr
                key={index}
                className={`${
                  index % 2 === 0
                    ? "bg-white dark:bg-gray-800"
                    : "bg-gray-50 dark:bg-gray-700"
                }`}
              >
                {/* Responsive Fixed Columns */}
                <td
                  className="relative md:sticky md:left-0 z-10 px-4 py-3 text-sm text-gray-900 dark:text-gray-200"
                  style={{ minWidth: "150px", background: "inherit" }}
                >
                  {customer.name}
                </td>
                <td
                  className="relative md:sticky md:left-[150px] z-10 px-4 py-3 text-sm text-gray-900 dark:text-gray-200"
                  style={{ minWidth: "200px", background: "inherit" }}
                >
                  {customer.email}
                </td>

                {/* Scrollable Columns */}
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">
                  {customer.siteName}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">
                  {customer.installedCapacity}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">
                  {customer.electricityTariff}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">
                  {customer.consumption}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopCustomers;