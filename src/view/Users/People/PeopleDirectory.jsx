import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiUpload, FiEye, FiKey, FiCopy, FiAlertTriangle } from "react-icons/fi";
import API_BASE_URL from "../../../utils/config";
import { usePermissions } from "../../../context/PermissionsContext";
import { allowed, roleKey, roleRank } from "../../../utils/access";
import {
  PageHeader, Dialog, ConfirmDialog, Field, Pagination, usePagination, Panel, RoleBadge,
} from "../../../Components/ui";
import "./people.css";

// Shared by the Users and Drivers pages (same API shapes, different list endpoint).
// Every action mirrors the server rule that will be applied to it:
//  - create  -> POST /auth/signup; superadmin may assign any role, admin all but superadmin
//  - edit/delete another user -> admin/superadmin with a strictly higher role (superadmin: any)
//  - upload for another user -> operator+ with the "drivers" permission
const ROLES = ["Superadmin", "Admin", "Operator", "Driver", "Passenger"];
const ASSIGNABLE = {
  superadmin: ROLES,
  admin: ["Admin", "Operator", "Driver", "Passenger"],
};

const EMPTY_FORM = { fullname: "", email: "", role: "" };

const ageFrom = (dob) => {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
};

const authHeaders = (json = true) => ({
  ...(json ? { "Content-Type": "application/json" } : {}),
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

async function request(path, options) {
  const res = await fetch(`${API_BASE_URL}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export default function PeopleDirectory({ mode }) {
  const isDrivers = mode === "drivers";
  const { can, role } = usePermissions();
  const me = useMemo(() => {
    try {
      return jwtDecode(localStorage.getItem("token") || "").user_id;
    } catch {
      return null;
    }
  }, []);
  const myKey = roleKey(role);

  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [sort, setSort] = useState("name-asc");

  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [uploadingFor, setUploadingFor] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [upload, setUpload] = useState({ file: null, document_type: "", expiry_date: "" });
  // Password resets: open "forgot password" requests, the user being reset, and the one-time
  // temporary password returned by the server (kept only while its dialog is open).
  const [resetRequests, setResetRequests] = useState([]);
  const [resetting, setResetting] = useState(null);
  const [tempPassword, setTempPassword] = useState(null); // { user, password }
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const data = await request(isDrivers ? "/view/driver_details" : "/view/user_details", { headers: authHeaders() });
      setUsers(Array.isArray(data) ? data : []);
      setStatus("ok");
    } catch (err) {
      setLoadError(err.message);
      setStatus("error");
    }
  }, [isDrivers]);

  useEffect(() => {
    load();
  }, [load]);

  const isAdmin = ["superadmin", "admin"].includes(myKey);
  const loadResetRequests = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const data = await request("/view/password_reset_requests", { headers: authHeaders() });
      // All open requests on both pages, so the notification's link always finds them.
      setResetRequests(Array.isArray(data) ? data : []);
    } catch {
      setResetRequests([]);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadResetRequests();
  }, [loadResetRequests]);
  const requestedIds = useMemo(() => new Set(resetRequests.map((u) => u.user_uuid)), [resetRequests]);

  // ----- permissions (mirror of the server rules) -----
  const assignable = ASSIGNABLE[myKey] || [];
  const canCreate = assignable.length > 0;
  const canManage = (u) => {
    if (!["superadmin", "admin"].includes(myKey)) return false;
    if (!allowed(roleKey(u.role) === "driver" ? "drivers" : "users", can, role)) return false;
    return myKey === "superadmin" || roleRank(u.role) < roleRank(role);
  };
  const canEdit = (u) => u.user_uuid === me || canManage(u);
  const canDelete = (u) => u.user_uuid !== me && canManage(u);
  const canUpload = (u) => isDrivers && (u.user_uuid === me ? can("upload") : roleRank(role) >= roleRank("operator") && can("drivers"));

  // ----- list -----
  const q = query.trim().toLowerCase();
  const visible = useMemo(() => {
    const list = users.filter(
      (u) =>
        (roleFilter === "All" || u.role === roleFilter) &&
        (!q || [u.fullname, u.email, u.phone_no].some((v) => (v || "").toLowerCase().includes(q)))
    );
    if (sort === "name-asc") list.sort((a, b) => (a.fullname || "").localeCompare(b.fullname || ""));
    if (sort === "name-desc") list.sort((a, b) => (b.fullname || "").localeCompare(a.fullname || ""));
    return list;
  }, [users, roleFilter, q, sort]);
  const pager = usePagination(visible, 10, `${q}|${roleFilter}|${sort}`);
  const roleOptions = isDrivers ? [] : ROLES.filter((r) => r !== "Driver" && users.some((u) => u.role === r));

  // ----- actions -----
  const openCreate = () => {
    setForm({ ...EMPTY_FORM, role: isDrivers ? "Driver" : "" });
    setFormErrors({});
    setCreating(true);
  };
  const openEdit = (u) => {
    setForm({ fullname: u.fullname || "", email: u.email || "", role: u.role || "" });
    setFormErrors({});
    setEditing(u);
  };
  const validate = (needRole) => {
    const errors = {};
    if (!form.fullname.trim()) errors.fullname = "Full name is required";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = "Enter a valid email address";
    if (needRole && !form.role) errors.role = "Choose a role";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    if (!validate(true)) return;
    setBusy(true);
    try {
      // Same request as before: the UI-generated initial password and is_password_change=false.
      const data = await request("/auth/signup", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          fullname: form.fullname.trim(),
          email: form.email.trim(),
          password: `${form.fullname.trim()}123`,
          is_password_change: false,
          role: form.role,
        }),
      });
      toast.success("User created");
      const belongsHere = isDrivers ? data.role === "Driver" : data.role !== "Driver";
      if (belongsHere && data.user_uuid) setUsers((prev) => [...prev, data]);
      setCreating(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!validate(false)) return;
    setBusy(true);
    try {
      // The server stores fullname and email only; the list is updated from its response.
      const data = await request("/view/edit_user_details", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ user_uuid: editing.user_uuid, fullname: form.fullname.trim(), email: form.email.trim() }),
      });
      setUsers((prev) => prev.map((u) => (u.user_uuid === editing.user_uuid ? { ...u, fullname: data.fullname, email: data.email } : u)));
      toast.success("Changes saved");
      setEditing(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await request("/view/delete", { method: "POST", headers: authHeaders(), body: JSON.stringify({ user_uuid: deleting.user_uuid }) });
      setUsers((prev) => prev.filter((u) => u.user_uuid !== deleting.user_uuid));
      toast.success(`${deleting.fullname} was deleted`);
      setDeleting(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmReset = async () => {
    setBusy(true);
    try {
      const data = await request("/view/reset_user_password", { method: "POST", headers: authHeaders(), body: JSON.stringify({ user_uuid: resetting.user_uuid }) });
      setTempPassword({ user: resetting, password: data.temporary_password });
      setCopied(false);
      setResetRequests((prev) => prev.filter((u) => u.user_uuid !== resetting.user_uuid));
      setResetting(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const copyTempPassword = async () => {
    try {
      await navigator.clipboard.writeText(tempPassword.password);
      setCopied(true);
    } catch {
      toast.error("Could not copy. Select the password and copy it manually.");
    }
  };

  const submitUpload = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!upload.file) errors.file = "Choose a file";
    if (!upload.document_type.trim()) errors.document_type = "Document type is required";
    setFormErrors(errors);
    if (Object.keys(errors).length) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", upload.file);
      body.append("document_type", upload.document_type.trim());
      body.append("expiry_date", upload.expiry_date);
      await request(`/view/upload/${uploadingFor.user_uuid}`, { method: "POST", headers: authHeaders(false), body });
      toast.success("Document uploaded");
      setUploadingFor(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const title = isDrivers ? "Drivers" : "Users";
  const noun = isDrivers ? "drivers" : "users";

  return (
    <div className="ui-page">
      <PageHeader
        title={title}
        description={isDrivers ? "Driver accounts, contact details and documents." : "Accounts for administrators, operators and passengers."}
        actions={
          canCreate && (
            <button type="button" className="ui-btn ui-btn-primary" onClick={openCreate}>
              <FiPlus aria-hidden="true" /> {isDrivers ? "Add driver" : "Create user"}
            </button>
          )
        }
      />

      {resetRequests.length > 0 && (
        <div className="ui-banner ui-banner-warning people-reset-banner" role="status">
          <FiAlertTriangle aria-hidden="true" />
          <div>
            <strong>
              {resetRequests.length === 1 ? "1 password reset request" : `${resetRequests.length} password reset requests`}
            </strong>
            <ul>
              {resetRequests.map((u) => (
                <li key={u.user_uuid}>
                  <span>{u.fullname} · {u.email}</span>
                  <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => setResetting(u)}>
                    <FiKey aria-hidden="true" /> Reset password
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <Panel
        flush
        status={status}
        onRetry={load}
        isEmpty={status === "ok" && users.length === 0}
        empty={`No ${noun} yet.`}
        title={status === "ok" ? `${users.length} ${noun}` : title}
        action={
          status === "ok" &&
          users.length > 0 && (
            <div className="ui-toolbar">
              <div className="ui-search">
                <FiSearch aria-hidden="true" />
                <input className="ui-input" type="search" placeholder="Search name, email or phone" value={query} onChange={(e) => setQuery(e.target.value)} aria-label={`Search ${noun}`} />
              </div>
              {roleOptions.length > 1 && (
                <select className="ui-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filter by role">
                  <option value="All">All roles</option>
                  {roleOptions.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              )}
              <select className="ui-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
                <option value="name-asc">Name A–Z</option>
                <option value="name-desc">Name Z–A</option>
                <option value="default">Date added</option>
              </select>
            </div>
          )
        }
        footer={<Pagination {...pager} label={noun} />}
      >
        {status === "error" ? null : visible.length === 0 ? (
          <div className="ui-state">
            No {noun} match your search.
            <button type="button" className="ui-btn ui-btn-secondary" onClick={() => { setQuery(""); setRoleFilter("All"); }}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="ui-table-wrap">
            <table className="ui-table ui-table-stack">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Role</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Date of birth</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {pager.pageItems.map((u) => {
                  const age = ageFrom(u.dob);
                  return (
                    <tr key={u.user_uuid}>
                      <td data-label="Name">
                        <span className="ui-cell-main">
                          {u.fullname}
                          {u.user_uuid === me && <span className="ui-badge ui-badge-rose people-you">You</span>}
                          {requestedIds.has(u.user_uuid) && <span className="ui-badge people-reset-badge">Reset requested</span>}
                        </span>
                        <span className="ui-cell-sub">{u.email}</span>
                      </td>
                      <td data-label="Role"><RoleBadge role={u.role} /></td>
                      <td data-label="Phone">{u.phone_no || "—"}</td>
                      <td data-label="Date of birth">{u.dob ? `${u.dob}${age !== null ? ` (${age})` : ""}` : "—"}</td>
                      <td data-label="" className="ui-cell-actions">
                        <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => setViewing(u)} aria-label={`View ${u.fullname}`}>
                          <FiEye aria-hidden="true" /> View
                        </button>
                        {canEdit(u) && (
                          <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => openEdit(u)} aria-label={`Edit ${u.fullname}`}>
                            <FiEdit2 aria-hidden="true" /> Edit
                          </button>
                        )}
                        {canUpload(u) && (
                          <button
                            type="button"
                            className="ui-btn ui-btn-ghost ui-btn-sm"
                            onClick={() => {
                              setUpload({ file: null, document_type: "", expiry_date: "" });
                              setFormErrors({});
                              setUploadingFor(u);
                            }}
                            aria-label={`Upload a document for ${u.fullname}`}
                          >
                            <FiUpload aria-hidden="true" /> Upload
                          </button>
                        )}
                        {canDelete(u) && (
                          <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => setResetting(u)} aria-label={`Reset password for ${u.fullname}`}>
                            <FiKey aria-hidden="true" /> Reset password
                          </button>
                        )}
                        {canDelete(u) && (
                          <button type="button" className="ui-btn ui-btn-danger-ghost ui-btn-sm" onClick={() => setDeleting(u)} aria-label={`Delete ${u.fullname}`}>
                            <FiTrash2 aria-hidden="true" /> Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {status === "error" && loadError && <p className="sr-only" role="status">{loadError}</p>}

      {/* View */}
      <Dialog open={Boolean(viewing)} onClose={() => setViewing(null)} title={viewing?.fullname || ""} description={viewing?.email}>
        {viewing && (
          <dl className="ui-dl">
            <div><dt>Role</dt><dd><RoleBadge role={viewing.role} /></dd></div>
            <div><dt>Phone</dt><dd>{viewing.phone_no || "—"}</dd></div>
            <div><dt>Date of birth</dt><dd>{viewing.dob || "—"}</dd></div>
            <div><dt>Age</dt><dd>{ageFrom(viewing.dob) ?? "—"}</dd></div>
            <div><dt>Father's name</dt><dd>{viewing.fathername || "—"}</dd></div>
            <div><dt>Mother's name</dt><dd>{viewing.mothername || "—"}</dd></div>
          </dl>
        )}
      </Dialog>

      {/* Create */}
      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        closeDisabled={busy}
        title={isDrivers ? "Add driver" : "Create user"}
        description="The account starts with the password “full name + 123”; ask the user to change it after signing in."
        footer={
          <>
            <button type="button" className="ui-btn ui-btn-secondary" onClick={() => setCreating(false)} disabled={busy}>Cancel</button>
            <button type="submit" form="people-create" className="ui-btn ui-btn-primary" disabled={busy}>
              {busy && <span className="ui-spinner" aria-hidden="true" />} Create
            </button>
          </>
        }
      >
        <form id="people-create" className="ui-form" onSubmit={submitCreate} noValidate>
          <Field label="Full name" error={formErrors.fullname}>
            <input className="ui-input" value={form.fullname} onChange={(e) => setForm({ ...form, fullname: e.target.value })} autoComplete="off" data-autofocus />
          </Field>
          <Field label="Email" error={formErrors.email}>
            <input className="ui-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="off" />
          </Field>
          <Field label="Role" error={formErrors.role} hint="Only roles you are allowed to assign are listed.">
            <select className="ui-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="">Choose a role</option>
              {assignable.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Field>
        </form>
      </Dialog>

      {/* Edit */}
      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        closeDisabled={busy}
        title={`Edit ${editing?.fullname || ""}`}
        description="Name and email can be changed here. The role cannot be changed from this page."
        footer={
          <>
            <button type="button" className="ui-btn ui-btn-secondary" onClick={() => setEditing(null)} disabled={busy}>Cancel</button>
            <button type="submit" form="people-edit" className="ui-btn ui-btn-primary" disabled={busy}>
              {busy && <span className="ui-spinner" aria-hidden="true" />} Save changes
            </button>
          </>
        }
      >
        <form id="people-edit" className="ui-form" onSubmit={submitEdit} noValidate>
          <Field label="Full name" error={formErrors.fullname}>
            <input className="ui-input" value={form.fullname} onChange={(e) => setForm({ ...form, fullname: e.target.value })} data-autofocus />
          </Field>
          <Field label="Email" error={formErrors.email}>
            <input className="ui-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
        </form>
      </Dialog>

      {/* Upload (drivers) */}
      <Dialog
        open={Boolean(uploadingFor)}
        onClose={() => setUploadingFor(null)}
        closeDisabled={busy}
        title="Upload document"
        description={uploadingFor ? `For ${uploadingFor.fullname}. PDF, PNG, JPG or DOCX.` : ""}
        footer={
          <>
            <button type="button" className="ui-btn ui-btn-secondary" onClick={() => setUploadingFor(null)} disabled={busy}>Cancel</button>
            <button type="submit" form="people-upload" className="ui-btn ui-btn-primary" disabled={busy}>
              {busy && <span className="ui-spinner" aria-hidden="true" />} {busy ? "Uploading…" : "Upload"}
            </button>
          </>
        }
      >
        <form id="people-upload" className="ui-form" onSubmit={submitUpload} noValidate>
          <Field label="File" error={formErrors.file}>
            <input className="ui-input ui-input-file" type="file" accept=".pdf,.png,.jpg,.jpeg,.docx" onChange={(e) => setUpload({ ...upload, file: e.target.files[0] || null })} data-autofocus />
          </Field>
          <Field label="Document type" error={formErrors.document_type} hint="For example: license, rc, insurance">
            <input className="ui-input" value={upload.document_type} onChange={(e) => setUpload({ ...upload, document_type: e.target.value })} />
          </Field>
          <Field label="Expiry date" optional>
            <input className="ui-input" type="date" value={upload.expiry_date} onChange={(e) => setUpload({ ...upload, expiry_date: e.target.value })} />
          </Field>
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        tone="danger"
        busy={busy}
        title={`Delete ${deleting?.fullname || ""}?`}
        message="This permanently removes the account together with its sessions, notifications, feedback, documents and assigned schedules. This cannot be undone."
        confirmLabel="Delete account"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />

      <ConfirmDialog
        open={Boolean(resetting)}
        busy={busy}
        title={`Reset password for ${resetting?.fullname || ""}?`}
        message="A temporary password will replace the current one and they will be signed out everywhere. You'll see the temporary password once, to pass on privately; they must choose a new password when they sign in."
        confirmLabel="Reset password"
        onConfirm={confirmReset}
        onCancel={() => !busy && setResetting(null)}
      />

      <Dialog
        open={Boolean(tempPassword)}
        onClose={() => setTempPassword(null)}
        title="Temporary password"
        description={tempPassword && `For ${tempPassword.user.fullname} (${tempPassword.user.email})`}
        size="sm"
        footer={
          <button type="button" className="ui-btn ui-btn-primary" onClick={() => setTempPassword(null)}>
            Done
          </button>
        }
      >
        {tempPassword && (
          <div className="people-temp">
            <div className="people-temp-row">
              <code className="people-temp-value" aria-label="Temporary password">{tempPassword.password}</code>
              <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={copyTempPassword}>
                <FiCopy aria-hidden="true" /> {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="ui-hint">
              This is shown only once. Give it to {tempPassword.user.fullname} privately — not in group chats or email threads. They'll be asked to set their own password when they sign in.
            </p>
          </div>
        )}
      </Dialog>
    </div>
  );
}
