import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { FiBell, FiMessageSquare, FiAlertTriangle, FiCheckCircle, FiInfo, FiCheck, FiKey } from "react-icons/fi";
import "./notification.css";
import API_BASE_URL from "../../../utils/config";
import useResource from "../../../hooks/useResource";
import { PageHeader, Panel, Pagination, usePagination } from "../../../Components/ui";

const ICONS = { feedback_reply: FiMessageSquare, application: FiInfo, chat: FiMessageSquare, message: FiMessageSquare, alert: FiAlertTriangle, warning: FiAlertTriangle, success: FiCheckCircle, info: FiInfo, password_reset: FiKey };
const TITLES = { feedback_reply: "Reply to your feedback", application: "Application to review", chat: "New message", message: "New message", alert: "Alert", warning: "Warning", success: "Success", info: "Update", password_reset: "Password reset request" };
const isChat = (n) => n.type === "chat" || n.type === "message";
// Password reset requests are handled from the Users page (open requests are listed there).
const isResetRequest = (n) => n.type === "password_reset";

const Notification = () => {
  const navigate = useNavigate();
  const res = useResource("/view/notifications");
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (res.status === "ok") setNotifications(Array.isArray(res.data) ? res.data : res.data?.notifications || []);
  }, [res.status, res.data]);

  const unread = notifications.filter((n) => !n.is_read).length;
  const visible = useMemo(() => (filter === "unread" ? notifications.filter((n) => !n.is_read) : notifications), [notifications, filter]);
  const pager = usePagination(visible, 15, filter);

  const markRead = async (n) => {
    const r = await fetch(`${API_BASE_URL}/view/notifications/mark_read/${n.id}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    }).catch(() => null);
    if (r?.ok) setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    return Boolean(r?.ok);
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      const r = await fetch(`${API_BASE_URL}/view/notifications/mark_read_all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      // Only report success once the server has stored it.
      if (!r.ok) throw new Error();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Could not mark notifications as read");
    } finally {
      setMarkingAll(false);
    }
  };

  const open = async (n) => {
    if (!n.is_read) await markRead(n);
    // Chat notifications carry sender_id so the chat opens on that conversation.
    if (n.link) navigate(n.link);
    else if (isChat(n)) navigate("/chat", n.sender_id ? { state: { selectedUserId: n.sender_id } } : undefined);
    else if (isResetRequest(n)) navigate("/users");
  };

  return (
    <div className="ui-page ui-page-narrow">
      <PageHeader
        title="Notifications"
        description={res.status === "ok" ? (unread ? `${unread} unread` : "You're all caught up") : undefined}
        actions={
          unread > 0 && (
            <button type="button" className="ui-btn ui-btn-secondary" onClick={markAllRead} disabled={markingAll}>
              <FiCheck aria-hidden="true" /> Mark all as read
            </button>
          )
        }
      />

      <div className="ui-tabs" role="tablist" aria-label="Filter notifications">
        <button type="button" role="tab" className="ui-tab" aria-selected={filter === "all"} onClick={() => setFilter("all")}>
          All <span className="ui-tab-count">{notifications.length}</span>
        </button>
        <button type="button" role="tab" className="ui-tab" aria-selected={filter === "unread"} onClick={() => setFilter("unread")}>
          Unread <span className="ui-tab-count">{unread}</span>
        </button>
      </div>

      <Panel
        title={filter === "unread" ? "Unread" : "All notifications"}
        status={res.status === "idle" ? "loading" : res.status}
        onRetry={res.reload}
        isEmpty={visible.length === 0}
        empty={filter === "unread" ? "No unread notifications." : "No notifications yet."}
        flush
        footer={<Pagination {...pager} label="notifications" />}
      >
        <ul className="notif-list">
          {pager.pageItems.map((n) => {
            const Icon = ICONS[n.type] || FiBell;
            const actionable = Boolean(n.link) || isChat(n) || isResetRequest(n) || !n.is_read;
            const body = (
              <>
                <span className={`notif-icon notif-icon-${n.type || "info"}`} aria-hidden="true">
                  <Icon />
                </span>
                <span className="notif-body">
                  <span className="notif-title">
                    {TITLES[n.type] || "Notification"}
                    {!n.is_read && <span className="sr-only"> (unread)</span>}
                  </span>
                  <span className="notif-message">{n.message}</span>
                  {n.timestamp && <span className="notif-time">{n.timestamp}</span>}
                </span>
                {!n.is_read && <span className="notif-dot" aria-hidden="true" />}
              </>
            );
            return (
              <li key={n.id} className={`notif-item${n.is_read ? "" : " is-unread"}`}>
                {actionable ? (
                  <button type="button" className="notif-row" onClick={() => open(n)} title={n.link ? "Open" : isChat(n) ? "Open chat" : isResetRequest(n) ? "Open Users" : "Mark as read"}>
                    {body}
                  </button>
                ) : (
                  <div className="notif-row">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
};

export default Notification;
