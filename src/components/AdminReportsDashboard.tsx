import React, { useEffect, useState } from "react";
import { fetchReports } from "../utils/firebaseHelpers";

type Report = {
  id: string;
  reporter: string;
  threatType: string;
  location: string;
  message: string;
  imageUrl?: string;
  status: string;
  timestamp?: any;
};

const AdminReportsDashboard: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    const unsubscribe = fetchReports(setReports);
    return () => unsubscribe();
  }, []);

  return (
    <div className="max-w-5xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4">Reports</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded shadow">
          <thead>
            <tr>
              <th className="p-2 border-b">Reporter</th>
              <th className="p-2 border-b">Threat Type</th>
              <th className="p-2 border-b">Location</th>
              <th className="p-2 border-b">Message</th>
              <th className="p-2 border-b">Image</th>
              <th className="p-2 border-b">Status</th>
              <th className="p-2 border-b">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className="hover:bg-gray-100">
                <td className="p-2 border-b">{r.reporter || "Anonymous"}</td>
                <td className="p-2 border-b">{r.threatType}</td>
                <td className="p-2 border-b">
                  <a
                    href={`https://maps.google.com/?q=${r.location}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    {r.location}
                  </a>
                </td>
                <td className="p-2 border-b">{r.message}</td>
                <td className="p-2 border-b">
                  {r.imageUrl ? (
                    <a href={r.imageUrl} target="_blank" rel="noopener noreferrer">
                      <img
                        src={r.imageUrl}
                        alt="report"
                        className="w-16 h-16 object-cover rounded"
                      />
                    </a>
                  ) : (
                    <span className="text-gray-400">No image</span>
                  )}
                </td>
                <td className="p-2 border-b">{r.status}</td>
                <td className="p-2 border-b">
                  {r.timestamp?.toDate
                    ? r.timestamp.toDate().toLocaleString()
                    : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminReportsDashboard;
