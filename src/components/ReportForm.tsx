import React, { useState } from "react";
import { uploadImage, saveReport } from "../utils/firebaseHelpers";

const initialState = {
  reporter: "",
  threatType: "",
  location: "",
  message: "",
  image: null as File | null
};

const ReportForm: React.FC = () => {
  const [form, setForm] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setForm({ ...form, image: e.target.files[0] });
      setImagePreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const removeImage = () => {
    setForm({ ...form, image: null });
    setImagePreview(null);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({ ...f, location: `${pos.coords.latitude},${pos.coords.longitude}` }));
        setError(null);
      },
      () => setError("Could not get location")
    );
  };

  const validate = () => {
    if (!form.threatType.trim()) return "Threat type is required.";
    if (!form.location.trim()) return "Location is required.";
    if (!form.message.trim()) return "Description is required.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submission started");
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    try {
      console.log("Form data:", form);
      let imageUrl = "";
      if (form.image) {
        console.log("Uploading image...");
        imageUrl = await uploadImage(form.image);
        console.log("Image uploaded:", imageUrl);
      }
      console.log("Saving report...");
      await saveReport({
        reporter: form.reporter || "Anonymous",
        threatType: form.threatType,
        location: form.location,
        message: form.message,
        imageUrl
      });
      console.log("Report saved successfully");
      setSuccess(true);
      setForm(initialState);
      setImagePreview(null);
      setShowForm(false);
    } catch (err: any) {
      console.error("Error submitting report:", err);
      setError("Failed to submit report. " + (err.message || ""));
    } finally {
      setSubmitting(false);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <button
        className="bg-gradient-to-r from-blue-600 to-blue-400 text-white px-8 py-3 rounded-full shadow-lg text-lg font-bold hover:from-blue-700 hover:to-blue-500 mb-8 transition-all duration-200"
        onClick={() => setShowForm(true)}
      >
        Report
      </button>
      {showForm && (
        <form
          className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 space-y-6 border border-blue-100 relative animate-fadeIn"
          onSubmit={handleSubmit}
          aria-label="Submit a Coastal Threat Report"
        >
          <h2 className="text-2xl font-extrabold text-gray-800 mb-2 text-center">Submit a Coastal Threat Report</h2>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700" htmlFor="reporter">Your Name (optional)</label>
            <input
              className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800"
              name="reporter"
              id="reporter"
              placeholder="Enter your name"
              value={form.reporter}
              onChange={handleChange}
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700" htmlFor="threatType">Threat Type <span className="text-red-500">*</span></label>
            <input
              className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800"
              name="threatType"
              id="threatType"
              placeholder="e.g. Pollution, Mangrove Cutting, etc."
              value={form.threatType}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700" htmlFor="location">Location <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <input
                className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800"
                name="location"
                id="location"
                placeholder="lat,lng or city/district"
                value={form.location}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="bg-gray-200 px-2 py-1 rounded text-sm whitespace-nowrap hover:bg-blue-100 border border-gray-300 text-gray-800"
                onClick={handleUseCurrentLocation}
                aria-label="Use Current Location"
              >
                Use Current Location
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700" htmlFor="message">Description <span className="text-red-500">*</span></label>
            <textarea
              className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800"
              name="message"
              id="message"
              placeholder="Describe the threat..."
              value={form.message}
              onChange={handleChange}
              required
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700" htmlFor="image">Upload Image (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              id="image"
            />
            {imagePreview && (
              <div className="mt-2 flex flex-col items-center">
                <img src={imagePreview} alt="Preview" className="h-32 w-auto rounded shadow border" />
                <button
                  type="button"
                  className="mt-2 text-xs text-red-500 underline"
                  onClick={removeImage}
                  aria-label="Remove selected image"
                >
                  Remove Image
                </button>
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-center pt-2">
            <button
              type="submit"
              className="bg-gradient-to-r from-blue-600 to-blue-400 text-white px-6 py-2 rounded-full font-bold shadow hover:from-blue-700 hover:to-blue-500 transition-all duration-200 disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
            <button
              type="button"
              className="bg-gray-200 text-gray-800 px-6 py-2 rounded-full font-bold shadow hover:bg-gray-300 transition-all duration-200"
              onClick={() => setShowForm(false)}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
          {success && <div className="text-green-600 text-center font-semibold">Report submitted successfully!</div>}
          {error && <div className="text-red-600 text-center font-semibold">{error}</div>}
        </form>
      )}
      <style>{`
        .animate-fadeIn {
          animation: fadeIn 0.4s;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default ReportForm;
