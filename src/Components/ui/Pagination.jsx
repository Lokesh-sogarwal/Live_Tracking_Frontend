import React, { useEffect, useMemo, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

// Client-side paging for lists the API already returns in full (bounded server-side).
export function usePagination(items, pageSize = 10, resetKey = "") {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  useEffect(() => setPage(1), [resetKey]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);
  const pageItems = useMemo(() => items.slice((page - 1) * pageSize, page * pageSize), [items, page, pageSize]);
  return { page, setPage, pageCount, pageItems, total: items.length, pageSize };
}

export default function Pagination({ page, pageCount, total, pageSize, setPage, label = "items" }) {
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <nav className="ui-pagination" aria-label="Pagination">
      <span>
        {from}–{to} of {total} {label}
      </span>
      <div className="ui-pagination-controls">
        <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <FiChevronLeft aria-hidden="true" /> Prev
        </button>
        <span aria-live="polite">
          Page {page} of {pageCount}
        </span>
        <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => setPage(page + 1)} disabled={page >= pageCount} aria-label="Next page">
          Next <FiChevronRight aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
