"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  FaArrowLeft,
  FaArrowRight,
  FaRegEdit,
  FaRegFilePdf,
  FaRegTrashAlt,
} from "react-icons/fa";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faCheckCircle,
  faTimesCircle,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";
import { AiOutlineSearch } from "react-icons/ai";
import { TbReceipt } from "react-icons/tb";
import flatpickr from "flatpickr";
import { supabase } from "@/utils/supabase/browserClient";
import BillModal from "../Billing/BillModal";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useRef } from "react";

interface Customer {
  id: string;
  site_name: string;
  email: string;
  address: string;
  solar_api_key: string;
  installation_date: string;
  installed_capacity: number;
  site_ID: number;
  created_at: string;
  scaling_factor: number;
  price: number;
  consump_kwh: number; // Total consumption
  self_cons_kwh: number; // Self-consumption
  export_kwh: number; // Energy exported
  production_kwh: number; // Energy produced
  outstanding_balance: number;
  savings: number;
  belco_revenue: number;
  greenlight_revenue: number; // Total
  authorization_status: string;
  authorization_token: string | null;
  verification: boolean;
  authorization_code: string | null;
}

const CustomersListTable = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [siteCapacity, setSiteCapacity] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage] = useState(1);
  const [pageSize] = useState(200);
  const [totalCount, setTotalCount] = useState(0);
  const [showBillModal, setShowBillModal] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [EditModalOpen, setEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New state for customer type filtering
  const [customerType, setCustomerType] = useState<"all" | "solar" | "enphase">("all");

  const [formData, setFormData] = useState({
    email: "",
    address: "",
    site_name: "",
    solar_api_key: "",
    authorization_code: "",
    installation_date: "",
    installed_capacity: "",
    scaling_factor: "",
    price: "",
    site_ID: "",
  });

  // State for managing the customer ID for deletion
  const [customerIdToDelete, setCustomerIdToDelete] = useState<string | null>(
    null,
  );
  const [customerIdToEdit, setCustomerIdToEdit] = useState<string | null>(null);

  // Helper function to determine customer type
  const getCustomerType = (customer: Customer): "solar" | "enphase" => {
    // Enphase customers have authorization_code, Solar API customers have solar_api_key
    return customer.authorization_code ? "enphase" : "solar";
  };

  // Filter customers based on selected type
  const filteredCustomers = customers.filter(customer => {
    if (customerType === "all") return true;
    return getCustomerType(customer) === customerType;
  });
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  useEffect(() => {
    const startDatePicker = flatpickr("#startDate", {
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
          setStartDate(formattedDate);
          setDateError(null);
        } else {
          setStartDate(null);
        }
      },
    });

    const endDatePicker = flatpickr("#endDate", {
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
          setEndDate(formattedDate);
          setDateError(null);
        } else {
          setEndDate(null);
        }
      },
    });

    return () => {
      if (startDatePicker && "destroy" in startDatePicker) {
        (startDatePicker as any).destroy();
      }
      if (endDatePicker && "destroy" in endDatePicker) {
        (endDatePicker as any).destroy();
      }
    };
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);

      // First, get total count for pagination
      const countQuery = supabase
        .from("customers")
        .select("*", { count: "exact" });

      if (searchTerm) {
        countQuery.or(
          `site_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`,
        );
      }

      if (statusFilter) {
        countQuery.eq("status", statusFilter);
      }

      const { count } = await countQuery;
      setTotalCount(count || 0);

      // Then fetch paginated customer data
      let query = supabase
        .from("customers")
        .select("*")
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(
          `site_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`,
        );
      }

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      // Add this log to see what data is being returned:
      console.log("Customer data from database:", data);

      // Fetch the outstanding balance (current_balance) for each customer
      const customersWithBalance = await Promise.all(
        data.map(async (customer) => {
          const { data: balanceData, error: balanceError } = await supabase
            .from("customer_balances")
            .select("current_balance")
            .eq("customer_id", customer.id)
            .single(); // Assuming each customer has one balance record

          if (balanceError) {
            console.error("Error fetching balance:", balanceError);
          }

          return {
            ...customer,
            outstanding_balance: balanceData?.current_balance || 0, // Default to 0 if no balance is found
          };
        }),
      );

      setCustomers(customersWithBalance);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while fetching customers",
      );
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, currentPage, pageSize]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomers((prev) =>
      prev.includes(customerId)
        ? prev.filter((id) => id !== customerId)
        : [...prev, customerId],
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedCustomers(customers.map((customer) => customer.id));
    } else {
      setSelectedCustomers([]);
    }
  };

  const validateDates = () => {
    if (!startDate || !endDate) {
      setDateError(
        "Please select both Start Date and End Date before generating the bill.",
      );
      toast.error("Please select both Start Date and End Date.");
      return false;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      setDateError("End Date cannot be earlier than Start Date");
      toast.error("End Date cannot be earlier than Start Date.");
      return false;
    }

    return true;
  };

  const validateCustomerSelection = () => {
    if (selectedCustomers.length === 0) {
      toast.error("Please select at least one customer.");
      return false;
    }
    return true;
  };

  const handleGenerateBill = () => {
    // Reset error state
    setDateError(null);

    // Validate dates first
    const datesValid = validateDates();
    if (!datesValid) {
      return;
    }

    // Then validate customer selection
    const customersValid = validateCustomerSelection();
    if (!customersValid) {
      return;
    }
    setShowBillModal(true);
  };

  const handleDelete = async (customerId: string) => {
    // Specify the type as string
    try {
      // Perform the deletion using the customer ID
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customerId); // Use the customer ID directly

      if (error) throw error; // Handle any error that occurred during deletion

      // If no error, refetch the updated list of customers
      fetchCustomers(); // Refetch customers to update the list

      toast.success("Customer has been deleted.");

      // Close the modal
      setDeleteModalOpen(false);
    } catch (err) {
      console.error("Error deleting customer:", err);
      toast.error("Failed to delete the customer. Please try again.");
    }
  };
  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast.dismiss();
    setIsSubmitting(true);

    if (!customerIdToEdit) {
      toast.error("No customer selected for editing.");
      setIsSubmitting(false);
      return;
    }

    try {
      // Convert necessary fields to correct data types
      const updatedData = {
        email: formData.email,
        address: formData.address,
        site_name: formData.site_name,
        solar_api_key: formData.solar_api_key,
        installation_date: formData.installation_date,
        installed_capacity: formData.installed_capacity
          ? Number(formData.installed_capacity)
          : null,
        scaling_factor: formData.scaling_factor
          ? Number(formData.scaling_factor)
          : null,
        price: formData.price ? Number(formData.price) : null,
        site_ID: formData.site_ID ? Number(formData.site_ID) : null,
      };

      const { error } = await supabase
        .from("customers")
        .update(updatedData)
        .eq("id", customerIdToEdit);

      if (error) throw error;

      toast.success("Customer updated successfully!");
      setEditModalOpen(false);
      fetchCustomers(); // Refresh customer list
    } catch (error) {
      console.error("Error updating customer:", error);
      toast.error("Failed to update customer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Close the modal without doing anything
    setDeleteModalOpen(false);
  };
  const handleCloseEdit = () => {
    // Close the modal without doing anything
    setEditModalOpen(false);
  };

  const handleDeleteClick = (customerId: string) => {
    setCustomerIdToDelete(customerId);
    setDeleteModalOpen(true); // Open the modal
  };

  const handleEditCustomer = (customerId: string) => {
    const customer = customers.find((cust) => cust.id === customerId);
    if (customer) {
      setFormData({
        email: customer.email || "",
        address: customer.address || "",
        site_name: customer.site_name || "",
        solar_api_key: customer.solar_api_key || "",
        authorization_code: customer.authorization_code || "",
        installation_date: customer.installation_date || "",
        installed_capacity: customer.installed_capacity
          ? customer.installed_capacity.toString()
          : "",
        scaling_factor: customer.scaling_factor
          ? customer.scaling_factor.toString()
          : "",
        price: customer.price ? customer.price.toString() : "",
        site_ID: customer.site_ID ? customer.site_ID.toString() : "",
      });

      setCustomerIdToEdit(customerId);
      setEditModalOpen(true);
    }
  };

  const generateAuthLink = async (customerId: string) => {
    try {
      const res = await fetch("/api/customers/generate-auth-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });
      const data = await res.json();
      if (res.ok && data.link) {
        toast.success(
          "Authorization link generated! Link copied to clipboard.",
        );
        await navigator.clipboard.writeText(data.link);
      } else {
        toast.error(data.error || "Failed to generate link.");
      }
    } catch (err) {
      toast.error("Failed to generate link.");
    }
  };

  // Add these states at the top of your component
  // const [showAuthModal, setShowAuthModal] = useState(false);
  // const [authModalCustomer, setAuthModalCustomer] = useState<Customer | null>(
  //   null,
  // );
  // const [authCode, setAuthCode] = useState("");
  // const [isAuthWindowOpen, setIsAuthWindowOpen] = useState(false);
  // const [authWindow, setAuthWindow] = useState<Window | null>(null);

  // Function to open Enphase Auth window (copy from AddCustomer)
  const ENPHASE_AUTH_URL = "https://api.enphaseenergy.com/oauth/authorize";
  const CLIENT_ID = "ba5228e4f843a94607e6cc245043bc54";
  const REDIRECT_URI = "https://api.enphaseenergy.com/oauth/redirect_uri";

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

    // setAuthWindow(authWindowRef); // This state is no longer needed
    // setIsAuthWindowOpen(true); // This state is no longer needed

    // Check if window was closed
    const checkWindow = setInterval(() => {
      if (authWindowRef?.closed) {
        clearInterval(checkWindow);
        // setIsAuthWindowOpen(false); // This state is no longer needed
        // setAuthWindow(null); // This state is no longer needed
      }
    }, 500);
  };

  // Handler for clicking Pending badge
  const handlePendingClick = async (customer: Customer) => {
    try {
      const res = await fetch("/api/customers/generate-auth-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          customerEmail: customer.email,
        }),
      });
      const data = await res.json();
      if (res.ok && data.link) {
        await navigator.clipboard.writeText(data.link);
        toast.success(
          "Verification link copied to clipboard! Send it to the customer.",
        );
      } else {
        toast.error(data.error || "Failed to generate verification link.");
      }
    } catch (err) {
      toast.error("Failed to generate verification link.");
    }
  };

  // Handler for submitting the modal (save code to DB, etc.)
  // const handleAuthModalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  //   e.preventDefault();
  //   if (!authModalCustomer) return;
  //   // Save the code to the customer (update in Supabase)
  //   const { error } = await supabase
  //     .from("customers")
  //     .update({ authorization_code: authCode, verification: true })
  //     .eq("id", authModalCustomer.id);

  //   if (!error) {
  //     toast.success("Authorization code saved!");
  //     setShowAuthModal(false);
  //     fetchCustomers(); // Refresh list
  //   } else {
  //     toast.error("Failed to save authorization code.");
  //   }
  // };

  return (
    <>
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="mb-2 p-1">
          <h1 className="text-2xl font-bold text-dark">Customers List</h1>
          <p className="text-sm text-gray-500">View and manage customers.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <input
              id="startDate"
              className={`form-datepicker w-full rounded-[7px] border-[1.5px] ${
                !startDate && dateError ? "border-red-500" : "border-stroke"
              } bg-transparent bg-white px-5 py-3 font-normal outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary`}
              placeholder="Start Date"
              value={startDate ?? ""}
            />
          </div>
          <div className="flex flex-col">
            <input
              id="endDate"
              className={`form-datepicker w-full rounded-[7px] border-[1.5px] ${
                !endDate && dateError ? "border-red-500" : "border-stroke"
              } bg-transparent bg-white px-5 py-3 font-normal outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary`}
              placeholder="End Date"
              value={endDate ?? ""}
            />
          </div>
          <button
            onClick={handleGenerateBill}
            className="hover:bg-dark-1 flex items-center gap-2 whitespace-nowrap rounded-md bg-dark-2 px-4 py-3 text-white"
          >
            <TbReceipt /> Generate Bill
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-10">
        <div className="rounded-[10px] border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
          <div className="p-4">
            {/* Filters */}
            <div className="mb-6 flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by Site Name or Email"
                  className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                />
                <AiOutlineSearch className="absolute right-3 top-1/2 -translate-y-1/2 transform text-dark-6 dark:text-white" />
              </div>
              <div className="flex gap-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                >
                  <option value="">Status: All</option>
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                </select>

                <select
                  value={siteCapacity}
                  onChange={(e) => setSiteCapacity(e.target.value)}
                  className="rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                >
                  <option value="">Site Capacity</option>
                  <option value="0-5">0-5 kW</option>
                  <option value="5-10">5-10 kW</option>
                  <option value="10+">10+ kW</option>
                </select>
              </div>
            </div>

            {/* Customer Type Filter Buttons */}
            <div className="mb-6 flex flex-wrap gap-3">
              <button
                onClick={() => setCustomerType("all")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  customerType === "all"
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                All Customers ({customers.length})
              </button>
              <button
                onClick={() => setCustomerType("solar")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  customerType === "solar"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                Solar API Customers ({customers.filter(c => getCustomerType(c) === "solar").length})
              </button>
              <button
                onClick={() => setCustomerType("enphase")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  customerType === "enphase"
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                Enphase Customers ({customers.filter(c => getCustomerType(c) === "enphase").length})
              </button>
            </div>

            {/* Loading and Error States */}
            {loading && (
              <div className="py-4 text-center">
                <p className="text-gray-500">Loading customers...</p>
              </div>
            )}

            {error && (
              <div className="py-4 text-center">
                <p className="text-red-500">{error}</p>
              </div>
            )}

            {/* Bills Table */}
            <div className="rounded-[10px] border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark">
              <div className="max-w-full overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b border-stroke bg-gray-2 dark:border-dark-3 dark:bg-dark-2">
                      <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        <input
                          type="checkbox"
                          onChange={handleSelectAll}
                          checked={
                            selectedCustomers.length === customers.length &&
                            customers.length > 0
                          }
                          className="custom-checkbox text-white"
                        />
                      </th>
                      <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Site Name
                      </th>
                      <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Email
                      </th>
                      <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Address
                      </th>
                      <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Site ID
                      </th>
                      {customerType === "all" && (
                        <>
                          <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                            Solar API Key
                          </th>
                          <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                            Authorization Code
                          </th>
                        </>
                      )}
                      {customerType === "solar" && (
                        <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                          Solar API Key
                        </th>
                      )}
                      {customerType === "enphase" && (
                        <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                          Authorization Code
                        </th>
                      )}
                      <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Installation Date
                      </th>
                      <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Installed Capacity
                      </th>
                      <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Outstanding
                      </th>

                      <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Verification
                      </th>
                      <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((customer) => (
                      <tr
                        key={customer.id}
                        className="border-b border-stroke dark:border-dark-3"
                      >
                        <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                          <input
                            type="checkbox"
                            checked={selectedCustomers.includes(customer.id)}
                            onChange={() => handleSelectCustomer(customer.id)}
                            className="custom-checkbox text-white"
                          />
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                          {customer.site_name}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                          {customer.email}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                          {customer.address}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                          {customer.site_ID }
                        </td>
                        {customerType === "all" && (
                          <>
                            <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                              {customer.solar_api_key || 'N/A'}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                              {customer.authorization_code || 'N/A'}
                            </td>
                          </>
                        )}
                        {customerType === "solar" && (
                          <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                            {customer.solar_api_key}
                          </td>
                        )}
                        {customerType === "enphase" && (
                          <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                            {customer.authorization_code}
                          </td>
                        )}
                        <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                          {customer.installation_date}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                          {customer.installed_capacity}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                          {customer.outstanding_balance.toFixed(2)}{" "}
                          {/* Display outstanding balance */}
                        </td>

                        {/* Action button */}

                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          {customer.verification ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                              <FontAwesomeIcon
                                icon={faCircleCheck}
                                className="h-3 w-3"
                              />
                              Complete
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800"
                              onClick={() => handlePendingClick(customer)}
                            >
                              <FontAwesomeIcon
                                icon={faClock}
                                className="h-3 w-3"
                              />
                              Pending
                            </button>
                          )}
                        </td>
                        <td className="flex space-x-3 px-6.5 py-4 text-sm dark:text-white">
                          <button
                            onClick={() => handleEditCustomer(customer.id)}
                            className="rounded-lg bg-green-50 p-2 text-primary transition hover:bg-primary hover:text-green-50"
                          >
                            <span className="text-xl">
                              <FaRegEdit />
                            </span>
                          </button>
                          {/* <button
                            onClick={() => handleEditCustomer(customer.id)}
                           className="rounded-lg bg-green-50 p-2 text-primary transition hover:bg-primary hover:text-green-50"
                                    >
                                      <span className="text-xl">
                                        <FaRegEdit />
                                      </span>
                       
                          </button> */}
                          <button
                            onClick={() => handleDeleteClick(customer.id)}
                            className="rounded-lg bg-red-50 p-2 text-red-600 transition hover:bg-red-600 hover:text-red-50"
                          >
                            <span className="text-xl">
                              <FaRegTrashAlt />
                            </span>
                          </button>

                          {/* Generate Authorization Link button for pending Enphase customers */}
                          {customer.authorization_status ===
                            "ENPHASE_AUTHORIZATION_PENDING" &&
                            !customer.authorization_token && (
                              <button
                                onClick={() => generateAuthLink(customer.id)}
                                className="rounded-lg bg-blue-50 p-2 text-blue-600 transition hover:bg-blue-600 hover:text-blue-50"
                              >
                                Generate Authorization Link
                              </button>
                            )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between p-6">
                <div className="flex items-center">
                  <select className="rounded-[7px] border-[1.5px] border-stroke bg-transparent px-4 py-2 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white">
                    <option value="10">10 per page</option>
                    <option value="25">25 per page</option>
                    <option value="50">50 per page</option>
                  </select>
                  <span className="ml-4 text-sm text-dark dark:text-white">
                    Showing 1 to {customers.length} of {customers.length}{" "}
                    results
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    className="rounded-[7px] border-[1.5px] border-stroke bg-transparent px-4 py-2 text-sm text-dark transition hover:bg-gray-200 disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
                    disabled
                  >
                    <FaArrowLeft /> Previous
                  </button>
                  <button
                    className="rounded-[7px] border-[1.5px] border-stroke bg-transparent px-4 py-2 text-sm text-dark transition hover:bg-gray-200 disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
                    disabled
                  >
                    Next <FaArrowRight />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Bill Generation Modal */}
      <ToastContainer />{" "}
      {/* Toast container for displaying notifications globally */}
      {showBillModal && ( // Conditional rendering based on showBillModal state
        <BillModal
          selectedCustomers={selectedCustomers}
          customers={customers}
          startDate={startDate}
          endDate={endDate}
          onClose={() => setShowBillModal(false)} // Close the modal by setting showBillModal to false
        />
      )}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-gray-500 bg-opacity-50">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-center text-lg font-semibold">
              Confirm Deletion
            </h3>
            <p className="mb-4 text-center">
              Are you sure you want to delete the selected customer?
            </p>
            <div className="flex justify-between">
              <button
                onClick={handleClose}
                className="rounded-md bg-gray-300 px-4 py-2 text-black hover:bg-gray-400"
              >
                No
              </button>
              <button
                onClick={() => handleDelete(customerIdToDelete!)} // Use non-null assertion operator for customerIdToDelete
                className="rounded-md bg-red-500 px-4 py-2 text-white hover:bg-red-600"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
      {EditModalOpen && (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-gray-500 bg-opacity-50">
          <div className="w-full max-w-6xl rounded-lg bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-center text-lg font-semibold text-gray-700">
              Edit Customer Details
            </h3>

            <form onSubmit={handleEditSubmit}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Site Name
                  </label>
                  <input
                    type="text"
                    value={formData.site_name}
                    onChange={handleChange}
                    name="site_name"
                    className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-green-500 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    name="email"
                    className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-green-500 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Installation Date
                  </label>
                  <input
                    type="text"
                    value={formData.installation_date}
                    onChange={handleChange}
                    name="installation_date"
                    className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-green-500 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={handleChange}
                    name="address"
                    className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-green-500 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Installed Capacity
                  </label>
                  <input
                    type="text"
                    value={formData.installed_capacity}
                    onChange={handleChange}
                    name="installed_capacity"
                    className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-green-500 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Site ID
                  </label>
                  <input
                    type="text"
                    value={formData.site_ID}
                    onChange={handleChange}
                    name="site_ID"
                    className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-green-500 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Scaling Factor
                  </label>
                  <input
                    type="text"
                    value={formData.scaling_factor}
                    onChange={handleChange}
                    name="scaling_factor"
                    className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-green-500 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Price
                  </label>
                  <input
                    type="text"
                    value={formData.price}
                    onChange={handleChange}
                    name="price"
                    className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-green-500 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Conditional API Key / Authorization Code fields */}
              {(() => {
                const currentCustomer = customers.find(c => c.id === customerIdToEdit);
                const isEnphaseCustomer = currentCustomer ? getCustomerType(currentCustomer) === "enphase" : false;
                
                return (
                  <>
                    {!isEnphaseCustomer && (
                      <div className="mt-4">
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Solar API Key
                        </label>
                        <input
                          type="text"
                          value={formData.solar_api_key}
                          onChange={handleChange}
                          name="solar_api_key"
                          className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-green-500 focus:ring-green-500"
                        />
                      </div>
                    )}
                    
                    {isEnphaseCustomer && (
                      <div className="mt-4">
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Authorization Code
                        </label>
                        <input
                          type="text"
                          value={formData.authorization_code}
                          onChange={handleChange}
                          name="authorization_code"
                          className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-green-500 focus:ring-green-500"
                        />
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="mt-6 flex justify-between">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  className="rounded-md bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`rounded-md px-4 py-2 text-white ${
                    isSubmitting
                      ? "cursor-not-allowed bg-gray-400"
                      : "bg-blue-500 hover:bg-blue-600"
                  }`}
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Removed Auth Modal as per edit hint */}
    </>
  );
};

export default CustomersListTable;
