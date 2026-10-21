import { STATUS_LABELS, isInProgress, lifecycleOf, summarizeTrips, tripLocation, tripStatus } from "./trips";

const date = "2026-10-21";
const at = (hhmm, s = "00") => new Date(`${date}T${hhmm}:${s}`);
const row = (over = {}) => ({ schedule_id: 9, bus_id: 1, date, arrival_time: "10:00", departure_time: "10:30", status: "on_time", is_reached: false, ...over });
const loc = (ts) => ({ schedule_id: 9, timestamp: ts.toISOString() });

describe("tripStatus", () => {
  it("a future trip without a position is Upcoming", () => expect(tripStatus(row(), null, at("09:59"))).toBe("upcoming"));
  it("a started trip with no position yet is Awaiting location (not Not started, not Stale)", () => {
    expect(tripStatus(row(), null, at("10:05"))).toBe("awaiting");
    expect(STATUS_LABELS.awaiting).toBe("Awaiting first location");
  });
  it("Live while positions are fresh; Stale once they stop for more than 2 minutes", () => {
    expect(tripStatus(row(), loc(at("10:05")), at("10:06"))).toBe("live");
    expect(tripStatus(row(), loc(at("10:05")), at("10:07", "01"))).toBe("stale");
  });
  it("a completed trip stays Completed however old its last position is", () => {
    expect(tripStatus(row({ is_reached: true }), loc(at("10:05")), at("18:00"))).toBe("completed");
  });
  it("a delayed trip stays Delayed while moving", () => expect(tripStatus(row({ status: "delayed" }), loc(at("10:05")), at("10:05", "30"))).toBe("delayed"));
  it("a newly received location is reflected (status follows the latest timestamp)", () => {
    const stale = tripStatus(row(), loc(at("10:00")), at("10:10"));
    const fresh = tripStatus(row(), loc(at("10:09", "55")), at("10:10"));
    expect([stale, fresh]).toEqual(["stale", "live"]);
  });
  it("a position from another trip of the bus is ignored", () => {
    expect(tripLocation({ 1: { schedule_id: 3, timestamp: at("10:05").toISOString() } }, row())).toBeNull();
  });
  it("a trip that reached its destination late is Completed late, never Stale or Delayed", () => {
    expect(tripStatus(row({ is_reached: true, status: "delayed_completed" }), loc(at("10:40")), at("18:00"))).toBe("delayed_completed");
    expect(STATUS_LABELS.delayed_completed).toBe("Completed late");
    expect(tripStatus(row({ is_reached: true, status: "arrived" }), null, at("18:00"))).toBe("completed");
  });
  it("a trip whose window passed and that never departed is 'Did not depart'", () => {
    expect(tripStatus(row({ started: false }), null, at("11:00"))).toBe("missed");
    expect(tripStatus(row({ started: false }), null, at("10:10"))).toBe("awaiting");
    expect(tripStatus(row(), null, at("11:00"))).toBe("missed"); // no position and nothing says it departed
  });
});

describe("lifecycleOf mirrors the server (services/tripLifecycle.js)", () => {
  // Exact instants as the API sends them: 16:54-16:59 IST = 11:24-11:29 UTC.
  const r = (over = {}) => ({ schedule_id: 1, bus_id: 1, start_at: "2026-10-21T11:24:00Z", end_at: "2026-10-21T11:29:00Z", started: false, is_reached: false, status: "on_time", ...over });
  const t = (iso) => new Date(iso);
  it("upcoming -> not_started (due) -> did_not_depart, by the server's instants, not the browser timezone", () => {
    expect(lifecycleOf(r(), t("2026-10-21T11:23:59Z"))).toBe("upcoming");
    expect(lifecycleOf(r(), t("2026-10-21T11:24:00Z"))).toBe("not_started");
    expect(lifecycleOf(r(), t("2026-10-21T11:29:00Z"))).toBe("did_not_depart");
  });
  it("departed: running, then delayed after its end; never completed by time", () => {
    expect(lifecycleOf(r({ started: true }), t("2026-10-21T11:26:00Z"))).toBe("running");
    expect(lifecycleOf(r({ started: true }), t("2026-10-21T13:00:00Z"))).toBe("delayed");
  });
  it("a position from this trip counts as departed (between schedule refreshes)", () => {
    expect(lifecycleOf(r(), t("2026-10-21T11:26:00Z"), true)).toBe("running");
  });
  it("in progress = due or under way; a missed or future trip is not", () => {
    expect(isInProgress(r(), t("2026-10-21T11:25:00Z"))).toBe(true);
    expect(isInProgress(r(), t("2026-10-21T12:00:00Z"))).toBe(false);
    expect(isInProgress(r(), t("2026-10-21T11:00:00Z"))).toBe(false);
  });
  it("labels: active trip without position = Awaiting first location; never Stale before departing", () => {
    expect(tripStatus(r(), null, t("2026-10-21T11:25:00Z"))).toBe("awaiting");
    expect(tripStatus(r({ started: true }), { schedule_id: 1, timestamp: "2026-10-21T11:24:30Z" }, t("2026-10-21T11:28:00Z"))).toBe("stale");
  });
  it("dashboard counters follow the lifecycle (the missed 07:30 trip is not 'running')", () => {
    const rows = [
      r({ schedule_id: 2, start_at: "2026-10-21T02:00:00Z", end_at: "2026-10-21T02:05:00Z" }), // 07:30-07:35, never departed
      r({ schedule_id: 1, started: true }),
      r({ schedule_id: 3, start_at: "2026-10-21T13:00:00Z", end_at: "2026-10-21T13:30:00Z" }),
    ];
    expect(summarizeTrips(rows, t("2026-10-21T11:25:00Z"))).toMatchObject({ running: 1, missed: 1, upcoming: 1, completed: 0 });
  });
});
