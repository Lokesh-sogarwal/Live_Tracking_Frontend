import React, { useState, useEffect } from "react";
import "./UserDetails.css";
import { ToastContainer, toast } from "react-toastify";
import { confirmAlert } from "react-confirm-alert";
import Modal from "react-modal";
import { jwtDecode } from "jwt-decode";
import { faSpinner, faEllipsisV } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "react-toastify/dist/ReactToastify.css";
import "react-confirm-alert/src/react-confirm-alert.css";
import Dropdown from "react-bootstrap/Dropdown";
import DropdownButton from "react-bootstrap/DropdownButton";
import API_BASE_URL from "../../../utils/config";

// In tests, the DOM may not contain #root. Guard to avoid crashing Jest.
if (typeof document !== "undefined") {
  const rootEl = document.querySelector("#root");
  if (rootEl) {
    Modal.setAppElement(rootEl);
  }
}

const customStyles = {
  content: {
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    transform: "translate(-50%, -50%)",
    padding: "20px",
    borderRadius: "10px",
  },
};

const UserDetails = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [activeUserId, setActiveUserId] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    fathername: "",
    mothername: "",
    dob: "",
    role: "",
  });
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedRole, setSelectedRole] = useState("All");

  const token = localStorage.getItem("token");

  const isTokenExpired = (token) => {
    try {
      const decoded = jwtDecode(token);
      return decoded.exp < Date.now() / 1000;
    } catch {
      return true;
    }
  };

  const logoutUser = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  useEffect(() => {
    if (!token || isTokenExpired(token)) {
      toast.error("Session expired. Please log in again.");
      setTimeout(logoutUser, 3000);
      return;
    }

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/view/user_details`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch users");
        setUsers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setTimeout(() => setLoading(false), 1000);
      }
    };

    fetchUsers();
  }, []);

  const deleteUser = async (user_uuid) => {
    if (!token || isTokenExpired(token)) return logoutUser();
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/view/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ user_uuid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete user");
      toast.success("User deleted");
      setUsers(users.filter((u) => u.user_uuid !== user_uuid));
    } catch (err) {
      toast.error(err.message || "Failed to delete user");
    } finally {
      setDeleting(false);
    }
  };

  const updatedetails = async () => {
    if (!token || isTokenExpired(token)) return logoutUser();
    if (!selectedUser) return;
    setUpdating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/view/edit_user_details`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          user_uuid: selectedUser.user_uuid,
          ...formData,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user");
      toast.success("User updated");
      setUsers(
        users.map((u) =>
          u.user_uuid === selectedUser.user_uuid ? { ...u, ...formData } : u
        )
      );
      setEditModalOpen(false);
    } catch (err) {
      toast.error(err.message || "Failed to update user");
    } finally {
      setUpdating(false);
    }
  };

  const confirmDelete = (user_uuid) => {
    confirmAlert({
      title: "Confirm delete",
      message: "Are you sure you want to delete this user?",
      buttons: [
        { label: "Yes", onClick: () => deleteUser(user_uuid) },
        { label: "No" },
      ],
    });
  };

  const toggleActionMenu = (user_uuid) => {
    setActiveUserId(activeUserId === user_uuid ? null : user_uuid);
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      fullname: user.fullname || "",
      email: user.email || "",
      fathername: user.fathername || "",
      mothername: user.mothername || "",
      dob: user.dob || "",
      role: user.role || "",
    });
    setEditModalOpen(true);
  };

  const openCreateModal = () => {
    setFormData({
      fullname: "",
      email: "",
      fathername: "",
      mothername: "",
      dob: "",
      role: "",
    });
    setCreateModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  function calculateAge(dobString) {
    if (!dobString) return "-";
    let today = new Date();
    let dob = new Date(dobString);
    let age = today.getFullYear() - dob.getFullYear();
    let monthDiff = today.getMonth() - dob.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < dob.getDate())
    )
      age--;
    return age;
  }

  const create_user = async () => {
    const { fullname, email, role } = formData;
    const password = fullname + "123";
    const is_password_change = false;

    if (!fullname || !email || !role) {
      toast.error("Full name, email and role are required");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          fullname,
          email,
          password,
          is_password_change,
          role: role,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error creating user");
      toast.success("User created successfully");
      setUsers((prev) => [...prev, data]);
      setCreateModalOpen(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const filteredUsers =
    selectedRole === "All"
      ? users
      : users.filter((user) => user.role === selectedRole);

  return (
    <div className="d-flex">
     

      <div className="flex-grow-1 p-4">
        {/* <h2>User Details</h2> */}

        {error && <p className="text-danger">{error}</p>}

        {loading ? (
          <div className="d-flex justify-content-center align-items-center h-100">
            <FontAwesomeIcon icon={faSpinner} spin size="2x" color="#007bff" />
            Loading Users...
          </div>
        ) : (
          <>
          <div className="controller-button">


            {/* Role Filter */}
            <DropdownButton
              id="dropdown-basic-button"
              title={`Filter: ${selectedRole}`}
              onSelect={(role) => setSelectedRole(role)}
              className="mb-3"
            >
              <Dropdown.Item eventKey="All">All</Dropdown.Item>
              <Dropdown.Item eventKey="Superadmin">Super-Admin</Dropdown.Item>
              <Dropdown.Item eventKey="Admin">Admin</Dropdown.Item>
              <Dropdown.Item eventKey="Driver">Driver</Dropdown.Item>
              <Dropdown.Item eventKey="Passenger">Passenger</Dropdown.Item>
              <Dropdown.Item eventKey="Operator">Operator</Dropdown.Item>
            </DropdownButton>
            <button
              type="button"
              className="btn btn-primary mb-3"
              onClick={openCreateModal}
            >
              Create User
            </button>
          </div>      
            <table className="table table-striped table-bordered">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>DOB</th>
                  <th>Father's Name</th>
                  <th>Mother's Name</th>
                  <th>Age</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user, index) => (
                    <tr key={user.user_uuid || index}>
                      <td>{index + 1}</td>
                      <td>{user.fullname}</td>
                      <td>{user.email}</td>
                      <td>{user.dob || "-"}</td>
                      <td>{user.fathername || "-"}</td>
                      <td>{user.mothername || "-"}</td>
                      <td>{calculateAge(user.dob)}</td>
                      <td>{user.phone_no || "-"}</td>
                      <td>{user.role || "-"}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-link p-0 text-black"
                          onClick={() => toggleActionMenu(user.user_uuid)}
                        >
                          <FontAwesomeIcon icon={faEllipsisV} />
                        </button>
                        {activeUserId === user.user_uuid && (
                          <div className="action-menu bg-light border rounded p-2 mt-1">
                            <button
                              type="button"
                              className="btn btn-sm btn-warning me-2"
                              onClick={() => openEditModal(user)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => confirmDelete(user.user_uuid)}
                              disabled={deleting}
                            >
                              {deleting ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="10" className="text-center">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onRequestClose={() => setEditModalOpen(false)}
        style={customStyles}
        contentLabel="Edit User"
      >
        <h2>Edit User</h2>
        {selectedUser && (
          <form>
            <label>Full Name:</label>
            <input
              name="fullname"
              value={formData.fullname}
              onChange={handleInputChange}
              className="form-control mb-2"
            />
            <label>Email:</label>
            <input
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="form-control mb-2"
            />
            <label>Father Name:</label>
            <input
              name="fathername"
              value={formData.fathername}
              onChange={handleInputChange}
              className="form-control mb-2"
            />
            <label>Mother Name:</label>
            <input
              name="mothername"
              value={formData.mothername}
              onChange={handleInputChange}
              className="form-control mb-2"
            />
            <label>Date of Birth:</label>
            <input
              name="dob"
              type="date"
              value={formData.dob}
              onChange={handleInputChange}
              className="form-control mb-3"
            />
            <div className="d-flex gap-2">
              <button
                type="button"
                onClick={updatedetails}
                disabled={updating}
                className="btn btn-success"
              >
                {updating ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal
        isOpen={createModalOpen}
        onRequestClose={() => setCreateModalOpen(false)}
        style={customStyles}
        contentLabel="Create User"
      >
        <h2>Create User</h2>
        <form>
          <label>Full Name:</label>
          <input
            name="fullname"
            value={formData.fullname}
            onChange={handleInputChange}
            className="form-control mb-2"
          />
          <label>Email:</label>
          <input
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="form-control mb-2"
          />
          <label>Role:</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleInputChange}
            className="form-control mb-3"
          >
            <option value="">-- Select Role --</option>
            {/* <option value="Superadmin">SuperAdmin</option> */}
            <option value="Admin">Admin</option>
            <option value="Driver">Driver</option>
            <option value="Passenger">Passenger</option>
            <option value="Operator">Operator</option>
          </select>
          <div className="d-flex gap-2">
            <button
              type="button"
              onClick={create_user}
              disabled={creating}
              className="btn btn-primary"
            >
              {creating ? "Creating..." : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="btn btn-secondary"
            >
              Close
            </button>
          </div>
        </form>
      </Modal>

      <ToastContainer />
    </div>
  );
};

export default UserDetails;
