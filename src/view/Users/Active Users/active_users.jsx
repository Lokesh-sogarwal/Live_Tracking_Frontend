import React, { useMemo, useState } from "react";
import { FiSearch } from "react-icons/fi";
import useResource from "../../../hooks/useResource";
import { PageHeader, Panel, Pagination, usePagination, RoleBadge } from "../../../Components/ui";

// GET /data/get_data returns recently registered users and one entry per user with a live
// session (the server caps both lists: 1000 users, 500 sessions).
const UsersList = () => {
  const res = useResource("/data/get_data?limit=1000&active_limit=500", true);
  const [tab, setTab] = useState("active");
  const [query, setQuery] = useState("");

  const users = useMemo(() => (Array.isArray(res.data?.users) ? res.data.users : []), [res.data]);
  const active = useMemo(() => (Array.isArray(res.data?.active_users) ? res.data.active_users : []), [res.data]);
  const activeIds = useMemo(() => new Set(active.map((a) => a.id)), [active]);

  const q = query.trim().toLowerCase();
  const match = (u) => !q || [u.fullname, u.email].some((v) => (v || "").toLowerCase().includes(q));
  const rows = (tab === "active" ? active : users).filter(match);
  const pager = usePagination(rows, 15, `${tab}|${q}`);

  return (
    <div className="ui-page">
      <PageHeader title="Active users" description="Who is signed in right now, and everyone who has registered recently." />

      <div className="ui-toolbar">
        <div className="ui-tabs" role="tablist" aria-label="User lists">
          <button type="button" role="tab" className="ui-tab" aria-selected={tab === "active"} onClick={() => setTab("active")}>
            Signed in now<span className="ui-tab-count">{res.status === "ok" ? res.data.total_active_users ?? active.length : ""}</span>
          </button>
          <button type="button" role="tab" className="ui-tab" aria-selected={tab === "all"} onClick={() => setTab("all")}>
            All users<span className="ui-tab-count">{res.status === "ok" ? res.data.total_users ?? users.length : ""}</span>
          </button>
        </div>
        <div className="ui-toolbar-spacer" />
        <div className="ui-search">
          <FiSearch aria-hidden="true" />
          <input className="ui-input" type="search" placeholder="Search name or email" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search users" />
        </div>
      </div>

      <Panel
        flush
        status={res.status === "idle" ? "loading" : res.status}
        onRetry={res.reload}
        isEmpty={rows.length === 0}
        empty={q ? "No users match your search." : tab === "active" ? "Nobody is signed in right now." : "No users yet."}
        footer={<Pagination {...pager} label="users" />}
      >
        <div className="ui-table-wrap">
          <table className="ui-table ui-table-stack">
            <thead>
              {tab === "active" ? (
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Role</th>
                  <th scope="col">Signed in at</th>
                </tr>
              ) : (
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Registered</th>
                  <th scope="col">Status</th>
                </tr>
              )}
            </thead>
            <tbody>
              {pager.pageItems.map((u) =>
                tab === "active" ? (
                  <tr key={u.id}>
                    <td data-label="Name">
                      <span className="ui-cell-main">{u.fullname}</span>
                      <span className="ui-cell-sub">{u.email}</span>
                    </td>
                    <td data-label="Role"><RoleBadge role={u.role} /></td>
                    <td data-label="Signed in at">{u.login_time || "—"}</td>
                  </tr>
                ) : (
                  <tr key={u.id}>
                    <td data-label="Name">
                      <span className="ui-cell-main">{u.fullname}</span>
                      <span className="ui-cell-sub">{u.email}</span>
                    </td>
                    <td data-label="Registered">{u.created_date || "—"}</td>
                    <td data-label="Status">
                      {activeIds.has(u.id) ? <span className="ui-chip ui-chip-live">Signed in</span> : <span className="ui-chip ui-chip-stale">Not signed in</span>}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
};

export default UsersList;
