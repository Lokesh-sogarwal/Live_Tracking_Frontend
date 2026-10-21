import { headingBetween, normalizeTrip, parseWhen, progressAlong, trackingStatus } from "./busTracking";
import { tripLocation } from "./trips";

const ROUTE = { route_name: "Pari Chowk - Saket", start_point: "Pari Chowk", end_point: "Saket", start_lat: 28.4646, start_lng: 77.5113, end_lat: 28.5206, end_lng: 77.2013 };
const today = "2026-10-21";
const row = (over = {}) => ({ ...ROUTE, schedule_id: 7, bus_id: 1, bus_number: "DL-1", date: today, arrival_time: "10:00", departure_time: "11:00", status: "on_time", is_reached: false, ...over });
const at = (hhmm) => new Date(`${today}T${hhmm}:00`);
const loc = (over = {}) => ({ schedule_id: 7, latitude: 28.47, longitude: 77.49, timestamp: at("10:10").toISOString(), ...over });

describe("normalizeTrip", () => {
  it("reads both payload shapes with the legacy start/end inversion", () => {
    const fromSchedules = normalizeTrip(ROUTE, row());
    expect(fromSchedules.startAt).toEqual(at("10:00"));
    expect(fromSchedules.endAt).toEqual(at("11:00"));
    const fromSearch = normalizeTrip(ROUTE, { schedule_id: 7, bus_id: 1, date: today, end_time: `${today} 10:00:00`, start_time: `${today} 11:00:00` });
    expect(fromSearch.startAt).toEqual(at("10:00"));
    expect(fromSearch.endAt).toEqual(at("11:00"));
  });

  it("reverse trips run Saket -> Pari Chowk", () => {
    const t = normalizeTrip(ROUTE, row({ direction: "reverse" }));
    expect([t.origin.name, t.destination.name]).toEqual(["Saket", "Pari Chowk"]);
    expect(normalizeTrip(ROUTE, row()).origin.name).toBe("Pari Chowk");
  });

  it("rejects unusable coordinates and times", () => {
    expect(normalizeTrip({ ...ROUTE, start_lat: "x" }, row()).origin.valid).toBe(false);
    expect(normalizeTrip({ ...ROUTE, start_lat: 0, start_lng: 0 }, row()).origin.valid).toBe(false);
    expect(parseWhen(today, "nonsense")).toBeNull();
  });
});

describe("trackingStatus (all states)", () => {
  const trip = normalizeTrip(ROUTE, row());
  it("not started: no position and before the start time", () => expect(trackingStatus(trip, null, at("09:30"))).toBe("not_started"));
  it("unavailable: started but no position for this trip", () => expect(trackingStatus(trip, null, at("10:05"))).toBe("unavailable"));
  it("live", () => expect(trackingStatus(trip, loc(), at("10:11"))).toBe("live"));
  it("stale after 2 minutes without updates", () => expect(trackingStatus(trip, loc(), at("10:15"))).toBe("stale"));
  it("delayed stays delayed while positions arrive", () => {
    const d = normalizeTrip(ROUTE, row({ status: "delayed" }));
    expect(trackingStatus(d, loc(), at("10:11"))).toBe("delayed");
    expect(trackingStatus(d, null, at("10:11"))).toBe("delayed_waiting");
  });
  it("completed from the schedule or from this trip's last position", () => {
    expect(trackingStatus(normalizeTrip(ROUTE, row({ is_reached: true })), null, at("12:00"))).toBe("completed");
    expect(trackingStatus(trip, loc({ trip_completed: true }), at("11:01"))).toBe("completed");
  });
  it("completed late, from the schedule or from this trip's position", () => {
    expect(trackingStatus(normalizeTrip(ROUTE, row({ is_reached: true, status: "delayed_completed" })), null, at("12:00"))).toBe("completed_late");
    expect(trackingStatus(trip, loc({ trip_completed: true, trip_status: "delayed_completed" }), at("11:30"))).toBe("completed_late");
  });
  it("cancelled", () => expect(trackingStatus(normalizeTrip(ROUTE, row({ status: "Cancelled" })), null, at("10:30"))).toBe("cancelled"));
});

describe("the Saket bug on the client", () => {
  it("a position from the bus's previous trip is not used for this trip", () => {
    const previousTripAtSaket = { schedule_id: 3, latitude: 28.5206, longitude: 77.2013, timestamp: at("09:00").toISOString(), trip_completed: true };
    expect(tripLocation({ 1: previousTripAtSaket }, row())).toBeNull();
    expect(tripLocation({ 1: loc() }, row())).toMatchObject({ schedule_id: 7 });
  });
});

describe("progress and heading", () => {
  const line = [[28.4646, 77.5113], [28.49, 77.35], [28.5206, 77.2013]];
  it("splits the route at the bus and measures progress from the origin", () => {
    const p = progressAlong(line, [28.49, 77.35]);
    expect(p.fraction).toBeGreaterThan(0.4);
    expect(p.fraction).toBeLessThan(0.6);
    expect(p.done[0]).toEqual(line[0]);
    expect(p.remaining.at(-1)).toEqual(line[2]);
    expect(progressAlong(line, [28.4646, 77.5113]).fraction).toBe(0);
  });
  it("gives no progress for a position far from the route", () => {
    expect(progressAlong(line, [19.07, 72.87])).toBeNull();
  });
  it("heading only after a real movement, pointing west toward Saket", () => {
    expect(headingBetween([28.49, 77.35], [28.49, 77.35001])).toBeNull();
    const h = headingBetween([28.4646, 77.5113], [28.47, 77.48]);
    expect(h).toBeGreaterThan(270);
    expect(h).toBeLessThan(300);
  });
});
