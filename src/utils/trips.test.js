import { STATUS_LABELS, tripLocation, tripStatus } from "./trips";

const date = "2026-10-21";
const at = (hhmm, s = "00") => new Date(`${date}T${hhmm}:${s}`);
const row = (over = {}) => ({ schedule_id: 9, bus_id: 1, date, arrival_time: "10:00", departure_time: "10:30", status: "on_time", is_reached: false, ...over });
const loc = (ts) => ({ schedule_id: 9, timestamp: ts.toISOString() });

describe("tripStatus", () => {
  it("a future trip without a position is Not started", () => expect(tripStatus(row(), null, at("09:59"))).toBe("not_started"));
  it("a started trip with no position yet is Awaiting location (not Not started, not Stale)", () => {
    expect(tripStatus(row(), null, at("10:05"))).toBe("awaiting");
    expect(STATUS_LABELS.awaiting).toBe("Awaiting location");
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
    expect(tripStatus(row(), null, at("11:00"))).toBe("awaiting"); // older payload without "started": no guess
  });
});
