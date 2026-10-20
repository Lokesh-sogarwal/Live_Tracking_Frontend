import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { distance } from "../../../utils/busTracking";

// Bus marker for the tracking map. Created once and moved imperatively, so position updates
// glide (requestAnimationFrame) instead of re-rendering the marker and restarting animations.
// The icon is rebuilt only when the status changes; the heading arrow is rotated in place.

const BUS_PATH =
  "M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z";
const BADGE = { delayed: "!", completed: "✓", stale: "…" };
export const busIconHtml = (status) =>
  `<div class="bt-bus is-${status}">` +
  `<span class="bt-bus-halo"></span>` +
  `<span class="bt-bus-heading" hidden></span>` +
  `<span class="bt-bus-body"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${BUS_PATH}"/></svg></span>` +
  (BADGE[status] ? `<span class="bt-bus-badge">${BADGE[status]}</span>` : "") +
  `</div>`;

const makeIcon = (status) =>
  L.divIcon({ className: "bt-bus-icon", html: busIconHtml(status), iconSize: [52, 52], iconAnchor: [26, 26], popupAnchor: [0, -24] });

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
// Larger steps are not animated (a recovered signal or a correction, not driving).
const MAX_ANIMATED_STEP_M = 3000;
const ANIMATION_MS = 1200;

export default function BusMarker({ position, status, heading, title, popupHtml, onSelect }) {
  const map = useMap();
  const markerRef = useRef(null);
  const frameRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Create once.
  useEffect(() => {
    const marker = L.marker(position, { icon: makeIcon(status), keyboard: true, title, alt: title, riseOnHover: true, zIndexOffset: 1000 });
    marker.on("click", () => onSelectRef.current?.());
    marker.on("keypress", (e) => e.originalEvent?.key === "Enter" && onSelectRef.current?.());
    marker.addTo(map);
    markerRef.current = marker;
    return () => {
      cancelAnimationFrame(frameRef.current);
      marker.remove();
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Status -> icon (only when it changes).
  useEffect(() => {
    markerRef.current?.setIcon(makeIcon(status));
  }, [status]);

  // Accessible name and popup content.
  useEffect(() => {
    const m = markerRef.current;
    if (!m) return;
    m.options.title = title;
    const el = m.getElement();
    if (el) {
      el.setAttribute("title", title);
      el.setAttribute("aria-label", title);
      el.setAttribute("role", "button");
    }
    if (popupHtml) {
      if (m.getPopup()) m.setPopupContent(popupHtml);
      else m.bindPopup(popupHtml, { closeButton: true, autoPan: true });
    }
  }, [title, popupHtml, status]);

  // Heading arrow: shown only when the caller has a reliable heading.
  useEffect(() => {
    const arrow = markerRef.current?.getElement()?.querySelector(".bt-bus-heading");
    if (!arrow) return;
    if (heading === null || heading === undefined) arrow.hidden = true;
    else {
      arrow.hidden = false;
      arrow.style.transform = `rotate(${Math.round(heading)}deg)`;
    }
  }, [heading, status]);

  // Glide to each new valid position.
  useEffect(() => {
    const m = markerRef.current;
    if (!m || !position) return;
    const from = m.getLatLng();
    const to = L.latLng(position[0], position[1]);
    cancelAnimationFrame(frameRef.current);
    const step = distance([from.lat, from.lng], [to.lat, to.lng]);
    if (reducedMotion() || step < 0.5 || step > MAX_ANIMATED_STEP_M) {
      m.setLatLng(to);
      return;
    }
    const t0 = performance.now();
    const run = (t) => {
      const k = Math.min(1, (t - t0) / ANIMATION_MS);
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; // ease-in-out
      m.setLatLng([from.lat + (to.lat - from.lat) * e, from.lng + (to.lng - from.lng) * e]);
      if (k < 1) frameRef.current = requestAnimationFrame(run);
    };
    frameRef.current = requestAnimationFrame(run);
  }, [position]);

  return null;
}
