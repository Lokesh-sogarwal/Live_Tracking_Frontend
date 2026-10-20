import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";
import { FiEdit2 } from "react-icons/fi";
import "./profile.css";
import profileimg from "../../../Assets/male-avatar-boy-face-man-user-9-svgrepo-com.svg";
import useResource from "../../../hooks/useResource";
import { usePermissions } from "../../../context/PermissionsContext";
import { PageHeader, Panel, RoleBadge } from "../../../Components/ui";

const isTokenExpired = (token) => {
  try {
    return jwtDecode(token).exp < Date.now() / 1000;
  } catch {
    return true;
  }
};

const calculateAge = (dobString) => {
  if (!dobString) return null;
  const today = new Date();
  const dob = new Date(dobString);
  if (Number.isNaN(dob.getTime())) return null;
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
};

const Profile = () => {
  const { can } = usePermissions();
  const token = localStorage.getItem("token");
  const expired = !token || isTokenExpired(token);
  const res = useResource("/view/profile", !expired);

  // Session handling unchanged from the previous version.
  useEffect(() => {
    if (!expired) return undefined;
    toast.error("Session expired. Please log in again.");
    const t = setTimeout(() => {
      localStorage.removeItem("token");
      window.location.href = "/";
    }, 3000);
    return () => clearTimeout(t);
  }, [expired]);

  const user = res.data || {};
  const age = calculateAge(user.dob);
  const rows = [
    ["Email", user.email],
    ["Phone", user.phone_no],
    ["Date of birth", user.dob],
    ["Age", age === null ? null : `${age} years`],
    ["Father's name", user.fathername],
    ["Mother's name", user.mothername],
  ];

  return (
    <div className="ui-page ui-page-narrow">
      <PageHeader
        title="Profile"
        description="Your account details."
        actions={
          can("edit_profile") && (
            <Link to="/edit_profile" className="ui-btn ui-btn-primary">
              <FiEdit2 aria-hidden="true" /> Edit profile
            </Link>
          )
        }
      />
      <Panel status={expired ? "loading" : res.status === "idle" ? "loading" : res.status} onRetry={res.reload}>
        <div className="profile-summary">
          <img src={profileimg} alt="" className="profile-avatar" />
          <div>
            <h2 className="profile-name">{user.fullname || "—"}</h2>
            {user.role && <RoleBadge role={user.role} />}
          </div>
        </div>
        <dl className="ui-dl profile-dl">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value || "—"}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </div>
  );
};

export default Profile;
