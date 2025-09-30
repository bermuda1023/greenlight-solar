"use client";
import { supabase } from "@/utils/supabase/browserClient";
import { useCallback, useEffect, useState } from "react";
import { FaDollarSign } from "react-icons/fa";

import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface Parameters {
  id: string;
  fuelRate: number;
  feedInPrice: number;
  basePrice: number;
  belcodisc: number;
  ra_fee: number;
  export_rate: number;
  tier1: number;
  tier2: number;
  tier3: number;
  message: string;
  emailmsg: string;
  interest_rate: string;
}

const BillParams = () => {
  const [showBillForm, setShowBillForm] = useState(false);
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [showEmailMsgForm, setShowEmailMsgForm] = useState(false);

  const [showTierForm, setShowTierForm] = useState(false);

  const [formData, setFormData] = useState({
    fuelRate: "",
    feedInPrice: "",
    basePrice: "",
    belcodisc: "",
    ra_fee: "",
    export_rate: "",
    tier1: "",
    tier2: "",
    tier3: "",
    message: "",
    emailmsg: "",
    interest_rate: "",
  });

  const toggleBillForm = () => setShowBillForm(!showBillForm);
  const toggleMessageForm = () => setShowMessageForm(!showMessageForm);
  const toggleEmailMsgForm = () => setShowEmailMsgForm(!showEmailMsgForm);
  const toggleTierForm = () => setShowTierForm(!showTierForm);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success] = useState<string | null>(null);
  const [isSubmitting] = useState(false);
  const [parameters, setParameters] = useState<Parameters[]>([]);

  const fetchParameters = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error: fetchError } = await supabase
        .from("parameters")
        .select("*");

      if (fetchError) throw fetchError;

      if (data?.length > 0) {
        // Assuming the data array contains only one row; adjust if multiple rows exist
        const fetchedParameters = data[0];

        setFormData((prevFormData) => ({
          ...prevFormData,
          fuelRate: fetchedParameters.fuelRate || prevFormData?.fuelRate || "",
          feedInPrice:
            fetchedParameters.feedInPrice || prevFormData?.feedInPrice || "",
          basePrice:
            fetchedParameters.basePrice || prevFormData.basePrice || "",
          message: fetchedParameters.message || prevFormData?.message || "",
          emailmsg: fetchedParameters.emailmsg || prevFormData?.emailmsg || "",
          belcodisc:
            fetchedParameters.belcodisc || prevFormData?.belcodisc || "",
          ra_fee: fetchedParameters.ra_fee || prevFormData?.ra_fee || "",
          export_rate:
            fetchedParameters.export_rate || prevFormData?.export_rate || "",
          interest_rate:
            fetchedParameters.interest_rate || prevFormData?.interest_rate || "0",  
          tier1: fetchedParameters.tier1 || prevFormData?.tier1 || "",
          tier2: fetchedParameters.tier2 || prevFormData?.tier2 || "",
          tier3: fetchedParameters.tier3 || prevFormData?.tier3 || "",
        }));
      }

      setParameters(data || []);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while fetching parameters",
      );
      setParameters([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParameters();
  }, [fetchParameters]);

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
    toast.dismiss(); // Dismiss previous toasts before showing new ones

    // Check if any form fields are null or empty
    if (
      !formData.fuelRate ||
      !formData.feedInPrice ||
      !formData.basePrice ||
      !formData.belcodisc ||
      !formData.ra_fee ||
      !formData.export_rate ||
      !formData.tier1 ||
      !formData.tier2 ||
      !formData.tier3 ||
      !formData.message ||
      !formData.emailmsg
    ) {
      toast.error("All fields are required. Please fill in all the details."); // Toast error for null/empty values
      return;
    }

    try {
      const { data: existingRecord, error: fetchError } = await supabase
        .from("parameters")
        .select("*")
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw new Error("Failed to check existing record. Please try again.");
      }

      if (existingRecord) {
        const { error: updateError } = await supabase
          .from("parameters")
          .update({
            fuelRate: formData.fuelRate,
            feedInPrice: formData.feedInPrice,
            basePrice: formData.basePrice,
            belcodisc: formData.belcodisc,
            ra_fee: formData.ra_fee,
            export_rate: formData.export_rate,
            tier1: formData.tier1,
            tier2: formData.tier2,
            tier3: formData.tier3,
            message: formData.message,
            emailmsg: formData.emailmsg,
            interest_rate:formData.interest_rate || 0,
          })
          .eq("id", existingRecord.id);

        if (updateError) throw updateError;

        toast.success("Parameters updated successfully!"); // Toast success message
      } else {
        const { error: insertError } = await supabase
          .from("parameters")
          .insert([
            {
              fuelRate: formData.fuelRate,
              feedInPrice: formData.feedInPrice,
              basePrice: formData.basePrice,
              belcodisc: formData.belcodisc,
              ra_fee: formData.ra_fee,
              export_rate: formData.export_rate,
              tier1: formData.tier1,
              tier2: formData.tier2,
              tier3: formData.tier3,
              message: formData.message,
              emailmsg: formData.emailmsg,
              interest_rate: formData.interest_rate || 0,
            },
          ]);

        if (insertError) throw insertError;

        toast.success("Parameters added successfully!"); // Toast success message
      }

      setFormData({
        fuelRate: "",
        feedInPrice: "",
        basePrice: "",
        belcodisc: "",
        ra_fee: "",
        export_rate: "",
        tier1: "",
        tier2: "",
        tier3: "",
        message: "",
        emailmsg: "",
        interest_rate:"",
      });
      setShowBillForm(false);
      setShowMessageForm(false);
      setShowEmailMsgForm(false);
      setShowTierForm(false);

      fetchParameters();
    } catch (error) {
      toast.error("An unexpected error occurred. Please try again."); // Toast error message
    }
  };

  return (
    <>
      <div className="mb-2 p-1">
        <h1 className="text-2xl font-bold text-dark">Settings</h1>
        <p className="text-sm text-gray-500">View and manage your Profile</p>
      </div>
      <div className="space-y-8">
        {/* Bill Information */}

        <div className="grid grid-cols-2 gap-8">
          {!showBillForm && (
            <div className="col-span-5 xl:col-span-3">
              <div className="rounded-lg border border-stroke bg-white">
                <div className="flex justify-between border-b border-stroke px-7 py-4">
                  <h3 className="font-medium text-dark">Bill Information</h3>

                  <div>
                    {!showBillForm && (
                      <button
                        onClick={toggleBillForm}
                        className="hover:bg-primary-dark rounded-md bg-primary px-4 py-2 text-white"
                      >
                        Edit Parameters
                      </button>
                    )}
                  </div>
                </div>
                {parameters.map((parameter) => (
                  <div className="p-7" key={parameter.id}>
                    <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
                      <div className="w-full sm:w-1/2">
                        <label className="mb-3 block font-medium text-dark">
                          Fuel Rate
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2">
                            <FaDollarSign className="text-gray-500" />
                          </span>
                          <p className="w-full rounded-lg bg-primary/[.07] py-3 pl-12 pr-4 text-dark">
                            {parameter.fuelRate || "Enter fuel Price"}
                          </p>
                        </div>
                      </div>

                      <div className="w-full sm:w-1/2">
                        <label className="mb-3 block font-medium text-dark">
                          Feed In Price
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2">
                            <FaDollarSign className="text-gray-500" />
                          </span>
                          <p className="w-full rounded-lg bg-primary/[.07] py-3 pl-12 pr-4 text-dark">
                            {parameter.feedInPrice || "Set feed in Price"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
                      <div className="w-full sm:w-1/2">
                        <label className="mb-3 block font-medium text-dark">
                          Base Price
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2">
                            <FaDollarSign className="text-gray-500" />
                          </span>
                          <p className="w-full rounded-lg bg-primary/[.07] py-3 pl-12 pr-4 text-dark">
                            {parameter.basePrice || "Set Base Price"}
                          </p>
                        </div>
                      </div>
                      <div className="w-full sm:w-1/2">
                        <label className="mb-3 block font-medium text-dark">
                          Belco Dicount
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2">
                            <FaDollarSign className="text-gray-500" />
                          </span>
                          <p className="w-full rounded-lg bg-primary/[.07] py-3 pl-12 pr-4 text-dark">
                            {parameter.belcodisc || "Set Belco Discount Price"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* for RA fee and export Rate */}
                    <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
                      <div className="w-full sm:w-1/2">
                        <label className="mb-3 block font-medium text-dark">
                          RA Fee
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2">
                            <FaDollarSign className="text-gray-500" />
                          </span>
                          <p className="w-full rounded-lg bg-primary/[.07] py-3 pl-12 pr-4 text-dark">
                            {parameter.ra_fee || "Enter RA Fee"}
                          </p>
                        </div>
                      </div>

                      <div className="w-full sm:w-1/2">
                        <label className="mb-3 block font-medium text-dark">
                          Export Rate
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2">
                            <FaDollarSign className="text-gray-500" />
                          </span>
                          <p className="w-full rounded-lg bg-primary/[.07] py-3 pl-12 pr-4 text-dark">
                            {parameter.export_rate || "Set Export Rate"}
                          </p>
                        </div>
                      </div>

                    </div>

                    <div className="w-full sm:w-1/2">
                        <label className="mb-3 block font-medium text-dark">
                          Interest Rate
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2">
                            <FaDollarSign className="text-gray-500" />
                          </span>
                          <p className="w-full rounded-lg bg-primary/[.07] py-3 pl-12 pr-4 text-dark">
                            {parameter.interest_rate || 0}
                          </p>
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {showBillForm && (
            <div className="col-span-5 xl:col-span-3">
              <div className="rounded-lg border border-stroke bg-white ">
                <div className="border-b border-stroke px-7 py-4">
                  <h3 className="font-medium text-dark">
                    Enter Bill Parameters
                  </h3>
                </div>
                <div className="p-7">
                  <form onSubmit={handleSubmit}>
                    <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
                      <div className="w-full sm:w-1/2">
                        <label className="mb-3 block font-medium text-dark">
                          Fuel Rate
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2">
                            <FaDollarSign className="text-gray-500" />
                          </span>
                          <input
                            name="fuelRate"
                            className="w-full rounded-lg border border-stroke py-3 pl-12 pr-4 text-dark focus:border-primary"
                            value={formData.fuelRate}
                            onChange={handleChange}
                            placeholder="Set Fuel Rate"
                          />
                        </div>
                      </div>

                      <div className="w-full sm:w-1/2">
                        <label className="mb-3 block font-medium text-dark">
                          Feed In Price
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2">
                            <FaDollarSign className="text-gray-500" />
                          </span>
                          <input
                            name="feedInPrice"
                            className="w-full rounded-lg border border-stroke py-3 pl-12 pr-4 text-dark focus:border-primary"
                            value={formData.feedInPrice}
                            onChange={handleChange}
                            placeholder="Set Feed In Price"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
                      <div className="w-full sm:w-1/2">
                        <label className="mb-3 block font-medium text-dark">
                          Base Price
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2">
                            <FaDollarSign className="text-gray-500" />
                          </span>
                          <input
                            name="basePrice"
                            className="w-full rounded-lg border border-stroke py-3 pl-12 pr-4 text-dark focus:border-primary"
                            value={formData.basePrice}
                            onChange={handleChange}
                            placeholder="Set Base Price"
                          />
                        </div>
                      </div>
                      <div className="w-full sm:w-1/2">
                        <label className="mb-3 block font-medium text-dark">
                          Belco Discount
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2">
                            <FaDollarSign className="text-gray-500" />
                          </span>
                          <input
                            name="belcodisc"
                            className="w-full rounded-lg border border-stroke py-3 pl-12 pr-4 text-dark focus:border-primary"
                            value={formData.belcodisc}
                            onChange={handleChange}
                            placeholder="Set Belco Discount"
                          />
                        </div>
                      </div>
                    </div>

                    {/* New fields for RA Fee and Export Rate */}
                    <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
                      <div className="w-full sm:w-1/2">
                        <label className="mb-3 block font-medium text-dark">
                          RA Fee
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2">
                            <FaDollarSign className="text-gray-500" />
                          </span>
                          <input
                            name="ra_fee"
                            className="w-full rounded-lg border border-stroke py-3 pl-12 pr-4 text-dark focus:border-primary"
                            value={formData.ra_fee}
                            onChange={handleChange}
                            placeholder="Set RA Fee"
                          />
                        </div>
                      </div>

                      <div className="w-full sm:w-1/2">
                        <label className="mb-3 block font-medium text-dark">
                          Export Rate
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2">
                            <FaDollarSign className="text-gray-500" />
                          </span>
                          <input
                            name="export_rate"
                            className="w-full rounded-lg border border-stroke py-3 pl-12 pr-4 text-dark focus:border-primary"
                            value={formData.export_rate}
                            onChange={handleChange}
                            placeholder="Set Export Rate"
                          />
                        </div>
                      </div>
                      
                    </div>

                    <div className="w-full sm:w-1/2">
                        <label className="mb-3 block font-medium text-dark">
                          Interest Rate
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2">
                            <FaDollarSign className="text-gray-500" />
                          </span>
                          <input
                            name="interest_rate"
                            className="w-full rounded-lg border border-stroke py-3 pl-12 pr-4 text-dark focus:border-primary"
                            value={formData.interest_rate}
                            onChange={handleChange}
                            placeholder="Set Interest Rate"
                          />
                        </div>
                      </div>

                    <div className="flex justify-end gap-4">
                      <button
                        type="button"
                        onClick={toggleBillForm}
                        className="rounded-lg border border-gray-400 bg-white px-4 py-2 text-dark hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="hover:bg-primary-dark rounded-lg bg-primary px-4 py-2 text-white"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Saving..." : "Save"}
                      </button>
                    </div>
                    {error && <p className="mt-4 text-red-500">{error}</p>}
                    {success && (
                      <p className="mt-4 text-green-500">{success}</p>
                    )}
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bill Display Message */}

        <div className="grid grid-cols-2 gap-8">
          {!showMessageForm && (
            <div className="col-span-5 xl:col-span-3">
              <div className="rounded-lg border border-stroke bg-white ">
                <div className="flex justify-between border-b border-stroke px-7 py-4">
                  <h3 className="font-medium text-dark">Bill Message</h3>
                  <div>
                    {!showMessageForm && (
                      <button
                        onClick={toggleMessageForm}
                        className="hover:bg-primary-dark rounded-md bg-primary px-4 py-2 text-white"
                      >
                        Edit Message
                      </button>
                    )}
                  </div>
                </div>
                {parameters.map((parameter) => (
                  <div className="p-7" key={parameter.id}>
                    <div className="mb-5.5">
                      <label className="mb-3 block font-medium text-dark">
                        Message
                      </label>
                      <p className="w-full rounded-lg bg-primary/[.07] px-4 py-3 text-dark">
                        {parameter.message || "No message provided"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showMessageForm && (
            <div className="col-span-5 xl:col-span-3">
              <div className="rounded-lg border border-stroke bg-white ">
                <div className="border-b border-stroke px-7 py-4">
                  <h3 className="font-medium text-dark">
                    Enter Display Message
                  </h3>
                </div>
                <div className="p-7">
                  <form onSubmit={handleSubmit}>
                    <div className="mb-5.5">
                      <label className="mb-3 block font-medium text-dark">
                        Message
                      </label>
                      <textarea
                        name="message"
                        className="w-full rounded-lg border border-stroke px-4 py-3 text-dark focus:border-primary"
                        value={formData.message}
                        onChange={(e) =>
                          setFormData({ ...formData, message: e.target.value })
                        }
                        placeholder="Enter a message"
                      ></textarea>
                    </div>
                    <div className="flex justify-end gap-4">
                      <button
                        type="button"
                        onClick={toggleMessageForm}
                        className="rounded-lg border border-gray-400 bg-white px-4 py-2 text-dark hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="hover:bg-primary-dark rounded-lg bg-primary px-4 py-2 text-white"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Saving..." : "Save"}
                      </button>
                    </div>
                    {error && <p className="mt-4 text-red-500">{error}</p>}
                    {success && (
                      <p className="mt-4 text-green-500">{success}</p>
                    )}
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Email Display Message */}

        <div className="grid grid-cols-2 gap-8">
          {!showEmailMsgForm && (
            <div className="col-span-5 xl:col-span-3">
              <div className="rounded-lg border border-stroke bg-white ">
                <div className="flex justify-between border-b border-stroke px-7 py-4">
                  <h3 className="font-medium text-dark">Email Body</h3>
                  <div>
                    {!showEmailMsgForm && (
                      <button
                        onClick={toggleEmailMsgForm}
                        className="hover:bg-primary-dark rounded-md bg-primary px-4 py-2 text-white"
                      >
                        Edit Message
                      </button>
                    )}
                  </div>
                </div>
                {parameters.map((parameter) => (
                  <div className="p-7" key={parameter.id}>
                    <div className="mb-5.5">
                      <label className="mb-3 block font-medium text-dark">
                        Message
                      </label>
                      <p className="w-full rounded-lg bg-primary/[.07] px-4 py-3 text-dark">
                        {parameter.emailmsg || "No message provided"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showEmailMsgForm && (
            <div className="col-span-5 xl:col-span-3">
              <div className="rounded-lg border border-stroke bg-white ">
                <div className="border-b border-stroke px-7 py-4">
                  <h3 className="font-medium text-dark">Enter Email Message</h3>
                </div>
                <div className="p-7">
                  <form onSubmit={handleSubmit}>
                    <div className="mb-5.5">
                      <label className="mb-3 block font-medium text-dark">
                        Message
                      </label>
                      <textarea
                        name="emailmsg"
                        className="w-full rounded-lg border border-stroke px-4 py-3 text-dark focus:border-primary"
                        value={formData.emailmsg}
                        onChange={(e) =>
                          setFormData({ ...formData, emailmsg: e.target.value })
                        }
                        placeholder="Enter a message"
                      ></textarea>
                    </div>
                    <div className="flex justify-end gap-4">
                      <button
                        type="button"
                        onClick={toggleEmailMsgForm}
                        className="rounded-lg border border-gray-400 bg-white px-4 py-2 text-dark hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="hover:bg-primary-dark rounded-lg bg-primary px-4 py-2 text-white"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Saving..." : "Save"}
                      </button>
                    </div>
                    {error && <p className="mt-4 text-red-500">{error}</p>}
                    {success && (
                      <p className="mt-4 text-green-500">{success}</p>
                    )}
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tier Information */}

        <div className="grid grid-cols-2 gap-8">
          {!showTierForm && (
            <div className="col-span-5 xl:col-span-3">
              <div className="rounded-lg border border-stroke bg-white ">
                <div className="flex justify-between border-b border-stroke px-7 py-4">
                  <h3 className="font-medium text-dark">Tiers Rate</h3>

                  <div>
                    {!showTierForm && (
                      <button
                        onClick={toggleTierForm}
                        className="hover:bg-primary-dark rounded-md bg-primary px-4 py-2 text-white"
                      >
                        Edit Tiers
                      </button>
                    )}
                  </div>
                </div>
                {parameters.map((parameter) => (
                  <div className="p-7" key={parameter.id}>
                    <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
                      <div className="w-full sm:w-1/2">
                        <label className="mb-3 block font-medium text-dark">
                          Tier 1 Rate
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2">
                            <FaDollarSign className="text-gray-500" />
                          </span>
                          <p className="w-full rounded-lg bg-primary/[.07] py-3 pl-12 pr-4 text-dark">
                            {parameter.tier1 || "Enter tier 1 price"}
                          </p>
                        </div>
                      </div>

                      <div className="w-full sm:w-1/2">
                        <label className="mb-3 block font-medium text-dark">
                          Tier 2 Rate
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2">
                            <FaDollarSign className="text-gray-500" />
                          </span>
                          <p className="w-full rounded-lg bg-primary/[.07] py-3 pl-12 pr-4 text-dark">
                            {parameter.tier2 || "Enter tier 2 price"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
                      <div className="w-full sm:w-1/2">
                        <label className="mb-3 block font-medium text-dark">
                          Tier 3 rate
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2">
                            <FaDollarSign className="text-gray-500" />
                          </span>
                          <p className="w-full rounded-lg bg-primary/[.07] py-3 pl-12 pr-4 text-dark">
                            {parameter.tier3 || "Enter Tier 3 price"}
                          </p>
                        </div>
                      </div>

                      {/* if other tiers are required */}
                      {/*                
                    <div className="w-full sm:w-1/2">
                      <label className="mb-3 block font-medium text-dark">
                        Belco Dicount
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2">
                          <FaDollarSign className="text-gray-500" />
                        </span>
                        <p className="w-full rounded-lg bg-primary/[.07] py-3 pl-12 pr-4 text-dark">
                          {parameter.basePrice || "Set Base Price"}
                        </p>
                      </div>
                    </div> */}
                    </div>

                    {/* for RA fee and export Rate */}
                    {/* <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
                    <div className="w-full sm:w-1/2">
                      <label className="mb-3 block font-medium text-dark">
                        RA Fee
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2">
                          <FaDollarSign className="text-gray-500" />
                        </span>
                        <p className="w-full rounded-lg bg-primary/[.07] py-3 pl-12 pr-4 text-dark">
                          {parameter.fuelRate || "Enter fuel Price"}
                        </p>
                      </div>
                    </div>

                    <div className="w-full sm:w-1/2">
                      <label className="mb-3 block font-medium text-dark">
                        Export Rate
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2">
                          <FaDollarSign className="text-gray-500" />
                        </span>
                        <p className="w-full rounded-lg bg-primary/[.07] py-3 pl-12 pr-4 text-dark">
                          {parameter.feedInPrice || "Set feed in Price"}
                        </p>
                      </div>
                    </div>
                  </div> */}
                  </div>
                ))}
              </div>
            </div>
          )}
          {showTierForm && (
            <div className="col-span-5 xl:col-span-3">
              <div className="rounded-lg border border-stroke bg-white ">
                <div className="border-b border-stroke px-7 py-4">
                  <h3 className="font-medium text-dark">Enter Tiers Prices</h3>
                </div>
                <div className="p-7">
                  <form onSubmit={handleSubmit}>
                    <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
                      <div className="w-full sm:w-1/2">
                        <label className="mb-3 block font-medium text-dark">
                          Tier 1 Rate
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2">
                            <FaDollarSign className="text-gray-500" />
                          </span>
                          <input
                            name="tier1"
                            className="w-full rounded-lg border border-stroke py-3 pl-12 pr-4 text-dark focus:border-primary"
                            value={formData.tier1}
                            onChange={handleChange}
                            placeholder="Set Tier 1"
                          />
                        </div>
                      </div>

                      <div className="w-full sm:w-1/2">
                        <label className="mb-3 block font-medium text-dark">
                          Tier 2 Rate
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2">
                            <FaDollarSign className="text-gray-500" />
                          </span>
                          <input
                            name="tier2"
                            className="w-full rounded-lg border border-stroke py-3 pl-12 pr-4 text-dark focus:border-primary"
                            value={formData.tier2}
                            onChange={handleChange}
                            placeholder="Set Tier 2"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
                      <div className="w-full sm:w-1/2">
                        <label className="mb-3 block font-medium text-dark">
                          Tier 3 Rate
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2">
                            <FaDollarSign className="text-gray-500" />
                          </span>
                          <input
                            name="tier3"
                            className="w-full rounded-lg border border-stroke py-3 pl-12 pr-4 text-dark focus:border-primary"
                            value={formData.tier3}
                            onChange={handleChange}
                            placeholder="Set Tier 3"
                          />
                        </div>
                      </div>

                      {/* for other tiers */}
                      {/* <div className="w-full sm:w-1/2">
                      <label className="mb-3 block font-medium text-dark">
                        Belco Discount
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2">
                          <FaDollarSign className="text-gray-500" />
                        </span>
                        <input
                          name="belcoDiscount"
                          className="w-full rounded-lg border border-stroke py-3 pl-12 pr-4 text-dark focus:border-primary"
                          value={formData.basePrice}
                          onChange={handleChange}
                          placeholder="Set Belco Discount"
                        />
                      </div>
                    </div> */}
                    </div>

                    {/* New fields for RA Fee and Export Rate */}
                    {/* <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
                    <div className="w-full sm:w-1/2">
                      <label className="mb-3 block font-medium text-dark">
                        RA Fee
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2">
                          <FaDollarSign className="text-gray-500" />
                        </span>
                        <input
                          name="raFee"
                          className="w-full rounded-lg border border-stroke py-3 pl-12 pr-4 text-dark focus:border-primary"
                          value={formData.fuelRate}
                          onChange={handleChange}
                          placeholder="Set RA Fee"
                        />
                      </div>
                    </div>

                    <div className="w-full sm:w-1/2">
                      <label className="mb-3 block font-medium text-dark">
                        Export Rate
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2">
                          <FaDollarSign className="text-gray-500" />
                        </span>
                        <input
                          name="exportRate"
                          className="w-full rounded-lg border border-stroke py-3 pl-12 pr-4 text-dark focus:border-primary"
                          value={formData.feedInPrice}
                          onChange={handleChange}
                          placeholder="Set Export Rate"
                        />
                      </div>
                    </div>
                  </div> */}

                    <div className="flex justify-end gap-4">
                      <button
                        type="button"
                        onClick={toggleTierForm}
                        className="rounded-lg border border-gray-400 bg-white px-4 py-2 text-dark hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="hover:bg-primary-dark rounded-lg bg-primary px-4 py-2 text-white"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Saving..." : "Save"}
                      </button>
                    </div>
                    {error && <p className="mt-4 text-red-500">{error}</p>}
                    {success && (
                      <p className="mt-4 text-green-500">{success}</p>
                    )}
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default BillParams;
