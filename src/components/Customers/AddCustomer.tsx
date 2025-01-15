// "use client";

// import React, { useState } from "react";
// import { supabase } from "@/utils/supabase/browserClient";
// import MonthYearPicker from "../FormElements/DatePicker/MonthPicker";

// const AddCustomer = () => {
//   const [formData, setFormData] = useState({
//     name:"",
//     siteName: "",
//     solar_api_key: "",
//     installation_date: "",
//     installed_capacity: "",
//     electricity_tariff: "",
//     status: "Pending",
//   });

//   const [error, setError] = useState<string | null>(null);
//   const [success, setSuccess] = useState<string | null>(null);
//   const [isSubmitting, setIsSubmitting] = useState(false); // Track submission state

//   const handleChange = (
//     e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
//   ) => {
//     setFormData({
//       ...formData,
//       [e.target.name]: e.target.value,
//     });
//   };

//   const handleMonthYearChange = (e: { target: { name: string; value: string } }) => {
//     setFormData({
//       ...formData,
//       [e.target.name]: e.target.value,
//     });
//   };

//   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     setError(null);
//     setSuccess(null);
//     setIsSubmitting(true); // Disable the form submission button

//     try {
//       const { error } = await supabase.from("customers").insert([
//         {
//           name: formData.name,
//           site_name: formData.siteName,
//           solar_api_key: formData.solar_api_key,
//           installation_date: formData.installation_date,
//           installed_capacity: formData.installed_capacity,
//           electricity_tariff: formData.electricity_tariff,
//           status: formData.status,
//         },
//       ]);

//       if (error) {
//         throw error;
//       }

//       setSuccess("Customer added successfully!");
//       setFormData({
//         name: "",
//         siteName: "",
//         solar_api_key: "",
//         installation_date: "",
//         installed_capacity: "",
//         electricity_tariff: "",
//         status: "Pending",
//       });
//     } catch (error) {
//       setError("Failed to add customer. Please try again.");
//     } finally {
//       setIsSubmitting(false); // Re-enable the form submission button
//     }
//   };

//   return (
//     <div className="rounded-[10px] border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
//       <div className="border-b border-stroke px-6.5 py-4 dark:border-dark-3">
//         <h3 className="font-semibold text-dark dark:text-white">
//           Add New Customer
//         </h3>
//       </div>

//       <form onSubmit={handleSubmit}>
//         <div className="p-6.5">
//           {/* Site Name and Email Row */}
//           <div className="mb-4.5 flex flex-col gap-4.5 xl:flex-row">
//           <div className="w-full xl:w-1/2">
//               <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
//                 Name
//               </label>
//               <input
//                 type="text"
//                 name="name"
//                 value={formData.name}
//                 onChange={handleChange}
//                 placeholder="Enter Name"
//                 className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
//                 disabled={isSubmitting}
//               />
//             </div>

//             <div className="w-full xl:w-1/2">
//               <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
//                 Site Name
//               </label>
//               <input
//                 type="text"
//                 name="siteName"
//                 value={formData.siteName}
//                 onChange={handleChange}
//                 placeholder="Enter site name"
//                 className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
//                 disabled={isSubmitting}
//               />
//             </div>

//             <div className="w-full xl:w-1/2">
//               <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
//                 Solar API Key
//               </label>
//               <input
//                 type="text"
//                 name="solar_api_key"
//                 value={formData.solar_api_key}
//                 onChange={handleChange}
//                 placeholder="Enter Solar API Key"
//                 className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
//                 disabled={isSubmitting}
//               />
//             </div>
//             <div className="flex flex-col w-full xl:w-1/2">
//   <label
//     className="mb-3 block text-body-sm font-medium text-dark dark:text-white"
//     htmlFor="installDate"
//   >
//     Installation Date
//   </label>
//   <input
//     id="installDate"
//     type="date"
//     name="installation_date"
//     value={formData.installation_date || ""}
//     onChange={(e) => {
//       const { name, value } = e.target as HTMLInputElement;
//       setFormData((prevFormData) => ({
//         ...prevFormData,
//         [name]: value, // Ensures the date is updated in YYYY-MM-DD format
//       }));
//     }}
//     placeholder="Select Installation Date"
//     className={`form-datepicker w-full rounded-[7px] border-[1.5px] ${
//       !formData.installation_date && isSubmitting ? "border-red-500" : "border-stroke"
//     } bg-transparent bg-white px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary`}
//     disabled={isSubmitting}
//   />
// </div>


