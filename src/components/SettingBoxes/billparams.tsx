"use client";
import { supabase } from "@/utils/supabase/browserClient";
import { useCallback, useEffect, useState } from "react";
import { FaDollarSign } from "react-icons/fa";

import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface Parameters {
  id: string;
  belcodisc: number;
  export_rate: number;
  interest_rate: string;
}

const BillParams = () => {
  const [showEditForm, setShowEditForm] = useState(false);

  const [formData, setFormData] = useState({
    belcodisc: "",
    export_rate: "",
    interest_rate: "",
  });

  const toggleEditForm = () => setShowEditForm(!showEditForm);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parameters, setParameters] = useState<Parameters[]>([]);

  const fetchParameters = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error: fetchError } = await supabase
        .from("parameters")
        .select("*");

      if (fetchError) throw fetchError;

      if (data?.length > 0) {
        const fetchedParameters = data[0];

        setFormData({
          belcodisc: fetchedParameters.belcodisc || "",
          export_rate: fetchedParameters.export_rate || "",
          interest_rate: fetchedParameters.interest_rate || "0",
        });
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
    toast.dismiss();

    // Validate required fields
    if (!formData.belcodisc || !formData.export_rate || !formData.interest_rate) {
      toast.error("All fields are required. Please fill in all the details.");
      return;
    }

    setIsSubmitting(true);

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
            belcodisc: formData.belcodisc,
            export_rate: formData.export_rate,
            interest_rate: formData.interest_rate || 0,
          })
          .eq("id", existingRecord.id);

        if (updateError) throw updateError;

        toast.success("Parameters updated successfully!");
      } else {
        const { error: insertError } = await supabase
          .from("parameters")
          .insert([
            {
              belcodisc: formData.belcodisc,
              export_rate: formData.export_rate,
              interest_rate: formData.interest_rate || 0,
            },
          ]);

        if (insertError) throw insertError;

        toast.success("Parameters added successfully!");
      }

      setShowEditForm(false);
      fetchParameters();
    } catch (error) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">Loading parameters...</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-2 p-1">
        <h1 className="text-2xl font-bold text-dark">Settings</h1>
        <p className="text-sm text-gray-500">View and manage your parameters</p>
      </div>
      <div className="space-y-8">
        {/* Bill Parameters */}
        <div className="grid grid-cols-1 gap-8">
          {!showEditForm && (
            <div className="col-span-1">
              <div className="rounded-lg border border-stroke bg-white">
                <div className="flex justify-between border-b border-stroke px-7 py-4">
                  <h3 className="font-medium text-dark">Bill Parameters</h3>
                  <div>
                    <button
                      onClick={toggleEditForm}
                      className="hover:bg-primary-dark rounded-md bg-primary px-4 py-2 text-white"
                    >
                      Edit Parameters
                    </button>
                  </div>
                </div>
                {parameters.length > 0 ? (
                  parameters.map((parameter) => (
                    <div className="p-7" key={parameter.id}>
                      <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
                        <div className="w-full sm:w-1/3">
                          <label className="mb-3 block font-medium text-dark">
                            Belco Discount
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2">
                              <FaDollarSign className="text-gray-500" />
                            </span>
                            <p className="w-full rounded-lg bg-primary/[.07] py-3 pl-12 pr-4 text-dark">
                              {parameter.belcodisc || "Set Belco Discount"}
                            </p>
                          </div>
                        </div>

                        <div className="w-full sm:w-1/3">
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

                        <div className="w-full sm:w-1/3">
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
                    </div>
                  ))
                ) : (
                  <div className="p-7">
                    <p className="text-gray-500">No parameters found. Click "Edit Parameters" to add them.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {showEditForm && (
            <div className="col-span-1">
              <div className="rounded-lg border border-stroke bg-white">
                <div className="border-b border-stroke px-7 py-4">
                  <h3 className="font-medium text-dark">Edit Bill Parameters</h3>
                </div>
                <div className="p-7">
                  <form onSubmit={handleSubmit}>
                    <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
                      <div className="w-full sm:w-1/3">
                        <label className="mb-3 block font-medium text-dark">
                          Belco Discount
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2">
                            <FaDollarSign className="text-gray-500" />
                          </span>
                          <input
                            name="belcodisc"
                            type="number"
                            step="0.01"
                            className="w-full rounded-lg border border-stroke py-3 pl-12 pr-4 text-dark focus:border-primary"
                            value={formData.belcodisc}
                            onChange={handleChange}
                            placeholder="Set Belco Discount"
                          />
                        </div>
                      </div>

                      <div className="w-full sm:w-1/3">
                        <label className="mb-3 block font-medium text-dark">
                          Export Rate
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2">
                            <FaDollarSign className="text-gray-500" />
                          </span>
                          <input
                            name="export_rate"
                            type="number"
                            step="0.01"
                            className="w-full rounded-lg border border-stroke py-3 pl-12 pr-4 text-dark focus:border-primary"
                            value={formData.export_rate}
                            onChange={handleChange}
                            placeholder="Set Export Rate"
                          />
                        </div>
                      </div>

                      <div className="w-full sm:w-1/3">
                        <label className="mb-3 block font-medium text-dark">
                          Interest Rate
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2">
                            <FaDollarSign className="text-gray-500" />
                          </span>
                          <input
                            name="interest_rate"
                            type="number"
                            step="0.01"
                            className="w-full rounded-lg border border-stroke py-3 pl-12 pr-4 text-dark focus:border-primary"
                            value={formData.interest_rate}
                            onChange={handleChange}
                            placeholder="Set Interest Rate"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-4">
                      <button
                        type="button"
                        onClick={toggleEditForm}
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
