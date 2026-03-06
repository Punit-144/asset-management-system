"use client";

import { useState, useEffect } from "react";
import { getUniqueAssetNames, getAssetDetailsByName, submitAssetLog, getCheckedOutAssets } from "./actions";
import { Loader2, CheckCircle2, AlertCircle, FileText, X } from "lucide-react";
import { createBrowserClient } from '@supabase/ssr';

type AssetData = { id: string; availableQuantity: number; totalQuantity: number };
type Summary = { available: number; total: number };

export default function AssetManagementForm() {
  const [assetNames, setAssetNames] = useState<string[]>([]);
  const [loadingNames, setLoadingNames] = useState(true);
  
  // The user MUST select an action first now
  const [action, setAction] = useState<"CHECK_OUT" | "CHECK_IN" | "">("");

  // Asset Entries state
  const [entries, setEntries] = useState([
    { name: "", id: "", options: [] as AssetData[], summary: null as Summary | null, loading: false },
    { name: "", id: "", options: [] as AssetData[], summary: null as Summary | null, loading: false },
    { name: "", id: "", options: [] as AssetData[], summary: null as Summary | null, loading: false },
  ]);

  const [issuedBy, setIssuedBy] = useState("");
  const [issuedTo, setIssuedTo] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  // Overview Modal State
  const [showOverview, setShowOverview] = useState(false);
  const [overviewData, setOverviewData] = useState<any[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(false);

  // Supabase client initialization
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // AUTHENTICATION CHECK
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
      } else {
        // Pre-fill fields but leave them editable as requested
        setIssuedTo(user.user_metadata.full_name || "");
        setEmailAddress(user.email || "");
      }
    };
    checkUser();
  }, [supabase]);

  // Fetch unique asset names on component mount
  useEffect(() => {
    async function fetchNames() {
      const res = await getUniqueAssetNames();
      if (res.success && res.data) setAssetNames(res.data);
      setLoadingNames(false);
    }
    fetchNames();
  }, []);

  const handleNameChange = async (index: number, newName: string) => {
    const newEntries = [...entries];
    newEntries[index].name = newName;
    newEntries[index].id = ""; 
    newEntries[index].options = [];
    newEntries[index].summary = null;
    newEntries[index].loading = true;
    setEntries(newEntries);

    if (newName) {
      const res = await getAssetDetailsByName(newName);
      if (res.success && res.data) {
        const updatedEntries = [...entries];
        updatedEntries[index].options = res.data.items;
        updatedEntries[index].summary = res.data.summary;
        updatedEntries[index].loading = false;
        setEntries(updatedEntries);
      }
    } else {
      const updatedEntries = [...entries];
      updatedEntries[index].loading = false;
      setEntries(updatedEntries);
    }
  };

  const fetchOverview = async () => {
    setLoadingOverview(true);
    setShowOverview(true);
    const res = await getCheckedOutAssets();
    if (res.success && res.data) {
      setOverviewData(res.data);
    }
    setLoadingOverview(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    const assetIds = entries.map(e => e.id).filter(id => id !== "");

    if (assetIds.length === 0) return setStatus("error"), setMessage("At least one Asset ID must be provided.");
    if (new Set(assetIds).size !== assetIds.length) return setStatus("error"), setMessage("Duplicate Asset IDs found.");
    if (!action) return setStatus("error"), setMessage("Please select an action first.");

    const result = await submitAssetLog({ assetIds, issuedBy, issuedTo, emailAddress, action, notes });

    setStatus(result.success ? "success" : "error");
    setMessage(result.message);

    if (result.success) {
      setEntries([
        { name: "", id: "", options: [], summary: null, loading: false },
        { name: "", id: "", options: [], summary: null, loading: false },
        { name: "", id: "", options: [], summary: null, loading: false },
      ]);
      setIssuedTo(""); setEmailAddress(""); setAction(""); setNotes("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center p-4 sm:p-8 font-sans text-gray-800">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl border border-gray-200 relative">
        
        {/* Live Overview Button */}
        <button 
          onClick={fetchOverview}
          type="button"
          className="absolute top-6 right-6 flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-full transition-colors"
        >
          <FileText className="w-4 h-4" /> Live Overview
        </button>

        <h2 className="text-2xl font-bold text-center text-blue-600 mb-8 mt-2">Asset Management</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* STEP 1: Select Action First */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <label className="block text-sm font-bold text-blue-800 mb-2">1. What do you want to do? *</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as "CHECK_OUT" | "CHECK_IN")}
              required
              className="w-full p-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
            >
              <option value="" disabled>Select Action First</option>
              <option value="CHECK_OUT">Take an item OUT of the Almirah</option>
              <option value="CHECK_IN">Put an item back IN the Almirah</option>
            </select>
          </div>

          {/* STEP 2: Select Assets (Disabled until action is selected) */}
          <div className={!action ? "opacity-50 pointer-events-none transition-opacity" : "transition-opacity space-y-6"}>
            {[0, 1, 2].map((index) => {
              const entry = entries[index];
              const isRequired = index === 0;

              return (
                <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-gray-700 m-0">Asset Entry {index + 1} {isRequired && <span className="text-red-500">*</span>}</h4>
                    {entry.summary && (
                      <span className="text-xs font-bold bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                        {entry.summary.available} of {entry.summary.total} Available
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Asset Name</label>
                      <input
                        type="text"
                        list={`asset-names-${index}`}
                        value={entry.name}
                        onChange={(e) => handleNameChange(index, e.target.value)}
                        placeholder={loadingNames ? "Loading..." : "Search name..."}
                        disabled={loadingNames}
                        required={isRequired}
                        className="w-full p-2 border border-gray-300 rounded-md outline-none"
                      />
                      <datalist id={`asset-names-${index}`}>
                        {assetNames.map(name => <option key={name} value={name} />)}
                      </datalist>
                    </div>

                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Specific Asset ID</label>
                      <select
                        value={entry.id}
                        onChange={(e) => {
                          const newEntries = [...entries];
                          newEntries[index].id = e.target.value;
                          setEntries(newEntries);
                        }}
                        disabled={!entry.name || entry.loading || entry.options.length === 0}
                        required={isRequired && !!entry.name}
                        className="w-full p-2 border border-gray-300 rounded-md outline-none disabled:bg-gray-200 bg-white"
                      >
                        <option value="" disabled>{entry.loading ? "Loading..." : "Select ID"}</option>
                        {entry.options.map(opt => {
                          // SMART LOGIC: Disable IDs based on the action selected
                          const isAvailable = opt.availableQuantity > 0;
                          const isDisabled = action === "CHECK_OUT" ? !isAvailable : isAvailable;
                          const statusText = isAvailable ? "(In Almirah)" : "(Currently Out)";

                          return (
                            <option key={opt.id} value={opt.id} disabled={isDisabled}>
                              {opt.id} {statusText}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* User Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Issued By *</label>
                <select value={issuedBy} onChange={(e) => setIssuedBy(e.target.value)} required className="w-full p-2 border border-gray-300 rounded-md bg-white">
                  <option value="" disabled>Select Issuer</option>
                  <option value="Kalpesh Sompura">Kalpesh Sompura</option>
                  <option value="Dr. Vishakha Pareek">Dr. Vishakha Pareek</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Issued To *</label>
                <input type="text" value={issuedTo} onChange={(e) => setIssuedTo(e.target.value)} required placeholder="Recipient name" className="w-full p-2 border border-gray-300 rounded-md" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">Email Address *</label>
                <input type="email" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} required placeholder="Recipient email" className="w-full p-2 border border-gray-300 rounded-md" />
              </div>
            </div>

            <button type="submit" disabled={status === "loading"} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-md transition-colors flex justify-center items-center gap-2">
              {status === "loading" ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> : "Submit Form"}
            </button>
          </div>

          {status === "success" && <div className="p-4 bg-green-50 text-green-700 rounded-md flex gap-3 whitespace-pre-wrap"><CheckCircle2 className="w-5 h-5" /><p>{message}</p></div>}
          {status === "error" && <div className="p-4 bg-red-50 text-red-700 rounded-md flex gap-3 whitespace-pre-wrap"><AlertCircle className="w-5 h-5" /><p>{message}</p></div>}
        </form>
      </div>

      {/* OVERVIEW MODAL */}
      {showOverview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FileText className="text-blue-600"/> Assets Currently Out</h3>
              <button onClick={() => setShowOverview(false)} className="text-gray-500 hover:text-red-500"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {loadingOverview ? (
                <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
              ) : overviewData.length === 0 ? (
                <div className="text-center py-10 text-gray-500">All assets are currently in the Almirah!</div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-100 text-gray-800 font-semibold">
                      <tr>
                        <th className="px-4 py-3 border-b">ID</th>
                        <th className="px-4 py-3 border-b">Name</th>
                        <th className="px-4 py-3 border-b">Issued To</th>
                        <th className="px-4 py-3 border-b">Issued By</th>
                        <th className="px-4 py-3 border-b">Date Out</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overviewData.map((asset) => {
                        const lastLog = asset.logs[0]; // The most recent log
                        return (
                          <tr key={asset.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900">{asset.id}</td>
                            <td className="px-4 py-3">{asset.name}</td>
                            <td className="px-4 py-3 font-medium text-blue-600">{lastLog?.issuedTo || "Unknown"}</td>
                            <td className="px-4 py-3">{lastLog?.issuedBy || "-"}</td>
                            <td className="px-4 py-3">{lastLog ? new Date(lastLog.createdAt).toLocaleDateString() : "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}