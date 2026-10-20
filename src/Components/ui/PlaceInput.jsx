import React, { useEffect, useId, useRef, useState } from "react";

// Place autocomplete (Nominatim, India only) as an accessible combobox: arrow keys move,
// Enter picks, Escape closes. Requests are debounced and stale responses are ignored.
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const highlight = (text, query) => {
  const q = query.trim();
  if (!q) return text;
  const parts = text.split(new RegExp(`(${escapeRegex(q)})`, "ig"));
  return parts.map((part, i) => (part.toLowerCase() === q.toLowerCase() ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>));
};

export default function PlaceInput({ value, onChange, placeholder, inputProps = {}, ...rest }) {
  const listId = useId();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const typed = useRef(false); // only search after the user types, not after a pick
  const seq = useRef(0);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!typed.current || value.trim().length < 3) {
      setItems([]);
      setLoading(false);
      return undefined;
    }
    const mine = ++seq.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&addressdetails=1&limit=5&countrycodes=IN&accept-language=en`
        );
        const data = await res.json();
        if (mine !== seq.current) return;
        const seen = new Set();
        setItems(
          (Array.isArray(data) ? data : [])
            .filter((p) => p.display_name.includes("India") && !seen.has(p.display_name) && seen.add(p.display_name))
            .map((p) => p.display_name)
        );
        setOpen(true);
        setActive(-1);
      } catch {
        if (mine === seq.current) setItems([]);
      } finally {
        if (mine === seq.current) setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    const onDown = (e) => boxRef.current && !boxRef.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const pick = (name) => {
    typed.current = false;
    onChange(name);
    setOpen(false);
    setItems([]);
  };

  const onKeyDown = (e) => {
    if (!open || !items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      pick(items[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showList = open && items.length > 0;
  return (
    <div className="place-input" ref={boxRef}>
      <input
        {...rest}
        {...inputProps}
        className="ui-input"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          typed.current = true;
          onChange(e.target.value);
        }}
        onKeyDown={onKeyDown}
        onFocus={() => items.length && setOpen(true)}
      />
      {loading && <span className="place-input-loading" aria-hidden="true"><span className="ui-spinner" /></span>}
      {showList && (
        <ul id={listId} role="listbox" className="place-input-list">
          {items.map((name, i) => (
            <li
              key={name}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? "active" : ""}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(name);
              }}
            >
              {highlight(name, value)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
