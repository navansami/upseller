"use client";
import { useEffect, useState } from "react";
import {
  Check,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import type { ManagedUser, User } from "@/lib/types";
import Modal from "./modal";

async function request(method = "GET", body?: unknown) {
  const response = await fetch("/api/users", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Unable to manage users.");
  return data;
}
export default function UserManagement({
  current,
  demo,
  onCurrentChange,
}: {
  current: User;
  demo: boolean;
  onCurrentChange: (user: User) => void;
}) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [editing, setEditing] = useState<ManagedUser | "new" | null>(null);
  const [deleting, setDeleting] = useState<ManagedUser | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (demo) {
      setUsers([
        {
          ...current,
          hasPassword: true,
          deletedAt: null,
          createdAt: new Date().toISOString(),
        },
      ]);
      setLoading(false);
      return;
    }
    let alive = true;
    request()
      .then((data) => {
        if (alive) setUsers(data.users);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [demo, current.id]);
  const visible = users.filter(
    (u) =>
      (status === "all" ||
        (status === "deleted" ? Boolean(u.deletedAt) : !u.deletedAt)) &&
      `${u.firstName} ${u.lastName} ${u.email}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  async function save(
    data: Pick<User, "email" | "firstName" | "lastName" | "role">,
    id?: string,
  ) {
    if (demo) {
      setUsers((old) =>
        id
          ? old.map((u) => (u.id === id ? { ...u, ...data } : u))
          : [
              {
                ...data,
                id: crypto.randomUUID(),
                hasPassword: false,
                deletedAt: null,
                createdAt: new Date().toISOString(),
              },
              ...old,
            ],
      );
    } else {
      await request(id ? "PATCH" : "POST", { ...data, id });
      setUsers((await request()).users);
    }
    if (id === current.id) onCurrentChange({ ...current, ...data });
    setEditing(null);
    setNotice(
      id
        ? "User updated."
        : "User added. They can set a password on their first sign-in.",
    );
    setError("");
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    setError("");
    try {
      if (!demo) await request("DELETE", { id: deleting.id });
      setUsers((old) =>
        old.map((u) =>
          u.id === deleting.id
            ? { ...u, deletedAt: new Date().toISOString() }
            : u,
        ),
      );
      setDeleting(null);
      setNotice("User deleted. Their records have been retained.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow">ADMINISTRATION</div>
          <h1>User management</h1>
          <p>Manage your team’s accounts and access to Upseller.</p>
        </div>
        <button
          className="primary-button"
          onClick={() => {
            setError("");
            setEditing("new");
          }}
        >
          <Plus size={17} />
          Add user
        </button>
      </section>
      <div className="admin-summary">
        <ShieldCheck size={18} />
        <span>
          <strong>Administrator workspace</strong> ·{" "}
          {users.filter((u) => !u.deletedAt).length} active users ·{" "}
          {users.filter((u) => !u.deletedAt && u.role === "admin").length}{" "}
          admins
        </span>
        <button
          className="primary-button admin-mobile-add"
          onClick={() => setEditing("new")}
        >
          <Plus size={15} />
          Add user
        </button>
      </div>
      {error && (
        <div role="alert" className="form-error">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="admin-notice">
          <Check size={15} />
          {notice}
        </div>
      )}
      <section className="panel users-panel">
        <div className="panel-heading sales-heading">
          <div>
            <h2>
              Your team <span className="count-pill">{visible.length}</span>
            </h2>
            <p>Deleted accounts are retained and cannot sign in.</p>
          </div>
          <Users size={20} className="subtle-icon" />
        </div>
        <div className="table-filters">
          <div className="search-input">
            <Search size={16} />
            <input
              aria-label="Search users"
              placeholder="Search name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            aria-label="Filter user status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="active">Active users</option>
            <option value="deleted">Deleted users</option>
            <option value="all">All users</option>
          </select>
        </div>
        {loading ? (
          <div className="empty-state">
            <LoaderCircle className="spin" />
          </div>
        ) : !visible.length ? (
          <div className="empty-state">
            <span>
              <Users size={24} />
            </span>
            <h3>No users found</h3>
            <p>Try a different search or status.</p>
          </div>
        ) : (
          <div className="users-list">
            {visible.map((u) => (
              <article
                className={`user-row ${u.deletedAt ? "user-deleted" : ""}`}
                key={u.id}
              >
                <div className="user-identity">
                  <span className="guest-avatar">
                    {u.firstName[0]}
                    {u.lastName[0]}
                  </span>
                  <div>
                    <strong>
                      {u.firstName} {u.lastName}
                      {u.id === current.id && (
                        <small className="you-label">You</small>
                      )}
                    </strong>
                    <span>{u.email}</span>
                  </div>
                </div>
                <div className="user-access">
                  <span className={`role-badge ${u.role}`}>
                    {u.role === "admin" && <ShieldCheck size={12} />}
                    {u.role === "admin" ? "Admin" : "User"}
                  </span>
                  <span className="user-account-status">
                    {u.deletedAt
                      ? "Deleted"
                      : u.hasPassword
                        ? "Active"
                        : "Password setup pending"}
                  </span>
                </div>
                <div className="user-actions">
                  {u.deletedAt ? (
                    <small>
                      Deleted{" "}
                      {new Intl.DateTimeFormat("en-GB", {
                        timeZone: "Asia/Dubai",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }).format(new Date(u.deletedAt))}
                    </small>
                  ) : (
                    <>
                      <button
                        className="secondary-button"
                        aria-label={`Edit ${u.firstName} ${u.lastName}`}
                        onClick={() => {
                          setError("");
                          setEditing(u);
                        }}
                      >
                        <Pencil size={13} />
                        <span>Edit</span>
                      </button>
                      <button
                        className="delete-button"
                        aria-label={`Delete ${u.firstName} ${u.lastName}`}
                        disabled={u.id === current.id}
                        title={
                          u.id === current.id
                            ? "You cannot delete your own account"
                            : "Delete user"
                        }
                        onClick={() => {
                          setError("");
                          setDeleting(u);
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
        <div className="table-footer">
          <span>
            Regular users can access their own upsells. Admins can also manage
            users.
          </span>
        </div>
      </section>
      {editing && (
        <UserForm
          user={editing === "new" ? undefined : editing}
          self={editing !== "new" && editing.id === current.id}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <Modal
          title="Delete this user?"
          onClose={() => !busy && setDeleting(null)}
        >
          <p className="delete-copy">
            <strong>
              {deleting.firstName} {deleting.lastName}
            </strong>{" "}
            will lose access immediately. Their account and upsell history will
            be retained as a soft-deleted record.
          </p>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <div className="modal-actions">
            <button
              className="secondary-button"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              Keep user
            </button>
            <button className="danger-button" disabled={busy} onClick={remove}>
              {busy ? "Deleting…" : "Delete user"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function UserForm({
  user,
  self,
  onSave,
  onClose,
}: {
  user?: ManagedUser;
  self: boolean;
  onSave: (
    data: Pick<User, "email" | "firstName" | "lastName" | "role">,
    id?: string,
  ) => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await onSave(
        {
          email: String(form.get("email")).trim().toLowerCase(),
          firstName: String(form.get("firstName")).trim(),
          lastName: String(form.get("lastName")).trim(),
          role: self ? "admin" : (form.get("role") as User["role"]),
        },
        user?.id,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      variant="drawer"
      eyebrow="TEAM & ACCESS"
      dismissible={!busy}
      title={user ? "Edit user" : "Add a team member"}
      onClose={() => !busy && onClose()}
    >
      {(close) => (
        <form onSubmit={submit}>
          <div className="modal-form-body">
            <p className="form-intro">
              {user
                ? "Update account details and permissions."
                : "They’ll choose their own password when they first sign in."}
            </p>
            <div className="form-grid">
              <label>
                First name
                <input
                  name="firstName"
                  defaultValue={user?.firstName}
                  required
                  maxLength={60}
                  autoComplete="off"
                />
              </label>
              <label>
                Last name
                <input
                  name="lastName"
                  defaultValue={user?.lastName}
                  required
                  maxLength={60}
                  autoComplete="off"
                />
              </label>
            </div>
            <label>
              Email address
              <input
                name="email"
                type="email"
                defaultValue={user?.email}
                required
                maxLength={254}
                autoComplete="off"
              />
            </label>
            <label>
              Role
              <select
                aria-label="Role"
                name="role"
                defaultValue={user?.role || "user"}
                disabled={self}
              >
                <option value="user">User — own upsells</option>
                <option value="admin">
                  Admin — own upsells and user management
                </option>
              </select>
            </label>
            {self && (
              <p className="form-intro">
                You cannot remove your own administrator access.
              </p>
            )}
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
          </div>
          <div className="modal-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={busy}
              onClick={close}
            >
              Cancel
            </button>
            <button className="primary-button" disabled={busy}>
              {busy ? (
                <LoaderCircle size={15} className="spin" />
              ) : (
                <Check size={15} />
              )}
              {busy ? "Saving…" : user ? "Save user" : "Add user"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
