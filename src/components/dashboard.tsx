"use client";

import Modal from "./modal";
import MotivationalQuote from "./motivational-quote";
import UserManagement from "./user-management";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coffee,
  LayoutDashboard,
  List,
  LoaderCircle,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
  X,
  Pencil,
  Trash2,
  CalendarDays,
  TrendingUp,
  Menu,
  Users,
} from "lucide-react";
import {
  dubaiDate,
  localInput,
  money,
  saleRevenue,
  packages,
  type Package,
  type Sale,
  type User,
} from "@/lib/types";

const icons = {
  Breakfast: Coffee,
  "Half board": UtensilsCrossed,
  "Room upsell": BedDouble,
  "Suite upsell": Sparkles,
};
const colors = ["#f2c600", "#272727", "#b38a00", "#ffe788"];
type Period = "Day" | "Month" | "Year" | "All time";
function demoSales(): Sale[] {
  const names = [
    "Olivia Bennett",
    "Alexander Morgan",
    "Sophie Laurent",
    "James Anderson",
    "Amelia Williams",
    "Daniel Fischer",
    "Charlotte Wilson",
    "Lucas Martin",
    "Emma Thompson",
    "Noah Taylor",
    "Isabella Rossi",
    "William Chen",
  ];
  return Array.from({ length: 38 }, (_, i) => {
    const date = new Date();
    date.setUTCDate(
      date.getUTCDate() - (i < 4 ? 0 : i < 9 ? 1 : Math.floor(i / 2)),
    );
    const type = packages[i % 4];
    return {
      id: `demo-${i}`,
      guestName: names[i % names.length],
      confirmation: `${826410 + i}`,
      room: `${201 + i * 7}`,
      package: type,
      amount: [180, 420, 650, 1350][i % 4],
      nights: (i % 3) + 1,
      soldAt: date.toISOString(),
      opera: i % 5 === 0 ? "pending" : i % 3 === 0 ? "other" : "self",
      updatedBy: i % 3 === 0 ? "Sarah Ahmed" : "Alex Morgan",
      notes: i % 4 === 2 ? "Upgrade to a Palm View Deluxe room." : "",
      createdAt: date.toISOString(),
      updatedAt: date.toISOString(),
    };
  });
}
async function api(url: string, method = "GET", body?: unknown) {
  const response = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}
