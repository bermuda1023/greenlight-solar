"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  FaArrowLeft,
  FaArrowRight,
  FaRegEdit,
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
import TokenRefreshModal from "../Enphase/TokenRefreshModal";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
  belco_rate: number;
  consump_kwh: number;
  self_cons_kwh: number;
  export_kwh: number;
  production_kwh: number;
  outstanding_balance: number;
  savings: number;
  belco_revenue: number;
  greenlight_revenue: number;
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
  const [customerType, setCustomerType] = useState<"all" | "solar" | "enphase">("all");
  const [isAuthWindowOpen, setIsAuthWindowOpen] = useState(false);
  const [authWindow, setAuthWindow] = useState<Window | null>(null);
  const [newAuthCode, setNewAuthCode] = useState("");
  const [showTokenRefreshModal, setShowTokenRefreshModal] = useState(false);
  const [selectedCustomerForRefresh, setSelectedCustomerForRefresh] = useState<Customer | null>(null);

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
    belco_rate: "",
    site_ID: "",
  });

  const ENPHASE_AUTH_URL = "https://api.enphaseenergy.com/oauth/authorize";
  const CLIENT_ID = "ba5228e4f843a94607e6cc245043bc54";
  const REDIRECT_URI = "https://api.enphaseenergy.com/oauth/redirect_uri";

  const [customerIdToDelete, setCustomerIdToDelete] = useState<string | null>(
    null,
  );
  const [customerIdToEdit, setCustomerIdToEdit] = useState<string | null>(null);

  const getCustomerType = (customer: Customer): "solar" | "enphase" => {
    return customer.authorization_code ? "enphase" : "solar";
  };
  const filteredCustomers = customers.filter(customer => {
    if (customerType === "all") return true;
    return getCustomerType(customer) === customerType;
  });

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

  const handleNewAuthCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCode = e.target.value;
    setNewAuthCode(newCode);
    setFormData(prev => ({
      ...prev,
      authorization_code: newCode
    }));
  };
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

      console.log("Customer data from database:", data);
      const customersWithBalance = await Promise.all(
        data.map(async (customer) => {
          const { data: balanceData, error: balanceError } = await supabase
            .from("customer_balances")
            .select("current_balance")
            .eq("customer_id", customer.id)
            .single();

          if (balanceError) {
            console.error("Error fetching balance:", balanceError);
          }

          return {
            ...customer,
            outstanding_balance: balanceData?.current_balance || 0,
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
    setDateError(null);

    const datesValid = validateDates();
    if (!datesValid) {
      return;
    }

    const customersValid = validateCustomerSelection();
    if (!customersValid) {
      return;
    }
    setShowBillModal(true);
  };

  const handleDelete = async (customerId: string) => {
    try {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customerId);

      if (error) throw error;

      fetchCustomers();

      toast.success("Customer has been deleted.");

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
        authorization_code: formData.authorization_code,
        installation_date: formData.installation_date,
        installed_capacity: formData.installed_capacity
          ? Number(formData.installed_capacity)
          : null,
        scaling_factor: formData.scaling_factor
          ? Number(formData.scaling_factor)
          : null,
        price: formData.price ? Number(formData.price) : null,
        belco_rate: formData.belco_rate ? Number(formData.belco_rate) : null,
        site_ID: formData.site_ID ? Number(formData.site_ID) : null,
      };

      const { error } = await supabase
        .from("customers")
        .update(updatedData)
        .eq("id", customerIdToEdit);

      if (error) throw error;

      toast.success("Customer updated successfully!");
      setEditModalOpen(false);
      fetchCustomers();
    } catch (error) {
      console.error("Error updating customer:", error);
      toast.error("Failed to update customer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setDeleteModalOpen(false);
  };
  const handleCloseEdit = () => {
    setNewAuthCode("");
    setIsAuthWindowOpen(false);
    setAuthWindow(null);
    setEditModalOpen(false);
  };

  const handleDeleteClick = (customerId: string) => {
    setCustomerIdToDelete(customerId);
    setDeleteModalOpen(true);
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
        belco_rate: customer.belco_rate ? customer.belco_rate.toString() : "",
        site_ID: customer.site_ID ? customer.site_ID.toString() : "",
      });

      setNewAuthCode("");
      setIsAuthWindowOpen(false);
      setAuthWindow(null);

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

  const handlePendingClick = async (customer: Customer) => {
    if (customer.authorization_code && customer.authorization_status === "ENPHASE_AUTHORIZATION_EXPIRED") {
      setSelectedCustomerForRefresh(customer);
      setShowTokenRefreshModal(true);
      return;
    }

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

  const handleTokenRefreshSuccess = () => {
    fetchCustomers();
    toast.success("Token refreshed successfully!");
  };
  const handleBulkTokenRefresh = async () => {
    if (selectedCustomers.length === 0) {
      toast.error("Please select customers to refresh tokens for.");
      return;
    }

    const enphaseCustomers = customers.filter(
      customer => selectedCustomers.includes(customer.id) && customer.authorization_code
    );

    if (enphaseCustomers.length === 0) {
      toast.error("No Enphase customers selected. Token refresh is only available for Enphase customers.");
      return;
    }

    const toastId = toast.info(`Refreshing tokens for ${enphaseCustomers.length} Enphase customers...`);

    try {
      const response = await fetch("/api/enphase/bulk-refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerIds: enphaseCustomers.map(c => c.id),
          action: "refresh"
        }),
      });

      const data = await response.json();
      toast.dismiss(toastId);

      if (response.ok && data.success) {
        const { summary } = data;
        
        if (summary.successful > 0) {
          toast.success(`Successfully refreshed ${summary.successful} tokens`);
        }
        
        if (summary.failed > 0) {
          toast.warn(`${summary.failed} tokens failed to refresh`);
        }
        
        if (summary.needsReauthorization > 0) {
          toast.error(
            `${summary.needsReauthorization} customers need manual reauthorization. Click the red "Expired" badges or blue refresh icons to fix them.`,
            { autoClose: 8000 }
          );
        }

        fetchCustomers();
      } else {
        toast.error(`Bulk refresh failed: ${data.details || data.error}`);
      }
    } catch (error) {
      toast.dismiss(toastId);
      console.error("Error in bulk token refresh:", error);
      toast.error("Failed to refresh tokens. Please try again.");
    }
  };

  return (
    <>
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
                        Customer Rate
                      </th>
                      <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Belco Rate
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
                            <td className="px-6 py-4 text-sm dark:text-white max-w-[120px]">
                              <div className="truncate" title={customer.solar_api_key ?? 'N/A'}>
                                {customer.solar_api_key ? `${customer.solar_api_key.substring(0, 12)}...` : 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm dark:text-white max-w-[120px]">
                              <div className="truncate" title={customer.authorization_code ?? 'N/A'}>
                                {customer.authorization_code ? `${customer.authorization_code.substring(0, 12)}...` : 'N/A'}
                              </div>
                            </td>
                          </>
                        )}
                        {customerType === "solar" && (
                          <td className="px-6 py-4 text-sm dark:text-white max-w-[150px]">
                            <div className="truncate" title={customer.solar_api_key ?? undefined}>
                              {customer.solar_api_key ? `${customer.solar_api_key.substring(0, 15)}...` : ''}
                            </div>
                          </td>
                        )}
                        {customerType === "enphase" && (
                          <td className="px-6 py-4 text-sm dark:text-white max-w-[150px]">
                            <div className="truncate" title={customer.authorization_code ?? undefined}>
                              {customer.authorization_code ? `${customer.authorization_code.substring(0, 15)}...` : ''}
                            </div>
                          </td>
                        )}
                        <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                          {customer.installation_date}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                          {customer.installed_capacity}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                          ${customer.price ? customer.price.toFixed(2) : '0.00'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                          ${customer.belco_rate ? customer.belco_rate.toFixed(2) : '0.00'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                          {customer.outstanding_balance.toFixed(2)}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          {customer.authorization_status === "ENPHASE_AUTHORIZATION_EXPIRED" ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-800"
                              onClick={() => handlePendingClick(customer)}
                            >
                              <FontAwesomeIcon
                                icon={faTimesCircle}
                                className="h-3 w-3"
                              />
                              Expired - Re-authorize
                            </button>
                          ) : customer.verification ? (
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
                          <button
                            onClick={() => handleDeleteClick(customer.id)}
                            className="rounded-lg bg-red-50 p-2 text-red-600 transition hover:bg-red-600 hover:text-red-50"
                          >
                            <span className="text-xl">
                              <FaRegTrashAlt />
                            </span>
                          </button>

                          {customer.authorization_code && (
                            <button
                              onClick={() => {
                                setSelectedCustomerForRefresh(customer);
                                setShowTokenRefreshModal(true);
                              }}
                              className={`rounded-lg p-2 transition ${
                                customer.authorization_status === "ENPHASE_AUTHORIZATION_EXPIRED"
                                  ? "bg-red-50 text-red-600 hover:bg-red-600 hover:text-red-50"
                                  : "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-blue-50"
                              }`}
                              title="Refresh Enphase Token"
                            >
                              <span className="text-xl">
                                <FontAwesomeIcon icon={faCheckCircle} />
                              </span>
                            </button>
                          )}

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
      <ToastContainer />
      {showBillModal && (
        <BillModal
          selectedCustomers={selectedCustomers}
          customers={customers}
          startDate={startDate}
          endDate={endDate}
          onClose={() => setShowBillModal(false)}
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
                onClick={() => handleDelete(customerIdToDelete!)}
                className="rounded-md bg-red-500 px-4 py-2 text-white hover:bg-red-600"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
      {EditModalOpen && (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-gray-500 bg-opacity-50 p-4">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-lg bg-white p-4 shadow-lg sm:p-6">
            <h3 className="mb-4 text-center text-lg font-semibold text-gray-700 sm:text-xl">
              Edit Customer Details
            </h3>

            <form onSubmit={handleEditSubmit}>
              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700 sm:mb-2 sm:text-sm">
                    Site Name
                  </label>
                  <input
                    type="text"
                    value={formData.site_name}
                    onChange={handleChange}
                    name="site_name"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:ring-green-500 sm:px-4 sm:text-base"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700 sm:mb-2 sm:text-sm">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    name="email"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:ring-green-500 sm:px-4 sm:text-base"
                  />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:mt-4 sm:gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700 sm:mb-2 sm:text-sm">
                    Installation Date
                  </label>
                  <input
                    type="text"
                    value={formData.installation_date}
                    onChange={handleChange}
                    name="installation_date"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:ring-green-500 sm:px-4 sm:text-base"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700 sm:mb-2 sm:text-sm">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={handleChange}
                    name="address"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:ring-green-500 sm:px-4 sm:text-base"
                  />
                </div>
              </div>

              <div className={`mt-3 grid grid-cols-1 gap-3 sm:mt-4 sm:gap-4 ${
                (() => {
                  const currentCustomer = customers.find(c => c.id === customerIdToEdit);
                  const isEnphaseCustomer = currentCustomer
                    ? getCustomerType(currentCustomer) === "enphase"
                    : false;
                  return isEnphaseCustomer ? "grid-cols-1" : "md:grid-cols-2";
                })()
              }`}
              >
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700 sm:mb-2 sm:text-sm">
                    Installed Capacity
                  </label>
                  <input
                    type="text"
                    value={formData.installed_capacity}
                    onChange={handleChange}
                    name="installed_capacity"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:ring-green-500 sm:px-4 sm:text-base"
                  />
                </div>
                {(() => {
                const currentCustomer = customers.find(c => c.id === customerIdToEdit);
                const isEnphaseCustomer = currentCustomer ? getCustomerType(currentCustomer) === "enphase" : false;

                return (
                  <>
                    {!isEnphaseCustomer && (
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-gray-700 sm:mb-2 sm:text-sm">
                          Site ID
                        </label>
                        <input
                          type="text"
                          value={formData.site_ID}
                          onChange={handleChange}
                          name="site_ID"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:ring-green-500 sm:px-4 sm:text-base"
                        />
                      </div>
                    )}
                  </>
                );
                })()}
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:mt-4 sm:gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700 sm:mb-2 sm:text-sm">
                    Scaling Factor
                  </label>
                  <input
                    type="text"
                    value={formData.scaling_factor}
                    onChange={handleChange}
                    name="scaling_factor"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:ring-green-500 sm:px-4 sm:text-base"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700 sm:mb-2 sm:text-sm">
                    Price
                  </label>
                  <input
                    type="text"
                    value={formData.price}
                    onChange={handleChange}
                    name="price"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:ring-green-500 sm:px-4 sm:text-base"
                  />
                </div>
              </div>

              <div className="mt-3 sm:mt-4">
                <label className="mb-1.5 block text-xs font-medium text-gray-700 sm:mb-2 sm:text-sm">
                  Belco Rate
                </label>
                <input
                  type="text"
                  value={formData.belco_rate}
                  onChange={handleChange}
                  name="belco_rate"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:ring-green-500 sm:px-4 sm:text-base"
                />
              </div>

              {(() => {
                const currentCustomer = customers.find(c => c.id === customerIdToEdit);
                const isEnphaseCustomer = currentCustomer ? getCustomerType(currentCustomer) === "enphase" : false;

                return (
                  <>
                    {!isEnphaseCustomer && (
                      <div className="mt-3 sm:mt-4">
                        <label className="mb-1.5 block text-xs font-medium text-gray-700 sm:mb-2 sm:text-sm">
                          Solar API Key
                        </label>
                        <input
                          type="text"
                          value={formData.solar_api_key}
                          onChange={handleChange}
                          name="solar_api_key"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:ring-green-500 sm:px-4 sm:text-base"
                        />
                      </div>
                    )}

                    {isEnphaseCustomer && (
                      <div className="mt-3 sm:mt-4">
                        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-1.5 block text-xs font-medium text-gray-700 sm:mb-2 sm:text-sm">
                              Previous Authorization Code
                            </label>
                            <input
                              type="text"
                              value={currentCustomer?.authorization_code || ""}
                              readOnly
                              className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-600 sm:text-sm"
                              placeholder="No previous code"
                            />
                          </div>

                          <div>
                            <label className="mb-1.5 block text-xs font-medium text-gray-700 sm:mb-2 sm:text-sm">
                              New Authorization Code
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                name="new_authorization_code"
                                value={newAuthCode}
                                onChange={handleNewAuthCodeChange}
                                placeholder="Enter New Code"
                                className="flex-1 rounded-md border border-gray-300 px-2 py-2 text-xs text-gray-900 focus:border-green-500 focus:ring-green-500 sm:px-3 sm:text-sm"
                                disabled={isSubmitting}
                              />
                              <button
                                type="button"
                                onClick={openEnphaseAuth}
                                disabled={isAuthWindowOpen || isSubmitting}
                                className="flex-shrink-0 whitespace-nowrap rounded-md bg-primary px-2 py-2 text-xs text-white transition hover:bg-opacity-90 disabled:bg-opacity-50 sm:px-3 sm:text-sm"
                              >
                                {isAuthWindowOpen ? "Opening..." : "Get Code"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="mt-4 flex flex-col-reverse gap-2 sm:mt-6 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  className="w-full rounded-md bg-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-400 sm:w-auto sm:px-6"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full rounded-md px-4 py-2.5 text-sm font-medium text-white sm:w-auto sm:px-6 ${
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

      {showTokenRefreshModal && selectedCustomerForRefresh && (
        <TokenRefreshModal
          customer={selectedCustomerForRefresh}
          onClose={() => {
            setShowTokenRefreshModal(false);
            setSelectedCustomerForRefresh(null);
          }}
          onSuccess={handleTokenRefreshSuccess}
        />
      )}
    </>
  );
};

export default CustomersListTable;