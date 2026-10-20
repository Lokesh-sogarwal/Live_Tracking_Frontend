import React from "react";
import { useNavigate } from "react-router-dom";
import { FiChevronRight } from "react-icons/fi";
import { Settings } from "../../../Components/Static/setting";
import "../Profile/profile.css";
import "./setting.css";
import profileimg from "../../../Assets/male-avatar-boy-face-man-user-9-svgrepo-com.svg";
import useResource from "../../../hooks/useResource";
import { usePermissions } from "../../../context/PermissionsContext";
import { PageHeader, Panel, RoleBadge } from "../../../Components/ui";

// Menu entries are gated by the same permission as the page they open.
const ENTRY_PERMISSION = { "/edit_profile": "edit_profile", "/feedback": "Feedback" };

const Setting = () => {
  const navigate = useNavigate();
  const { can } = usePermissions();
  // The signed-in user's own profile (get_data returned the newest registered user).
  const res = useResource("/view/profile");
  const user = res.data || {};

  const handleClick = (item) => {
    if (item.action) {
      item.action(localStorage.getItem("token"));
      return;
    }
    if (item.link) navigate(item.link);
  };

  const items = Settings.filter((item) => !item.link || !ENTRY_PERMISSION[item.link] || can(ENTRY_PERMISSION[item.link]));

  return (
    <div className="ui-page ui-page-narrow">
      <PageHeader title="Settings" description="Manage your account." />
      <div className="settings-grid">
        <Panel status={res.status === "idle" ? "loading" : res.status} onRetry={res.reload}>
          <div className="profile-summary settings-summary">
            <img src={profileimg} alt="" className="profile-avatar" />
            <div>
              <h2 className="profile-name">{user.fullname || "—"}</h2>
              {user.email && <p className="profile-sub">{user.email}</p>}
              {user.role && <RoleBadge role={user.role} />}
            </div>
          </div>
        </Panel>

        <nav className="ui-card settings-menu" aria-label="Account settings">
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`settings-item${item.action ? " is-danger" : ""}`}
                  onClick={() => handleClick(item)}
                >
                  <span className="settings-icon" aria-hidden="true">{item.icon}</span>
                  <span className="settings-title">{item.title === "Logout" ? "Sign out" : item.title}</span>
                  {!item.action && <FiChevronRight aria-hidden="true" className="settings-chevron" />}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
};
export default Setting;
