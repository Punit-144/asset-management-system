"use client";

import { useState, useEffect } from "react";
import { getSystemLogs } from "../actions";
import { Loader2, ClipboardList, ArrowLeft, ArrowRightLeft } from "lucide-react";
import Link from "next/link";
import { createBrowserClient } from '@supabase/ssr';

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Supabase Auth Check
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const init = async () => {
      // 1. Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }

      // 2. Fetch the system logs
      const res = await getSystemLogs();
      if (res.success && res.data) {
        setLogs(res.data);
      }
      setLoading(false);
    };
    init();
  }, [supabase]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-sans text-gray-800">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList className="text-blue-600 w-6 h-6" />
              System Logs
            </h1>
            <p className="text-gray-500 text-sm mt-1">A complete audit trail of all asset movements in the MR Lab.</p>
          </div>
          <Link 
            href="/" 
            className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Form
          </Link>
        </div>

        {/* Data Table Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
              <p>Loading system logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <ClipboardList className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-lg font-medium text-gray-900">No logs found</p>
              <p>Asset history will appear here once items are checked in or out.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Asset ID</th>
                    <th className="px-6 py-4">Asset Name</th>
                    <th className="px-6 py-4">Issued To</th>
                    <th className="px-6 py-4">Issued By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => {
                    const isOut = log.action === "CHECK_OUT";
                    return (
                      <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-gray-500">
                          {new Date(log.createdAt).toLocaleString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric', 
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            isOut ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                          }`}>
                            <ArrowRightLeft className="w-3 h-3" />
                            {isOut ? "CHECKED OUT" : "RETURNED"}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-medium text-gray-900">{log.assetId}</td>
                        <td className="px-6 py-4 font-medium text-gray-700">{log.asset.name}</td>
                        <td className="px-6 py-4 text-blue-600 font-medium">{log.issuedTo}</td>
                        <td className="px-6 py-4 text-gray-600">{log.issuedBy}</td>
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
  );
}