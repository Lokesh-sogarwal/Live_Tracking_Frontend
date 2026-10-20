import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { FiSearch, FiExternalLink } from "react-icons/fi";
import "./Documents.css";
import API_BASE_URL from "../../../utils/config";
import useResource from "../../../hooks/useResource";
import { usePermissions } from "../../../context/PermissionsContext";
import { PageHeader, Panel, ConfirmDialog, Pagination, usePagination, StatusChip } from "../../../Components/ui";

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "verified", label: "Verified" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];
const CHIP = { pending: "not_started", verified: "completed", rejected: "error" };
const TYPE_LABEL = { license: "License", aadhaar: "Aadhaar" };
const statusOf = (d) => (d.is_verified ? "verified" : d.is_rejected ? "rejected" : "pending");

const DocumentsList = () => {
  const { can } = usePermissions();
  const list = useResource("/data/get_documents");
  // Names only when this role may read the driver directory; otherwise the ID is shown.
  const drivers = useResource("/view/driver_details", can("drivers"));
  const [documents, setDocuments] = useState([]);
  const [tab, setTab] = useState("pending");
  const [query, setQuery] = useState("");
  const [confirm, setConfirm] = useState(null); // { doc, action: "verify" | "reject" }
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (list.status === "ok") setDocuments(list.data?.documents || []);
  }, [list.status, list.data]);

  const names = useMemo(() => {
    const map = {};
    (Array.isArray(drivers.data) ? drivers.data : []).forEach((d) => {
      map[d.user_uuid] = d.fullname;
    });
    return map;
  }, [drivers.data]);

  const counts = useMemo(() => {
    const c = { pending: 0, verified: 0, rejected: 0, all: documents.length };
    documents.forEach((d) => c[statusOf(d)]++);
    return c;
  }, [documents]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.filter(
      (d) =>
        (tab === "all" || statusOf(d) === tab) &&
        (!q || [d.document_name, String(d.driver_id), names[d.driver_id]].some((v) => (v || "").toLowerCase().includes(q)))
    );
  }, [documents, tab, query, names]);
  const pager = usePagination(visible, 10, `${tab}|${query}`);

  const review = async () => {
    const { doc, action } = confirm;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/data/${action}_document/${doc.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || `Could not ${action} the document`);
        return;
      }
      toast.success(data.message || (action === "verify" ? "Document verified" : "Document rejected"));
      setDocuments((docs) =>
        docs.map((d) => (d.id === doc.id ? { ...d, is_verified: action === "verify", is_rejected: action === "reject" } : d))
      );
      setConfirm(null);
    } catch {
      toast.error("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const driverLabel = (d) => names[d.driver_id] || `Driver ${d.driver_id}`;
  const isExpired = (d) => d.expiry_date && d.expiry_date < new Date().toISOString().slice(0, 10);

  return (
    <div className="ui-page">
      <PageHeader title="Document review" description="Verify or reject documents that drivers have uploaded." />

      <div className="ui-tabs" role="tablist" aria-label="Document status">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" className="ui-tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label} <span className="ui-tab-count">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      <Panel
        title={TABS.find((t) => t.key === tab).label + " documents"}
        subtitle={list.status === "ok" ? `${visible.length} shown` : undefined}
        status={list.status === "idle" ? "loading" : list.status}
        onRetry={list.reload}
        isEmpty={visible.length === 0}
        empty={query ? "No documents match this search." : tab === "pending" ? "Nothing is waiting for review." : "No documents here yet."}
        action={
          <label className="ui-search">
            <FiSearch aria-hidden="true" />
            <input type="search" className="ui-input" placeholder="Search driver or type" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search documents" />
          </label>
        }
        flush
        footer={<Pagination {...pager} label="documents" />}
      >
        <div className="ui-table-wrap">
          <table className="ui-table ui-table-stack">
            <thead>
              <tr>
                <th scope="col">Document</th>
                <th scope="col">Driver</th>
                <th scope="col">Uploaded</th>
                <th scope="col">Expiry</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {pager.pageItems.map((d) => {
                const st = statusOf(d);
                return (
                  <tr key={d.id}>
                    <td data-label="Document">
                      <span className="ui-cell-main">{TYPE_LABEL[d.document_name] || d.document_name}</span>
                      <span className="ui-cell-sub">#{d.id}</span>
                    </td>
                    <td data-label="Driver">{driverLabel(d)}</td>
                    <td data-label="Uploaded">{d.uploaded_at || "—"}</td>
                    <td data-label="Expiry">
                      {d.expiry_date || "—"}
                      {isExpired(d) && <span className="ui-badge ui-badge-rose doc-expired">Expired</span>}
                    </td>
                    <td data-label="Status">
                      <StatusChip status={CHIP[st]}>{st[0].toUpperCase() + st.slice(1)}</StatusChip>
                    </td>
                    <td className="ui-cell-actions">
                      {d.file_missing ? (
                        <span className="ui-hint">File missing</span>
                      ) : (
                        <a className="ui-btn ui-btn-ghost ui-btn-sm" href={`${API_BASE_URL}/data/uploads/${d.document_path}`} target="_blank" rel="noopener noreferrer">
                          <FiExternalLink aria-hidden="true" /> View
                        </a>
                      )}
                      {st !== "verified" && (
                        <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => setConfirm({ doc: d, action: "verify" })}>
                          Verify
                        </button>
                      )}
                      {st !== "rejected" && (
                        <button type="button" className="ui-btn ui-btn-danger-ghost ui-btn-sm" onClick={() => setConfirm({ doc: d, action: "reject" })}>
                          Reject
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.action === "reject" ? "Reject document?" : "Verify document?"}
        message={
          confirm &&
          `${TYPE_LABEL[confirm.doc.document_name] || confirm.doc.document_name} from ${driverLabel(confirm.doc)} will be marked as ${
            confirm.action === "reject" ? "rejected" : "verified"
          }.`
        }
        confirmLabel={confirm?.action === "reject" ? "Reject" : "Verify"}
        tone={confirm?.action === "reject" ? "danger" : "primary"}
        busy={busy}
        onConfirm={review}
        onCancel={() => !busy && setConfirm(null)}
      />
    </div>
  );
};

export default DocumentsList;