//             <div className="w-full xl:w-1/2">
//               <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
//                 Installed Capacity
//               </label>
//               <input
//                 type="text"
//                 name="installed_capacity"
//                 value={formData.installed_capacity}
//                 onChange={handleChange}
//                 placeholder="Enter Installed Capacity"
//                 className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
//                 disabled={isSubmitting}
//               />
//             </div>
//             <div className="w-full xl:w-1/2">
//               <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
//                 Electricity Tariff
//               </label>
//               <input
//                 type="text"
//                 name="electricity_tariff"
//                 value={formData.electricity_tariff}
//                 onChange={handleChange}
//                 placeholder="Enter Tariff"
//                 className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
//                 disabled={isSubmitting}
//               />
//             </div>

           
//             <div className="w-full xl:w-1/2">
//               <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
//                 Status
//               </label>
//               <select
//                 className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
//                 name="status"
//                 value={formData.status}
//                 onChange={handleChange}
//               >
//                 <option value="Paid">Paid</option>
//                 <option value="Pending">Pending</option>
//               </select>
//             </div>
//           </div>

//           <button
//             type="submit"
//             className="flex w-full justify-center rounded-[7px] bg-primary p-[13px] font-medium text-white hover:bg-opacity-90"
//             disabled={isSubmitting}
//           >
//             {isSubmitting ? "Submitting..." : "Add Customer"}
//           </button>
//         </div>
//       </form>

//       {error && <p className="p-4 text-red-500">{error}</p>}
//       {success && <p className="p-4 text-green-500">{success}</p>}
//     </div>
//   );
// };

// export default AddCustomer;



'use client'
import React, { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase/browserClient";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css"; // Import Flatpickr CSS

const AddCustomer = () => {
  const [formData, setFormData] = useState({
    name: "",
    siteName: "",
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
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
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
          name: formData.name,
          site_name: formData.siteName,
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
        name: "",
        siteName: "",
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
          {/* Name & Site Name */}
          <div className="mb-4.5 flex flex-col gap-4.5 xl:flex-row">
            <div className="w-full xl:w-1/2">
              <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter Name"
                className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                disabled={isSubmitting}
              />
            </div>

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
          </div>

          {/* Solar API Key & Installation Date */}
          <div className="mb-4.5 flex flex-col gap-4.5 xl:flex-row">
            <div className="w-full xl:w-1/2">
              <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                Solar API Key
              </label>
              <input
                type="text"
                name="solar_api_key"
                value={formData.solar_api_key}
                onChange={handleChange}
                placeholder="Enter Solar API Key"
                className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                disabled={isSubmitting}
              />
            </div>

            <div className="flex flex-col w-full xl:w-1/2">
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
                placeholder="Select Installation Date"
                className={`form-datepicker w-full rounded-[7px] border-[1.5px] ${
                  !formData.installation_date && isSubmitting
                    ? "border-red-500"
                    : "border-stroke"
                } bg-transparent bg-white px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary`}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Installed Capacity & Electricity Tariff */}
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
                placeholder="Enter Installed Capacity"
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
                placeholder="Enter Tariff"
                className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Status Dropdown */}
          <div className="mb-4.5 flex flex-col gap-4.5 xl:flex-row">
            <div className="w-full">
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

      {error && <p className="p-4 text-red-600">{error}</p>}
      {success && <p className="p-4 text-green-600">{success}</p>}
    </div>
  );
};

export default AddCustomer;
