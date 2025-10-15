import React, { useEffect, useState } from "react";
import "./Documents.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const DocumentsList = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://127.0.0.1:5000/data/get_documents", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setDocuments(data.documents || []);
      } else {
        toast.error(data.message || data.error || "Failed to fetch documents");
      }
    } catch (error) {
      toast.error("Error fetching documents");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://127.0.0.1:5000/data/verify_document/${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setDocuments((docs) =>
          docs.map((doc) =>
            doc.id === id ? { ...doc, is_verified: true, is_rejected: false } : doc
          )
        );
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Failed to verify document");
    }
  };

  const handleReject = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://127.0.0.1:5000/data/reject_document/${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setDocuments((docs) =>
          docs.map((doc) =>
            doc.id === id ? { ...doc, is_rejected: true, is_verified: false } : doc
          )
        );
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Failed to reject document");
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return (
    <div className="doc-page">
      <ToastContainer />
      <h2 className="doc-title">📄 Uploaded Driver Documents</h2>

      {loading ? (
        <p className="loading-text">Loading documents...</p>
      ) : documents.length === 0 ? (
        <p className="no-documents">No documents found.</p>
      ) : (
        <table className="documents-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Document Name</th>
              <th>Driver ID</th>
              <th>Uploaded At</th>
              <th>Status</th>
              <th>View</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => {
              const statusLabel = doc.is_verified
                ? "Verified"
                : doc.is_rejected
                ? "Rejected"
                : "Pending";

              return (
                <tr key={doc.id}>
                  <td>{doc.id}</td>
                  <td>{doc.document_name}</td>
                  <td>{doc.driver_id}</td>
                  <td>{doc.uploaded_at}</td>
                  <td>{statusLabel}</td>
                  <td>
                    <a
                      href={`http://127.0.0.1:5000/data/uploads/${doc.document_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View
                    </a>
                  </td>
                  <td>
                    {doc.is_verified ? (
                      <span className="verified-label">✅ Verified</span>
                    ) : doc.is_rejected ? (
                      <span className="rejected-label">❌ Rejected</span>
                    ) : (
                      <>
                        <button
                          className="verify-btn"
                          onClick={() => handleVerify(doc.id)}
                        >
                          ✅ Verify
                        </button>
                        <button
                          className="reject-btn"
                          onClick={() => handleReject(doc.id)}
                        >
                          ❌ Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default DocumentsList;