function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand ${light ? "light" : ""}`}>
      <div className="brand-icon">
        <TrendingUp size={23} strokeWidth={1.6} />
      </div>
      <span>
        upseller<span className="brand-dot">.</span>
      </span>
    </div>
  );
}
function PackageIcon({ type }: { type: Package }) {
  const Icon = icons[type];
  return (
    <span className={`package-icon p${packages.indexOf(type)}`}>
      <Icon size={19} strokeWidth={1.7} />
    </span>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<Sale[]>([]);
  const [error, setError] = useState("");
  const [view, setView] = useState<"overview" | "sales" | "users">("overview");
  const [period, setPeriod] = useState<Period>("Month");
  const [date, setDate] = useState(dubaiDate());
  const [search, setSearch] = useState("");
  const [type, setType] = useState("All packages");
  const [operaFilter, setOperaFilter] = useState("All statuses");
  const [editing, setEditing] = useState<Sale | "new" | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [menu, setMenu] = useState(false);
  const [deleteSale, setDeleteSale] = useState<Sale | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api("/api/auth")
      .then(async (d) => {
        if (d.user) {
          setUser(d.user);
          setSales((await api("/api/sales")).sales);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  function enterDemo() {
    setDemo(true);
    setUser({
      id: "demo",
      firstName: "Alex",
      lastName: "Morgan",
      email: "alex@example.com",
      role: "admin",
    });
    setSales(demoSales());
    setError("");
  }
  async function signedIn(u: User) {
    setUser(u);
    setError("");
    try {
      setSales((await api("/api/sales")).sales);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function logout() {
    try {
      if (!demo) await api("/api/auth", "DELETE");
      setUser(null);
      setDemo(false);
      setSales([]);
      setMenu(false);
      setView("overview");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const inPeriod = (sale: Sale) => {
    const d = dubaiDate(new Date(sale.soldAt));
    return (
      period === "All time" ||
      d.slice(0, period === "Day" ? 10 : period === "Month" ? 7 : 4) ===
        date.slice(0, period === "Day" ? 10 : period === "Month" ? 7 : 4)
    );
  };
  const selected = sales.filter(inPeriod);
  const revenue = selected.reduce((sum, s) => sum + saleRevenue(s), 0);
  const nights = selected.reduce((sum, s) => sum + s.nights, 0);
  const pending = selected.filter((s) => s.opera === "pending").length;
  const filtered = selected
    .filter(
      (s) =>
        (type === "All packages" || s.package === type) &&
        (operaFilter === "All statuses" ||
          (operaFilter === "Pending"
            ? s.opera === "pending"
            : s.opera !== "pending")) &&
        `${s.guestName} ${s.confirmation} ${s.room}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => b.soldAt.localeCompare(a.soldAt));
  const periodLabel =
    period === "All time"
      ? "Your complete journey"
      : new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Dubai",
          ...(period === "Day"
            ? { day: "numeric", month: "long", year: "numeric" }
            : period === "Month"
              ? { month: "long", year: "numeric" }
              : { year: "numeric" }),
        }).format(new Date(`${date}T12:00:00+04:00`));
  function shift(direction: number) {
    const d = new Date(`${date}T12:00:00Z`);
    if (period === "Day") d.setUTCDate(d.getUTCDate() + direction);
    if (period === "Month") {
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() + direction);
    }
    if (period === "Year") d.setUTCFullYear(d.getUTCFullYear() + direction);
    setDate(d.toISOString().slice(0, 10));
  }
  async function save(
    data: Omit<Sale, "id" | "createdAt" | "updatedAt">,
    id?: string,
  ) {
    if (demo) {
      const now = new Date().toISOString();
      setSales((old) =>
        id
          ? old.map((s) =>
              s.id === id ? { ...s, ...data, updatedAt: now } : s,
            )
          : [
              {
                ...data,
                id: crypto.randomUUID(),
                createdAt: now,
                updatedAt: now,
              },
              ...old,
            ],
      );
    } else {
      await api("/api/sales", id ? "PATCH" : "POST", { ...data, id });
      setSales((await api("/api/sales")).sales);
    }
    setEditing(null);
    setToast(
      id
        ? "Upsell updated successfully"
        : "A little extra, beautifully done. Upsell added!",
    );
  }
  async function remove() {
    if (!deleteSale) return;
    setBusy(true);
    try {
      if (!demo) await api("/api/sales", "DELETE", { id: deleteSale.id });
      setSales((old) => old.filter((s) => s.id !== deleteSale.id));
      setDeleteSale(null);
      setToast("Upsell deleted");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function exportCsv() {
    const columns = [
      "Guest",
      "Confirmation",
      "Room",
      "Package",
      "Upsell per night AED",
      "Total AED",
      "Nights",
      "Sold at (Dubai)",
      "Opera status",
      "Updated by",
      "Notes",
    ];
    const rows = filtered.map((s) => [
      s.guestName,
      s.confirmation,
      s.room,
      s.package,
      s.amount,
      saleRevenue(s),
      s.nights,
      localInput(new Date(s.soldAt)),
      s.opera,
      s.updatedBy,
      s.notes,
    ]);
    const csv = [columns, ...rows]
      .map((row) =>
        row
          .map(
            (v) =>
              `"${String(v)
                .replace(/^[=+@\-\t\r]/, "'$&")
                .replaceAll('"', '""')}"`,
          )
          .join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `upseller-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast("Your sales report has been exported");
  }
  if (loading)
    return (
      <div className="loading-screen">
        <Brand />
        <LoaderCircle className="spin" />
        <p>Getting things ready for you…</p>
      </div>
    );
  if (!user)
    return (
      <Auth onSuccess={signedIn} onDemo={enterDemo} initialError={error} />
    );
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <Brand light />
        <div className="hotel-name">
          FAIRMONT THE PALM<span>DUBAI · UNITED ARAB EMIRATES</span>
        </div>
        <div className="nav-caption">YOUR WORKSPACE</div>
        <nav>
          <button
            className={view === "overview" ? "active" : ""}
            onClick={() => {
              setView("overview");
              setMenu(false);
            }}
          >
            <LayoutDashboard size={19} />
            Overview
            <span className="nav-active-dot" />
          </button>
          <button
            className={view === "sales" ? "active" : ""}
            onClick={() => {
              setView("sales");
              setMenu(false);
            }}
          >
            <List size={19} />
            My upsells<span className="nav-count">{sales.length}</span>
          </button>
          {user.role === "admin" && (
            <button
              className={view === "users" ? "active" : ""}
              onClick={() => {
                setView("users");
                setMenu(false);
              }}
            >
              <Users size={19} />
              User management
              <span className="nav-active-dot" />
            </button>
          )}
        </nav>
        <MotivationalQuote key={user.id} userId={user.id} />
        <div className="sidebar-bottom">
          <div className="avatar">
            {user.firstName[0]}
            {user.lastName[0]}
          </div>
          <div>
            <strong>
              {user.firstName} {user.lastName}
            </strong>
            <span>{user.role === "admin" ? "Admin" : "User"} · Fairmont</span>
          </div>
          <button className="icon-button" onClick={logout} aria-label="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      {menu && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-location">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMenu(!menu)}
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>
            <span>My workspace</span>
            <ChevronRight size={14} />
            <strong>
              {view === "overview"
                ? "Overview"
                : view === "users"
                  ? "User management"
                  : "My upsells"}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="today">
              <CalendarDays size={15} />
              {new Intl.DateTimeFormat("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                timeZone: "Asia/Dubai",
              }).format(new Date())}
            </span>
            <span className="small-avatar">
              {user.firstName[0]}
              {user.lastName[0]}
            </span>
          </div>
        </header>
        <main>
          {demo && (
            <div className="demo-banner">
              <span>
                <Sparkles size={14} /> You’re exploring the demo. Changes stay
                in this session.
              </span>
              <button onClick={logout}>
                Create your account <ArrowRight size={14} />
              </button>
            </div>
          )}
          {error && (
            <div role="alert" className="error-banner">
              {error}
              <button onClick={() => setError("")} aria-label="Dismiss error">
                <X size={16} />
              </button>
            </div>
          )}
          {view === "users" && user.role === "admin" ? (
            <UserManagement
              current={user}
              demo={demo}
              onCurrentChange={setUser}
            />
          ) : (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">
                    A LITTLE EXTRA. A LOT OF IMPACT.
                  </div>
                  <h1>
                    {view === "overview"
                      ? `Hello, ${user.firstName}`
                      : "My upsells"}
                    {view === "overview" && (
                      <span className="greeting-dot">.</span>
                    )}
                  </h1>
                  <p>
                    {view === "overview"
                      ? "Great guest experiences start with you. Here’s how you’re doing."
                      : "Every upgrade, every guest, every detail. All in one place."}
                  </p>
                </div>
                <button
                  className="primary-button"
                  onClick={() => setEditing("new")}
                >
                  <Plus size={18} />
                  Add upsell
                </button>
              </section>
              <section className="period-toolbar">
                <div className="segmented">
                  {(["Day", "Month", "Year", "All time"] as Period[]).map(
                    (p) => (
                      <button
                        className={period === p ? "selected" : ""}
                        key={p}
                        onClick={() => setPeriod(p)}
                      >
                        {p === "Day"
                          ? "Daily"
                          : p === "Month"
                            ? "Monthly"
                            : p === "Year"
                              ? "Yearly"
                              : p}
                      </button>
                    ),
                  )}
                </div>
                <div className="date-switcher">
                  {period !== "All time" && (
                    <button
                      aria-label="Previous period"
                      onClick={() => shift(-1)}
                    >
                      <ChevronLeft size={17} />
                    </button>
                  )}
                  <label>
                    <CalendarDays size={15} />
                    <span>{periodLabel}</span>
                    {period !== "All time" && (
                      <input
                        aria-label="Choose reporting date"
                        type="date"
                        value={date}
                        onChange={(e) =>
                          e.target.value && setDate(e.target.value)
                        }
                      />
                    )}
                  </label>
                  {period !== "All time" && (
                    <button aria-label="Next period" onClick={() => shift(1)}>
                      <ChevronRight size={17} />
                    </button>
                  )}
                </div>
              </section>
              <section className="stats-grid">
                <div className="stat-card revenue-card">
                  <div className="stat-label">
                    Total upsell revenue
                    <span className="stat-icon">
                      <TrendingUp size={18} />
                    </span>
                  </div>
                  <div className="stat-value">
                    <span>AED</span> {money(revenue)}
                  </div>
                  <div className="stat-foot">
                    <span className="tiny-spark">✦</span> Your{" "}
                    {period === "All time"
                      ? "all-time"
                      : period.toLowerCase() + "ly"}{" "}
                    contribution
                  </div>
                  <div className="revenue-lines" />
                </div>
                <div className="stat-card">
                  <div className="stat-label">
                    Upsells sold
                    <span className="stat-icon pale">
                      <ArrowUpRight size={19} />
                    </span>
                  </div>
                  <div className="stat-value">
                    {selected.length}
                    <span className="stat-unit"> upsells</span>
                  </div>
                  <div className="stat-foot">
                    Across {new Set(selected.map((s) => s.confirmation)).size}{" "}
                    guest reservations
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">
                    Average upsell
                    <span className="stat-icon pale">
                      <TrendingUp size={18} />
                    </span>
                  </div>
                  <div className="stat-value">
                    <span>AED</span>{" "}
                    {money(selected.length ? revenue / selected.length : 0)}
                  </div>
                  <div className="stat-foot">
                    {nights} room nights with a little extra
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">
                    Opera updates
                    <span className="stat-icon pale">
                      <ShieldCheck size={18} />
                    </span>
                  </div>
                  <div className="stat-value">
                    {selected.length - pending}
                    <span className="stat-unit"> / {selected.length}</span>
                  </div>
                  <div className="stat-foot">
                    {pending ? (
                      <span className="pending-text">
                        <i />
                        {pending} awaiting update
                      </span>
                    ) : (
                      <span className="complete-text">
                        <Check size={13} />
                        All caught up
                      </span>
                    )}
                  </div>
                </div>
              </section>
              {view === "overview" && (
                <section className="insights-grid">
                  <div className="panel trend-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>Revenue at a glance</h2>
                        <p>A little progress, every day.</p>
                      </div>
                      <span className="legend">
                        <i />
                        Upsell revenue
                      </span>
                    </div>
                    <RevenueChart
                      sales={selected}
                      period={period}
                      date={date}
                    />
                    <div className="chart-footer">
                      <TrendingUp size={14} />
                      <span>
                        {selected.length
                          ? `Your strongest package: ${[...packages].sort((a, b) => selected.filter((s) => s.package === b).reduce((n, s) => n + saleRevenue(s), 0) - selected.filter((s) => s.package === a).reduce((n, s) => n + saleRevenue(s), 0))[0]}`
                          : "Your next great guest experience starts with an upsell."}
                      </span>
                    </div>
                  </div>
                  <div className="panel mix-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>Your package mix</h2>
                        <p>Different extras. One great stay.</p>
                      </div>
                      <span className="subtle-icon">
                        <Sparkles size={19} />
                      </span>
                    </div>
                    <div className="mix-body">
                      <div
                        className="donut"
                        style={{
                          background: revenue
                            ? `conic-gradient(${packages
                                .map((p, i) => {
                                  const before = packages
                                    .slice(0, i)
                                    .reduce(
                                      (n, k) =>
                                        n +
                                        selected
                                          .filter((s) => s.package === k)
                                          .reduce(
                                            (t, s) => t + saleRevenue(s),
                                            0,
                                          ),
                                      0,
                                    );
                                  const total = selected
                                    .filter((s) => s.package === p)
                                    .reduce((n, s) => n + saleRevenue(s), 0);
                                  return `${colors[i]} ${(before / revenue) * 100}% ${((before + total) / revenue) * 100}%`;
                                })
                                .join(",")})`
                            : "#e9e8e2",
                        }}
                      >
                        <div>
                          <strong>{selected.length}</strong>
                          <span>total upsells</span>
                        </div>
                      </div>
                      <div className="mix-legend">
                        {packages.map((p, i) => {
                          const amount = selected
                            .filter((s) => s.package === p)
                            .reduce((n, s) => n + saleRevenue(s), 0);
                          return (
                            <div key={p}>
                              <span>
                                <i style={{ background: colors[i] }} />
                                {p}
                              </span>
                              <strong>
                                {revenue
                                  ? Math.round((amount / revenue) * 100)
                                  : 0}
                                %
                              </strong>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>
              )}
              <section className="panel sales-panel">
                <div className="panel-heading sales-heading">
                  <div>
                    <h2>
                      {view === "overview"
                        ? "Recent upsells"
                        : "Your upsell history"}
                      <span className="count-pill">{filtered.length}</span>
                    </h2>
                    <p>The details behind your achievements.</p>
                  </div>
                  <button
                    className="secondary-button export-button"
                    onClick={exportCsv}
                    disabled={!filtered.length}
                  >
                    <ArrowDownToLine size={15} />
                    Export CSV
                  </button>
                </div>
                <div className="table-filters">
                  <div className="search-input">
                    <Search size={16} />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search guest, room or confirmation…"
                      aria-label="Search sales"
                    />
                    {search && (
                      <button
                        aria-label="Clear search"
                        onClick={() => setSearch("")}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <div className="filter-selects">
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      aria-label="Filter by package"
                    >
                      <option>All packages</option>
                      {packages.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                    <select
                      value={operaFilter}
                      onChange={(e) => setOperaFilter(e.target.value)}
                      aria-label="Filter by Opera status"
                    >
                      <option>All statuses</option>
                      <option>Updated</option>
                      <option>Pending</option>
                    </select>
                  </div>
                </div>
                <div className="table-header">
                  <span>GUEST & RESERVATION</span>
                  <span>PACKAGE</span>
                  <span>SALE DATE</span>
                  <span>OPERA PMS</span>
                  <span>TOTAL REVENUE</span>
                  <span />
                </div>
                <div className="sales-list">
                  {filtered
                    .slice(0, view === "overview" ? 5 : undefined)
                    .map((s) => (
                      <div
                        className={`sale-item ${expanded === s.id ? "expanded" : ""}`}
                        key={s.id}
                      >
                        <button
                          className="sale-row"
                          onClick={() =>
                            setExpanded(expanded === s.id ? null : s.id)
                          }
                          aria-expanded={expanded === s.id}
                        >
                          <span className="guest-cell">
                            <span className="guest-avatar">
                              {s.guestName
                                .split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")}
                            </span>
                            <span>
                              <strong>{s.guestName}</strong>
                              <small>
                                Room {s.room}
                                <span>·</span>#{s.confirmation}
                              </small>
                            </span>
                          </span>
                          <span className="package-cell">
                            <PackageIcon type={s.package} />
                            <span>
                              {s.package}
                              <small>
                                {s.nights} {s.nights === 1 ? "night" : "nights"}
                              </small>
                            </span>
                          </span>
                          <span className="sale-date">
                            {new Intl.DateTimeFormat("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              timeZone: "Asia/Dubai",
                            }).format(new Date(s.soldAt))}
                          </span>
                          <span
                            className={`status ${s.opera === "pending" ? "pending" : "updated"}`}
                          >
                            {s.opera === "pending" ? (
                              <span className="status-dot" />
                            ) : (
                              <Check size={12} />
                            )}
                            {s.opera === "pending" ? "Pending" : "Updated"}
                          </span>
                          <span className="sale-amount">
                            <small>AED</small> {money(saleRevenue(s))}
                          </span>
                          <ChevronDown size={16} className="expand-chevron" />
                        </button>
                        {expanded === s.id && (
                          <div className="sale-details">
                            <div>
                              <span>CONFIRMATION</span>
                              <strong>{s.confirmation}</strong>
                            </div>
                            <div>
                              <span>RATE PER NIGHT</span>
                              <strong>AED {money(s.amount)}</strong>
                            </div>
                            <div>
                              <span>SOLD AT · DUBAI</span>
                              <strong>
                                {localInput(new Date(s.soldAt)).replace(
                                  "T",
                                  " · ",
                                )}
                              </strong>
                            </div>
                            <div>
                              <span>OPERA UPDATED BY</span>
                              <strong>
                                {s.opera === "pending"
                                  ? "Awaiting update"
                                  : s.updatedBy ||
                                    `${user.firstName} ${user.lastName}`}
                                {s.opera === "self" ? " (myself)" : ""}
                              </strong>
                            </div>
                            {s.notes && (
                              <div className="detail-notes">
                                <span>NOTES</span>
                                <p>{s.notes}</p>
                              </div>
                            )}
                            <div className="detail-actions">
                              <small>
                                Last edited{" "}
                                {localInput(new Date(s.updatedAt)).replace(
                                  "T",
                                  " at ",
                                )}
                              </small>
                              <button
                                className="secondary-button"
                                onClick={() => setEditing(s)}
                              >
                                <Pencil size={14} />
                                Edit upsell
                              </button>
                              <button
                                className="delete-button"
                                onClick={() => setDeleteSale(s)}
                              >
                                <Trash2 size={15} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
                {!filtered.length && (
                  <div className="empty-state">
                    <span>
                      <Coffee size={27} />
                    </span>
                    <h3>
                      {sales.length
                        ? "No upsells in this view"
                        : "Your first upsell starts here"}
                    </h3>
                    <p>
                      {sales.length
                        ? "Try another date, package, or search."
                        : "Capture the little extras that make every stay special."}
                    </p>
                    <button
                      className="secondary-button"
                      onClick={() => setEditing("new")}
                    >
                      <Plus size={15} />
                      Add an upsell
                    </button>
                  </div>
                )}
                <div className="table-footer">
                  <span>
                    {filtered.length
                      ? `Showing ${Math.min(filtered.length, view === "overview" ? 5 : filtered.length)} of ${filtered.length} upsells`
                      : "No sales to display"}
                    <span className="footer-timezone">
                      {" "}
                      · Dates in Dubai time
                    </span>
                  </span>
                  {view === "overview" && (
                    <button onClick={() => setView("sales")}>
                      View all upsells <ArrowRight size={15} />
                    </button>
                  )}
                </div>
              </section>
            </>
          )}
          <footer className="page-footer">
            <span>Thoughtful upgrades. Remarkable results.</span>
            <span>
              MADE FOR FAIRMONT THE PALM <span className="gold-star">✦</span>
            </span>
          </footer>
        </main>
      </div>
      <nav className="mobile-bottom-nav">
        <button
          className={view === "overview" ? "active" : ""}
          onClick={() => setView("overview")}
        >
          <LayoutDashboard size={20} />
          Overview
        </button>
        <button className="mobile-add" onClick={() => setEditing("new")}>
          <Plus size={24} />
          <span>Add upsell</span>
        </button>
        <button
          className={view === "sales" ? "active" : ""}
          onClick={() => setView("sales")}
        >
          <List size={20} />
          My upsells
        </button>
        {user.role === "admin" && (
          <button
            className={view === "users" ? "active" : ""}
            onClick={() => setView("users")}
          >
            <Users size={20} />
            Users
          </button>
        )}
      </nav>
      {editing && (
        <SaleForm
          sale={editing === "new" ? undefined : editing}
          user={user}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
      {deleteSale && (
        <Modal
          title="Delete this upsell?"
          onClose={() => !busy && setDeleteSale(null)}
        >
          <p className="delete-copy">
            The {deleteSale.package.toLowerCase()} sale for{" "}
            <strong>{deleteSale.guestName}</strong> (AED{" "}
            {money(saleRevenue(deleteSale))}) will be permanently removed.
          </p>
          <div className="modal-actions">
            <button
              className="secondary-button"
              disabled={busy}
              onClick={() => setDeleteSale(null)}
            >
              Keep upsell
            </button>
            <button className="danger-button" disabled={busy} onClick={remove}>
              {busy ? "Deleting…" : "Delete upsell"}
            </button>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <span>
            <Check size={16} />
          </span>
          {toast}
        </div>
      )}
    </div>
  );
}

function RevenueChart({
  sales,
  period,
  date,
}: {
  sales: Sale[];
  period: Period;
  date: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const points = useMemo(() => {
    const years = sales.map((s) =>
      Number(dubaiDate(new Date(s.soldAt)).slice(0, 4)),
    );
    const lastYear = Math.max(Number(date.slice(0, 4)), ...years);
    const firstYear = Math.min(lastYear - 1, ...years);
    const count =
      period === "Day"
        ? 24
        : period === "Month"
          ? new Date(
              Number(date.slice(0, 4)),
              Number(date.slice(5, 7)),
              0,
            ).getDate()
          : period === "Year"
            ? 12
            : lastYear - firstYear + 1;
    const buckets = Array.from({ length: count }, (_, i) => ({
      label:
        period === "All time"
          ? String(firstYear + i)
          : period === "Day"
            ? `${String(i).padStart(2, "0")}:00`
            : period === "Month"
              ? `${i + 1} ${new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(`${date}T12:00:00Z`))}`
              : new Intl.DateTimeFormat("en", { month: "short" }).format(
                  new Date(2026, i, 1),
                ),
      value: 0,
    }));
    sales.forEach((s) => {
      const local = localInput(new Date(s.soldAt));
      const index =
        period === "All time"
          ? Number(local.slice(0, 4)) - firstYear
          : period === "Day"
            ? Number(local.slice(11, 13))
            : period === "Month"
              ? Number(local.slice(8, 10)) - 1
              : Number(local.slice(5, 7)) - 1;
      buckets[index].value += saleRevenue(s);
    });
    return buckets;
  }, [sales, period, date]);
  const max = Math.max(1000, ...points.map((p) => p.value)) * 1.15;
  const W = 680,
    H = 180;
  const xy = points.map((p, i) => [
    (i / (points.length - 1)) * W,
    H - (p.value / max) * (H - 10),
  ]);
  const line = xy.map((p, i) => `${i ? "L" : "M"}${p.join(",")}`).join(" ");
  return (
    <div className="chart">
      <div className="chart-y">
        {[1, 0.5, 0].map((n) => (
          <span key={n}>{n ? `${((max * n) / 1000).toFixed(1)}k` : "0"}</span>
        ))}
      </div>
      <div className="chart-main">
        <div className="chart-plot">
          <div className="chart-grid">
            <i />
            <i />
            <i />
          </div>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            role="img"
            aria-label="Revenue by day, hour or month"
          >
            <defs>
              <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e0b000" stopOpacity=".22" />
                <stop offset="100%" stopColor="#e0b000" stopOpacity=".01" />
              </linearGradient>
            </defs>
            <path d={`${line} L${W},${H} L0,${H} Z`} fill="url(#fill)" />
            <path
              d={line}
              fill="none"
              stroke="#e0b000"
              strokeWidth="2.6"
              vectorEffect="non-scaling-stroke"
            />
            {hover !== null && (
              <circle
                cx={xy[hover][0]}
                cy={xy[hover][1]}
                r="4"
                fill="#e0b000"
                stroke="white"
                strokeWidth="2"
              />
            )}
          </svg>
          <div className="chart-hitboxes">
            {points.map((p, i) => (
              <button
                key={i}
                aria-label={`${p.label}: AED ${money(p.value)}`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onClick={() => setHover(i)}
              />
            ))}
          </div>
          {hover !== null && (
            <div
              className="chart-tooltip"
              style={{
                left: `${Math.min(84, Math.max(12, (hover / (points.length - 1)) * 100))}%`,
              }}
            >
              {points[hover].label}
              <strong>AED {money(points[hover].value)}</strong>
            </div>
          )}
        </div>
        <div className="chart-x">
          {points
            .filter(
              (_, i) =>
                i === 0 ||
                i === points.length - 1 ||
                i % Math.ceil(points.length / 5) === 0,
            )
            .map((p) => (
              <span key={p.label}>{p.label}</span>
            ))}
        </div>
      </div>
    </div>
  );
}

function SaleForm({
  sale,
  user,
  onClose,
  onSave,
}: {
  sale?: Sale;
  user: User;
  onClose: () => void;
  onSave: (
    data: Omit<Sale, "id" | "createdAt" | "updatedAt">,
    id?: string,
  ) => Promise<void>;
}) {
  const [pkg, setPkg] = useState<Package>(sale?.package || "Breakfast");
  const [opera, setOpera] = useState(sale?.opera || "pending");
  const [amount, setAmount] = useState(String(sale?.amount ?? ""));
  const [nights, setNights] = useState(String(sale?.nights ?? 1));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const soldAt = new Date(`${data.get("soldAt")}:00+04:00`).toISOString();
      if (new Date(soldAt).getTime() > Date.now() + 60000)
        throw new Error("Sale date cannot be in the future.");
      await onSave(
        {
          guestName: String(data.get("guestName")).trim(),
          confirmation: String(data.get("confirmation")).trim(),
          room: String(data.get("room")).trim(),
          package: pkg,
          amount: Number(data.get("amount")),
          nights: Number(data.get("nights")),
          soldAt,
          opera,
          updatedBy:
            opera === "self"
              ? `${user.firstName} ${user.lastName}`
              : opera === "other"
                ? String(data.get("updatedBy")).trim()
                : "",
          notes: String(data.get("notes")).trim(),
        },
        sale?.id,
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
      dismissible={!busy}
      eyebrow={sale ? "REFINE THE DETAILS" : "A LITTLE EXTRA. A GREAT STAY."}
      title={sale ? "Edit your upsell" : "Add an upsell"}
      onClose={() => !busy && onClose()}
    >
      {(close) => (
        <form className="upsell-form" onSubmit={submit}>
          <div className="modal-form-body">
            <fieldset className="drawer-section">
              <legend>
                <span>01 · THE GUEST</span>Guest & reservation
              </legend>
              <label>
                Guest name
                <input
                  name="guestName"
                  placeholder="e.g. Olivia Bennett"
                  defaultValue={sale?.guestName}
                  required
                  maxLength={100}
                  autoComplete="off"
                />
              </label>
              <div className="form-grid">
                <label>
                  Confirmation number
                  <input
                    name="confirmation"
                    placeholder="e.g. 826410"
                    defaultValue={sale?.confirmation}
                    required
                    maxLength={50}
                  />
                </label>
                <label>
                  Room number
                  <input
                    name="room"
                    placeholder="e.g. 504"
                    defaultValue={sale?.room}
                    required
                    maxLength={20}
                  />
                </label>
              </div>
            </fieldset>
            <fieldset className="drawer-section">
              <legend>
                <span>02 · THE LITTLE EXTRA</span>The upgrade
              </legend>
              <label>Package sold</label>
              <div className="package-picker">
                {packages.map((p) => {
                  const Icon = icons[p];
                  return (
                    <button
                      type="button"
                      key={p}
                      className={pkg === p ? "selected" : ""}
                      aria-pressed={pkg === p}
                      onClick={() => setPkg(p)}
                    >
                      <Icon size={21} />
                      <span>{p}</span>
                      {pkg === p && (
                        <Check size={12} className="package-check" />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="form-grid">
                <label>
                  Upsell value{" "}
                  <span className="label-hint">AED · per night</span>
                  <input
                    type="number"
                    name="amount"
                    min="0.01"
                    max="10000000"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Number of nights
                  <input
                    type="number"
                    name="nights"
                    min="1"
                    max="365"
                    step="1"
                    value={nights}
                    onChange={(e) => setNights(e.target.value)}
                    required
                  />
                </label>
              </div>
              <div className="sale-total-preview" aria-live="polite">
                <div>
                  <span>Total upsell revenue</span>
                  <small>
                    AED {money(Number(amount) || 0)} × {Number(nights) || 0}{" "}
                    {(Number(nights) || 0) === 1 ? "night" : "nights"}
                  </small>
                </div>
                <strong>
                  AED{" "}
                  {money(
                    saleRevenue({
                      amount: Number(amount) || 0,
                      nights: Number(nights) || 0,
                    }),
                  )}
                </strong>
              </div>
              <label>
                Sale date & time{" "}
                <span className="label-hint">Dubai (UTC+4)</span>
                <input
                  type="datetime-local"
                  name="soldAt"
                  defaultValue={
                    sale ? localInput(new Date(sale.soldAt)) : localInput()
                  }
                  max={localInput()}
                  required
                />
              </label>
            </fieldset>
            <fieldset className="drawer-section">
              <legend>
                <span>03 · KEEP THINGS IN SYNC</span>Opera & notes
              </legend>
              <label>
                Has this been updated in Opera?
                <select
                  value={opera}
                  onChange={(e) => setOpera(e.target.value as Sale["opera"])}
                >
                  <option value="pending">Not yet — awaiting update</option>
                  <option value="self">Yes — updated by myself</option>
                  <option value="other">Yes — updated by someone else</option>
                </select>
              </label>
              {opera === "other" && (
                <label>
                  Updated by
                  <input
                    name="updatedBy"
                    defaultValue={sale?.opera === "other" ? sale.updatedBy : ""}
                    placeholder="Colleague’s full name"
                    required
                    maxLength={100}
                  />
                </label>
              )}
              <label>
                Notes <span className="label-hint">Optional</span>
                <textarea
                  name="notes"
                  defaultValue={sale?.notes}
                  placeholder="Room category, guest preferences, or anything useful…"
                  rows={2}
                  maxLength={2000}
                />
              </label>
            </fieldset>
            {error && (
              <div role="alert" className="form-error">
                {error}
              </div>
            )}
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={close}
            >
              Cancel
            </button>
            <button className="primary-button" disabled={busy}>
              {busy ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <Check size={16} />
              )}
              {busy ? "Saving…" : sale ? "Save changes" : "Save upsell"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function Auth({
  onSuccess,
  onDemo,
  initialError,
}: {
  onSuccess: (user: User) => void;
  onDemo: () => void;
  initialError: string;
}) {
  const [step, setStep] = useState<"email" | "login" | "register">("email");
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState({ firstName: "", lastName: "" });
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    try {
      if (step === "email") {
        const result = await api("/api/auth", "POST", {
          action: "check",
          email,
        });
        setStep(result.needsPassword ? "register" : "login");
        setProfile({
          firstName: result.firstName || "",
          lastName: result.lastName || "",
        });
      } else {
        const result = await api("/api/auth", "POST", {
          action: "signin",
          email,
          password: data.get("password"),
          firstName: data.get("firstName"),
          lastName: data.get("lastName"),
          remember: data.get("remember") === "on",
        });
        onSuccess(result.user);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <div className="auth-story">
        <Brand light />
        <div className="auth-art">
          <div className="art-sun" />
          <div className="art-arch">
            <div className="art-water" />
            <div className="art-horizon" />
          </div>
          <div className="art-line l1" />
          <div className="art-line l2" />
        </div>
        <div className="auth-story-copy">
          <div className="eyebrow">FAIRMONT THE PALM · DUBAI</div>
          <h1>
            A better stay.
            <br />A little extra.
            <br />
            <em>All because of you.</em>
          </h1>
          <p>
            Your personal space to celebrate every upgrade
            <br />
            and see the difference you make.
          </p>
        </div>
        <div className="auth-story-footer">
          THOUGHTFUL UPGRADES. REMARKABLE RESULTS.
          <Sparkles size={17} />
        </div>
      </div>
      <div className="auth-form-side">
        <div className="auth-mobile-brand">
          <Brand />
        </div>
        <div className="auth-form-wrap">
          <span className="welcome-icon">
            <Sparkles size={25} strokeWidth={1.4} />
          </span>
          <div className="eyebrow">YOUR NEXT GREAT DAY STARTS HERE</div>
          <h2>
            {step === "register"
              ? "Let’s make it yours."
              : step === "login"
                ? "Welcome back."
                : "Welcome to Upseller."}
          </h2>
          <p className="auth-subtitle">
            {step === "register"
              ? "A few details, and you’re ready to track your success."
              : step === "login"
                ? "Your little extras are adding up. Let’s take a look."
                : "A simple way to track your upsells. A beautiful way to see your progress."}
          </p>
          <form onSubmit={submit}>
            {step !== "email" && (
              <button
                type="button"
                className="email-back"
                onClick={() => {
                  setStep("email");
                  setError("");
                }}
              >
                <ArrowLeft size={14} />
                {email}
                <span>Change</span>
              </button>
            )}
            {step === "email" ? (
              <label>
                Email address
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  autoComplete="email"
                  maxLength={254}
                  autoFocus
                />
              </label>
            ) : (
              <>
                {step === "register" && (
                  <div className="form-grid">
                    <label>
                      First name
                      <input
                        name="firstName"
                        defaultValue={profile.firstName}
                        autoComplete="given-name"
                        placeholder="Alex"
                        required
                        maxLength={60}
                      />
                    </label>
                    <label>
                      Last name
                      <input
                        name="lastName"
                        defaultValue={profile.lastName}
                        autoComplete="family-name"
                        placeholder="Morgan"
                        required
                        maxLength={60}
                      />
                    </label>
                  </div>
                )}
                <label>
                  {step === "register" ? "Create a password" : "Password"}
                  <input
                    name="password"
                    type="password"
                    autoComplete={
                      step === "register" ? "new-password" : "current-password"
                    }
                    minLength={10}
                    maxLength={72}
                    placeholder={
                      step === "register"
                        ? "At least 10 characters"
                        : "Enter your password"
                    }
                    required
                  />
                </label>
                <label className="checkbox-label">
                  <input name="remember" type="checkbox" defaultChecked />
                  Remember me on this device
                </label>
              </>
            )}
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <button className="primary-button auth-submit" disabled={busy}>
              {busy ? (
                <LoaderCircle size={18} className="spin" />
              ) : (
                <>
                  {step === "email"
                    ? "Continue with email"
                    : step === "register"
                      ? "Create my account"
                      : "Sign in"}
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
          <p className="auth-help">
            {step === "email"
              ? "New here? Enter your email to create your account."
              : "Your sales are private and linked to your email address."}
          </p>
          <div className="auth-divider">
            <span />A FIRST LOOK
            <span />
          </div>
          <button className="demo-button" onClick={onDemo}>
            Explore the demo <ArrowUpRight size={16} />
          </button>
          <div className="auth-security">
            <ShieldCheck size={15} />
            Your achievements. Your private workspace.
          </div>
        </div>
        <footer>
          UPSELLER <span>✦</span> FAIRMONT THE PALM
        </footer>
      </div>
    </div>
  );
}
