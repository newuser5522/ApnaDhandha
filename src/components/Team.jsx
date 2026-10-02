import { useEffect, useState } from "react";
import {
  Pencil,
  KeyRound,
  Plus,
  Search,
  Shield,
  UserCheck,
  UserRoundX,
  Users,
  X,
} from "lucide-react";
import { apiRequest } from "../auth/api.js";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  role: "Staff",
};

const ROLES = ["Admin", "Manager", "Staff"];

const TeamComponent = () => {
  const [users, setUsers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All roles");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [inviteUrl, setInviteUrl] = useState("");
  const [passwordResetLink, setPasswordResetLink] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadTeam = async () => {
    setLoading(true);
    try {
      const [userResult, invitationResult] = await Promise.all([
        apiRequest("/api/team/users"),
        apiRequest("/api/team/invitations"),
      ]);
      setUsers(userResult.users);
      setInvitations(invitationResult.invitations);
      setLoadError("");
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, []);

  const activeCount = users.filter((user) => user.status === "active").length;
  const adminCount = users.filter((user) => user.role === "Admin").length;
  const inactiveCount = users.length - activeCount;
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredUsers = users.filter((user) => {
    const matchesSearch = [user.name, user.email, user.phone]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
    const matchesRole = roleFilter === "All roles" || user.role === roleFilter;
    const matchesStatus =
      statusFilter === "All statuses" ||
      user.status === statusFilter.toLowerCase();
    return matchesSearch && matchesRole && matchesStatus;
  });

  const resetForm = () => {
    setFormOpen(false);
    setEditingUserId(null);
    setFormData(EMPTY_FORM);
    setFormError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      if (editingUserId) {
        const { user } = await apiRequest(
          `/api/team/users/${encodeURIComponent(editingUserId)}`,
          {
            method: "PATCH",
            body: {
              name: formData.name,
              phone: formData.phone,
              role: formData.role,
            },
          },
        );
        setUsers((currentUsers) =>
          currentUsers.map((currentUser) =>
            currentUser.id === user.id ? user : currentUser,
          ),
        );
        resetForm();
      } else {
        const result = await apiRequest("/api/team/invitations", {
          method: "POST",
          body: { email: formData.email, role: formData.role },
        });
        setInviteUrl(result.inviteUrl);
        setInvitations((currentInvitations) => [
          result.invitation,
          ...currentInvitations.filter(
            (invitation) => invitation.id !== result.invitation.id,
          ),
        ]);
        setFormOpen(false);
        setFormData(EMPTY_FORM);
      }
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (user) => {
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
    });
    setFormError("");
    setFormOpen(true);
  };

  const toggleStatus = async (user) => {
    const status = user.status === "active" ? "inactive" : "active";
    try {
      const { user: updatedUser } = await apiRequest(
        `/api/team/users/${encodeURIComponent(user.id)}`,
        { method: "PATCH", body: { status } },
      );
      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser.id === updatedUser.id ? updatedUser : currentUser,
        ),
      );
    } catch (error) {
      setLoadError(error.message);
    }
  };

  const revokeInvitation = async (invitation) => {
    try {
      await apiRequest(
        `/api/team/invitations/${encodeURIComponent(invitation.id)}`,
        { method: "DELETE" },
      );
      setInvitations((currentInvitations) =>
        currentInvitations.filter((item) => item.id !== invitation.id),
      );
    } catch (error) {
      setLoadError(error.message);
    }
  };

  const issuePasswordReset = async (user) => {
    try {
      const result = await apiRequest(
        `/api/team/users/${encodeURIComponent(user.id)}/password-reset`,
        { method: "POST" },
      );
      setPasswordResetLink({ email: user.email, ...result });
    } catch (error) {
      setLoadError(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <p className="border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        New members set their own password from a one-time invitation. Share
        invitation links privately.
      </p>
      {loadError && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {loadError}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-600">Team members</p>
          <p className="text-2xl font-bold text-slate-900">{users.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-600">Active</p>
          <p className="text-2xl font-bold text-green-700">{activeCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-600">Admins</p>
          <p className="text-2xl font-bold text-blue-700">{adminCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-600">Inactive</p>
          <p className="text-2xl font-bold text-slate-600">{inactiveCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="relative min-w-56 flex-1">
          <Search
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            placeholder="Search name, email, or phone"
            aria-label="Search team members"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3"
          />
        </label>
        <select
          aria-label="Filter by role"
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2"
        >
          <option>All roles</option>
          {ROLES.map((role) => (
            <option key={role}>{role}</option>
          ))}
        </select>
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2"
        >
          <option>All statuses</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
        <button
          type="button"
          onClick={() => {
            setFormData(EMPTY_FORM);
            setEditingUserId(null);
            setFormError("");
            setInviteUrl("");
            setFormOpen((isOpen) => !isOpen);
          }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={18} /> Invite member
        </button>
      </div>

      {formOpen && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 border-y border-slate-200 bg-white py-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {editingUserId ? "Edit team member" : "Invite team member"}
            </h2>
            <button
              type="button"
              aria-label="Close form"
              onClick={resetForm}
              className="rounded p-1 text-slate-500 hover:bg-slate-100"
            >
              <X size={18} />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {editingUserId && (
              <label className="space-y-1 text-sm">
                <span>Full name</span>
                <input
                  type="text"
                  autoComplete="name"
                  required
                  value={formData.name}
                  onChange={(event) =>
                    setFormData({ ...formData, name: event.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
            )}
            <label className="space-y-1 text-sm">
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                readOnly={Boolean(editingUserId)}
                value={formData.email}
                onChange={(event) =>
                  setFormData({ ...formData, email: event.target.value })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            {editingUserId && (
              <label className="space-y-1 text-sm">
                <span>Phone (optional)</span>
                <input
                  type="tel"
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={(event) =>
                    setFormData({ ...formData, phone: event.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
            )}
            <label className="space-y-1 text-sm">
              <span>Role</span>
              <select
                required
                value={formData.role}
                onChange={(event) =>
                  setFormData({ ...formData, role: event.target.value })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                {ROLES.map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
            </label>
          </div>
          {formError && (
            <p role="alert" className="text-sm text-red-700">
              {formError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
            >
              {submitting
                ? "Saving…"
                : editingUserId
                  ? "Save changes"
                  : "Create invitation"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg bg-slate-200 px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {inviteUrl && (
        <div className="space-y-2 border-y border-green-200 bg-green-50 py-4">
          <p className="text-sm font-semibold text-green-900">
            Invitation created. Copy and send this link to the team member.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              aria-label="Invitation link"
              readOnly
              value={inviteUrl}
              className="min-w-64 flex-1 rounded-lg border border-green-300 bg-white px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(inviteUrl)}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white"
            >
              Copy link
            </button>
          </div>
        </div>
      )}
      {passwordResetLink && (
        <div className="space-y-2 border-y border-amber-200 bg-amber-50 py-4">
          <p className="text-sm font-semibold text-amber-950">
            Password reset link for {passwordResetLink.email}. It expires in one
            hour.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              aria-label="Password reset link"
              readOnly
              value={passwordResetLink.resetUrl}
              className="min-w-64 flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() =>
                navigator.clipboard?.writeText(passwordResetLink.resetUrl)
              }
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white"
            >
              Copy link
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Team member</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan="5"
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    Loading team accounts…
                  </td>
                </tr>
              )}
              {!loading &&
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{user.name}</p>
                      <p className="text-slate-500">{user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {user.phone || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-slate-700">
                        <Shield size={15} /> {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.status === "active" ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"}`}
                      >
                        {user.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          aria-label={`Edit ${user.name}`}
                          onClick={() => startEditing(user)}
                          className="rounded p-2 text-slate-600 hover:bg-slate-100"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          aria-label={`${user.status === "active" ? "Deactivate" : "Activate"} ${user.name}`}
                          onClick={() => toggleStatus(user)}
                          className="rounded p-2 text-slate-600 hover:bg-slate-100"
                        >
                          {user.status === "active" ? (
                            <UserRoundX size={16} />
                          ) : (
                            <UserCheck size={16} />
                          )}
                        </button>
                        <button
                          type="button"
                          aria-label={`Create password reset link for ${user.name}`}
                          onClick={() => issuePasswordReset(user)}
                          className="rounded p-2 text-slate-600 hover:bg-slate-100"
                        >
                          <KeyRound size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              {!loading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-12 text-center">
                    <Users size={28} className="mx-auto mb-2 text-slate-400" />
                    <p className="font-medium text-slate-700">
                      {users.length === 0
                        ? "No accounts yet"
                        : "No team members match these filters"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Create an invitation or adjust your search.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Pending invitations ({invitations.length})
        </h2>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Expires</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((invitation) => (
                  <tr key={invitation.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{invitation.email}</td>
                    <td className="px-4 py-3">{invitation.role}</td>
                    <td className="px-4 py-3">
                      {new Date(invitation.expires_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => revokeInvitation(invitation)}
                        className="rounded p-2 text-red-600 hover:bg-red-50"
                        aria-label={`Revoke invitation for ${invitation.email}`}
                      >
                        <X size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && invitations.length === 0 && (
                  <tr>
                    <td
                      colSpan="4"
                      className="px-4 py-6 text-center text-slate-500"
                    >
                      No pending invitations.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TeamComponent;
