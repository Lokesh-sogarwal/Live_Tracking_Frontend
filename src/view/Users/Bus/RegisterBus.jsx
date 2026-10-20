import React, { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { FiSearch, FiPlus } from "react-icons/fi";
import API_BASE_URL from "../../../utils/config";
import useResource from "../../../hooks/useResource";
import { usePermissions } from "../../../context/PermissionsContext";
import { allowed } from "../../../utils/access";
import { toLocalYYYYMMDD } from "../../../utils/dates";
import { isInProgress } from "../../../utils/trips";
import { PageHeader, Panel, Field, Pagination, usePagination } from "../../../Components/ui";
import "./Bus.css";

const EMPTY = { bus_number: "", bus_capacity: "", bus_type: "AC", operator: "" };

// Register a bus (POST /bus/register_bus) and list the fleet (GET /bus/get_all_buses).
// "On a trip now" comes from today's schedule; there is no edit/delete bus API.
const RegisterBus = () => {
  const { can, role } = usePermissions();
  const buses = useResource("/bus/get_all_buses", true);
  const today = toLocalYYYYMMDD();
  const schedules = useResource(`/bus/schedules?date=${today}`, allowed("readSchedules", can, role));
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  const tripsByBus = useMemo(() => {
    const m = new Map();
    for (const r of Array.isArray(schedules.data) ? schedules.data : []) {
      const e = m.get(r.bus_id) || { today: 0, running: false };
      e.today += 1;
      if (isInProgress(r)) e.running = true;
      m.set(r.bus_id, e);
    }
    return m;
  }, [schedules.data]);

  const list = Array.isArray(buses.data) ? buses.data : [];
  const q = query.trim().toLowerCase();
  const visible = list.filter((b) => !q || [b.bus_number, b.operator, b.bus_type].some((v) => (v || "").toLowerCase().includes(q)));
  const pager = usePagination(visible, 10, q);

  const set = (name) => (e) => setForm({ ...form, [name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.bus_number.trim()) next.bus_number = "Bus number is required";
    const cap = Number(form.bus_capacity);
    if (form.bus_capacity === "" || !Number.isInteger(cap) || cap < 0 || cap > 1000) next.bus_capacity = "Enter a whole number between 0 and 1000";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/bus/register_bus`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          bus_number: form.bus_number.trim(),
          bus_capacity: cap,
          bus_type: form.bus_type,
          ...(form.operator.trim() ? { operator: form.operator.trim() } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) setErrors({ bus_number: data.error || "A bus with this number already exists" });
        toast.error(data.error || "Failed to register bus");
        return;
      }
      toast.success(`${data.bus?.bus_number || "Bus"} registered`);
      setForm(EMPTY);
      buses.reload();
    } catch {
      toast.error("Could not reach the server. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ui-page">
      <PageHeader title="Buses" description="Register vehicles and see which buses are on a trip right now." />

      <div className="bus-layout">
        <section className="ui-card" aria-labelledby="register-bus-title">
          <header className="ui-card-header">
            <h2 id="register-bus-title" className="ui-card-title">Register a bus</h2>
          </header>
          <form className="ui-card-body ui-form" onSubmit={handleSubmit} noValidate>
            <Field label="Bus number" error={errors.bus_number} hint="As on the registration plate, e.g. KA-01-AB-1234">
              <input className="ui-input" value={form.bus_number} onChange={set("bus_number")} maxLength={50} autoComplete="off" />
            </Field>
            <div className="ui-form-grid">
              <Field label="Capacity" error={errors.bus_capacity}>
                <input className="ui-input" type="number" inputMode="numeric" min="0" max="1000" value={form.bus_capacity} onChange={set("bus_capacity")} />
              </Field>
              <Field label="Bus type">
                <select className="ui-select" value={form.bus_type} onChange={set("bus_type")}>
                  <option value="AC">AC</option>
                  <option value="Non-AC">Non-AC</option>
                  <option value="Sleeper">Sleeper</option>
                </select>
              </Field>
            </div>
            <Field label="Operator" optional hint="Company or depot operating the bus. Drivers are assigned per trip in the schedule.">
              <input className="ui-input" value={form.operator} onChange={set("operator")} maxLength={150} />
            </Field>
            <div className="ui-form-actions">
              <button type="submit" className="ui-btn ui-btn-primary" disabled={saving}>
                {saving ? <span className="ui-spinner" aria-hidden="true" /> : <FiPlus aria-hidden="true" />} Register bus
              </button>
            </div>
          </form>
        </section>

        <Panel
          flush
          title={buses.status === "ok" ? `${list.length} buses` : "Buses"}
          status={buses.status === "idle" ? "loading" : buses.status}
          onRetry={buses.reload}
          isEmpty={buses.status === "ok" && list.length === 0}
          empty="No buses registered yet."
          action={
            list.length > 0 && (
              <div className="ui-search">
                <FiSearch aria-hidden="true" />
                <input className="ui-input" type="search" placeholder="Search number, operator, type" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search buses" />
              </div>
            )
          }
          footer={<Pagination {...pager} label="buses" />}
        >
          {visible.length === 0 ? (
            <div className="ui-state">No buses match your search.</div>
          ) : (
            <div className="ui-table-wrap">
              <table className="ui-table ui-table-stack">
                <thead>
                  <tr>
                    <th scope="col">Bus</th>
                    <th scope="col">Type</th>
                    <th scope="col">Capacity</th>
                    <th scope="col">Operator</th>
                    {schedules.status === "ok" && <th scope="col">Today</th>}
                  </tr>
                </thead>
                <tbody>
                  {pager.pageItems.map((b) => {
                    const t = tripsByBus.get(b.bus_id);
                    return (
                      <tr key={b.bus_id}>
                        <td data-label="Bus"><span className="ui-cell-main">{b.bus_number}</span><span className="ui-cell-sub">ID {b.bus_id}</span></td>
                        <td data-label="Type">{b.bus_type || "—"}</td>
                        <td data-label="Capacity">{b.capacity ?? "—"}</td>
                        <td data-label="Operator">{b.operator || "—"}</td>
                        {schedules.status === "ok" && (
                          <td data-label="Today">
                            {t?.running ? (
                              <span className="ui-chip ui-chip-live">On a trip</span>
                            ) : t ? (
                              <span className="ui-chip ui-chip-not_started">{t.today} trip{t.today > 1 ? "s" : ""} today</span>
                            ) : (
                              <span className="ui-chip ui-chip-stale">No trips today</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
};

export default RegisterBus;
