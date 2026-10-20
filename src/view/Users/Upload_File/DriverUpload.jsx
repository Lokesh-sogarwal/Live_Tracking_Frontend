import React, { useMemo, useRef, useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { FiUploadCloud, FiCheckCircle, FiAlertCircle, FiFile } from "react-icons/fi";
import API_BASE_URL from "../../../utils/config";
import { PageHeader, Field } from "../../../Components/ui";
import "./Documents.css";

// Mirrors the server's checks (content-sniffed there): PDF, PNG, JPG/JPEG, DOCX, max 5 MB.
const ALLOWED = ["pdf", "png", "jpg", "jpeg", "docx"];
const MAX_BYTES = 5 * 1024 * 1024;
const formatSize = (b) => (b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

const DriverUpload = () => {
  const userId = useMemo(() => {
    try {
      return jwtDecode(localStorage.getItem("token") || "").user_id;
    } catch {
      return null;
    }
  }, []);
  const fileRef = useRef(null);
  const [documentType, setDocumentType] = useState("license");
  const [file, setFile] = useState(null);
  const [expiryDate, setExpiryDate] = useState("");
  const [fileError, setFileError] = useState("");
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null); // { ok, message }

  const pickFile = (f) => {
    setResult(null);
    if (!f) {
      setFile(null);
      return;
    }
    const ext = (f.name.split(".").pop() || "").toLowerCase();
    if (!ALLOWED.includes(ext)) setFileError("Choose a PDF, PNG, JPG or DOCX file.");
    else if (f.size > MAX_BYTES) setFileError(`This file is ${formatSize(f.size)}; the limit is 5 MB.`);
    else setFileError("");
    setFile(f);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setResult(null);
    if (!userId) {
      setResult({ ok: false, message: "Your session could not be read. Sign in again." });
      return;
    }
    if (!file) {
      setFileError("Choose a file to upload.");
      return;
    }
    if (fileError) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("document_type", documentType);
    if (expiryDate) formData.append("expiry_date", expiryDate);

    setProgress(0);
    try {
      const res = await axios.post(`${API_BASE_URL}/view/upload/${userId}`, formData, {
        headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${localStorage.getItem("token")}` },
        onUploadProgress: (ev) => ev.total && setProgress(Math.round((ev.loaded / ev.total) * 100)),
      });
      setResult({ ok: true, message: res.data?.message || "File uploaded successfully" });
      setFile(null);
      setExpiryDate("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setResult({ ok: false, message: err.response?.data?.error || "Upload failed. Check your connection and try again." });
    } finally {
      setProgress(null);
    }
  };

  const uploading = progress !== null;

  return (
    <div className="ui-page ui-page-narrow">
      <PageHeader title="Upload document" description="Submit a driver document for review. An operator or administrator verifies it." />

      <form className="ui-card ui-card-body ui-form" onSubmit={handleUpload} noValidate>
        <div className="ui-form-grid">
          <Field label="Document type">
            <select className="ui-select" value={documentType} onChange={(e) => setDocumentType(e.target.value)} disabled={uploading}>
              <option value="license">License</option>
              <option value="aadhaar">Aadhaar</option>
            </select>
          </Field>
          <Field label="Expiry date" optional>
            <input className="ui-input" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} disabled={uploading} />
          </Field>
        </div>

        <Field label="File" error={fileError} hint="PDF, PNG, JPG or DOCX, up to 5 MB">
          <input
            ref={fileRef}
            className="sr-only"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.docx"
            onChange={(e) => pickFile(e.target.files[0])}
            disabled={uploading}
          />
        </Field>
        <button type="button" className="doc-drop" onClick={() => fileRef.current?.click()} disabled={uploading} aria-describedby="doc-drop-hint">
          {file ? (
            <>
              <FiFile aria-hidden="true" />
              <span>
                <strong>{file.name}</strong>
                <span id="doc-drop-hint">{formatSize(file.size)} · click to choose a different file</span>
              </span>
            </>
          ) : (
            <>
              <FiUploadCloud aria-hidden="true" />
              <span>
                <strong>Choose a file</strong>
                <span id="doc-drop-hint">PDF, PNG, JPG or DOCX, up to 5 MB</span>
              </span>
            </>
          )}
        </button>

        {uploading && (
          <div className="doc-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Upload progress">
            <span style={{ width: `${progress}%` }} />
          </div>
        )}

        {result && (
          <div className={`ui-banner ${result.ok ? "ui-banner-success" : "ui-banner-error"}`} role={result.ok ? "status" : "alert"}>
            {result.ok ? <FiCheckCircle aria-hidden="true" /> : <FiAlertCircle aria-hidden="true" />}
            <span>{result.message}</span>
          </div>
        )}

        <div className="ui-form-actions">
          <button type="submit" className="ui-btn ui-btn-primary" disabled={uploading || Boolean(fileError)}>
            {uploading && <span className="ui-spinner" aria-hidden="true" />} {uploading ? `Uploading ${progress}%` : "Upload document"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DriverUpload;
