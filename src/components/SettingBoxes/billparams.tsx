"use client";
import { supabase } from "@/utils/supabase/browserClient";
import { useCallback, useEffect, useState } from "react";
import { FaDollarSign } from "react-icons/fa";

interface Parameters {
  id: string;
  fuelRate: number;
  feedInPrice: number;
  basePrice: number;
}

const BillParams = () => {
  const [showBillForm, setShowBillForm] = useState(false);
  const [formData, setFormData] = useState({
    fuelRate: "",
    feedInPrice: "",
    basePrice: "",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parameters, setParameters] = useState<Parameters[]>([]);

  const toggleBillForm = () => setShowBillForm(!showBillForm);

  const fetchParameters = useCallback(async () => {
    try {
      setLoading(true);

      const query = supabase.from("parameters").select("*", { count: "exact" });

      const { data, error: fetchError } = await query;
      console.log(data);

      if (fetchError) throw fetchError;

      setParameters(data || []);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while fetching customers"
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
      // Check if a record already exists
      const { data: existingRecord, error: fetchError } = await supabase
        .from("parameters")
        .select("*")
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        // Handle fetch error, excluding "No rows found" error (PGRST116)
        throw new Error("Failed to check existing record. Please try again.");
      }

      if (existingRecord) {
        // Update the existing record
        const { error: updateError } = await supabase
          .from("parameters")
          .update({
            fuelRate: formData.fuelRate,
            feedInPrice: formData.feedInPrice,
            basePrice: formData.basePrice,
          })
          .eq("id", existingRecord.id); 

        if (updateError) throw updateError;

        setSuccess("Parameters updated successfully!");
      } else {
        // Insert a new record
        const { error: insertError } = await supabase.from("parameters").insert([
          {
            fuelRate: formData.fuelRate,
            feedInPrice: formData.feedInPrice,
            basePrice: formData.basePrice,
          },
        ]);

        if (insertError) throw insertError;

        setSuccess("Parameters added successfully!");
      }

      // Reset the form
      setFormData({
        fuelRate: "",
        feedInPrice: "",
        basePrice: "",
      });
      setShowBillForm(false); // Close the form upon success

      // Refresh the parameters list
      fetchParameters();
    } catch (error) {
      console.error("Error:", error);
      setError(
        (error as Error).message || "An unexpected error occurred. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="mb-2 p-1">
          <h1 className="text-2xl font-bold text-dark">Settings</h1>
          <p className="text-sm text-gray-500">View and manage your Profile</p>
        </div>
        <div>
          {!showBillForm && (
            <button
              onClick={toggleBillForm}
              className="hover:bg-primary-dark rounded-md bg-primary px-4 py-2 text-white"
            >
              Set Bill Parameters
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Bill Information Section */}
        {!showBillForm && (
          <div className="col-span-5 xl:col-span-3">
            <div className="rounded-lg border border-stroke bg-white shadow-md">
              <div className="border-b border-stroke px-7 py-4">
                <h3 className="font-medium text-dark">Bill Information</h3>
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Update Bill Edit Section */}
        {showBillForm && (
          <div className="col-span-5 xl:col-span-3">
            <div className="rounded-lg border border-stroke bg-white shadow-md">
              <div className="border-b border-stroke px-7 py-4">
                <h3 className="font-medium text-dark">Enter Bill Parameters</h3>
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
                          placeholder="Set Feed in Price"
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
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={toggleBillForm}
                      type="button"
                      className="rounded-lg border px-6 py-2 text-dark hover:shadow-md"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      // disabled={isSubmitting}
                      className="rounded-lg bg-primary px-6 py-2 text-white hover:bg-opacity-90"
                    >
                      {isSubmitting ? "Saving..." : "Save"}
                    </button>
                  </div>
                </form>
                {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
                {success && (
                  <p className="mt-4 text-sm text-green-500">{success}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default BillParams;
