import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import AppLayout from "../layouts/AppLayout"
import AdminTopbar from "../components/AdminTopbar"

const API_BASE = import.meta.env.VITE_API_BASE_URL || ""
const LS_KEY = "mt_session_v1"

type ActiveRole = "FIELD" | "PJA" | "EVALUATOR"
type AccountRole = "USER" | "ADMIN"
type OperationalAccess = "NONE" | "FIELD" | "PJA" | "ALL"
type SiteCode = "LAT" | "IPR" | "SDJ" | "ADT"

const SITE_OPTIONS: { code: SiteCode; label: string }[] = [
  { code: "LAT", label: "LAT" },
  { code: "IPR", label: "IPR" },
  { code: "SDJ", label: "SDJ" },
  { code: "ADT", label: "ADT" },
]

type SessionData = {
  id?: string | null
  username?: string
  accountRole?: AccountRole
  operationalAccess?: OperationalAccess
  activeRole?: ActiveRole | null
  site?: SiteCode | string | null
  siteCode?: SiteCode | string | null
  activeSite?: SiteCode | string | null
  selectedSite?: SiteCode | string | null
  workspaceSite?: SiteCode | string | null
  ts?: number
}

type Stats = {
  inspectionsCount: number
  linesCount: number
  measuresCount: number
  photoCount: number
  bucket: string
}

type UserRow = {
  id: string
  username: string
  role: AccountRole | string
  operational_access?: OperationalAccess
  site?: SiteCode | string | null
  site_code?: SiteCode | string | null
  active_site?: SiteCode | string | null
  selected_site?: SiteCode | string | null
  workspace_site?: SiteCode | string | null
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

function getSession(): SessionData | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function formatDateLabel(value?: string) {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value

  return d.toLocaleString("id-ID", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatNumber(value?: number | null) {
  if (typeof value !== "number") return "0"
  return new Intl.NumberFormat("id-ID").format(value)
}

function normalizeText(value?: string | null) {
  return String(value || "").trim().toUpperCase()
}

function isSiteCode(value?: string | null): value is SiteCode {
  const clean = normalizeText(value)
  return clean === "LAT" || clean === "IPR" || clean === "SDJ" || clean === "ADT"
}

function getUserSite(user?: UserRow | null): SiteCode {
  const rawSite =
    user?.site ||
    user?.site_code ||
    user?.active_site ||
    user?.selected_site ||
    user?.workspace_site

  const clean = normalizeText(rawSite)

  if (isSiteCode(clean)) return clean

  return "LAT"
}

async function readJsonSafe(res: Response) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  )
}

function PageLoading() {
  return (
    <AppLayout hideTopbar>
      <div className="mx-auto flex min-h-[70vh] w-full max-w-6xl items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md rounded-[30px] border border-slate-200 bg-white px-6 py-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <Spinner className="h-9 w-9 border-[4px]" />
          </div>

          <div className="mt-5 text-lg font-black tracking-tight text-slate-900">
            Memuat Admin Workspace
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Sedang memeriksa akses admin dan menyiapkan dashboard.
          </p>
        </div>
      </div>
    </AppLayout>
  )
}

function StatSkeleton() {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-5 shadow-sm">
      <div className="h-3 w-28 animate-pulse rounded-full bg-slate-200" />
      <div className="mt-4 h-9 w-20 animate-pulse rounded-2xl bg-slate-200" />
      <div className="mt-3 h-3 w-36 animate-pulse rounded-full bg-slate-100" />
    </div>
  )
}

function StatCard({
  label,
  value,
  helper,
  loading,
}: {
  label: string
  value?: number | null
  helper?: string
  loading?: boolean
}) {
  if (loading) return <StatSkeleton />

  return (
    <div className="rounded-[24px] border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-5 shadow-sm">
      <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>

      <div className="mt-3 text-3xl font-black text-slate-900">
        {formatNumber(value ?? 0)}
      </div>

      {helper ? (
        <div className="mt-2 break-all text-xs font-semibold text-slate-500">
          {helper}
        </div>
      ) : null}
    </div>
  )
}

function UserListSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-slate-200 bg-white p-4"
        >
          <div className="h-4 w-36 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-3 h-3 w-56 animate-pulse rounded-full bg-slate-100" />
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Admin() {
  const nav = useNavigate()

  const session = useMemo(() => getSession(), [])
  const username = session?.username || ""
  const accountRole = session?.accountRole
  const isAdminAccount = String(accountRole || "").toUpperCase() === "ADMIN"

  const [bootLoading, setBootLoading] = useState(true)

  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])

  const [statsLoading, setStatsLoading] = useState(false)
  const [usersLoading, setUsersLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [creatingUser, setCreatingUser] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [actionBusy, setActionBusy] = useState<string | null>(null)

  const [newUsername, setNewUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newRole, setNewRole] = useState<AccountRole>("USER")
  const [newOperationalAccess, setNewOperationalAccess] =
    useState<OperationalAccess>("NONE")
  const [newSite, setNewSite] = useState<SiteCode>("LAT")

  const [err, setErr] = useState("")
  const [msg, setMsg] = useState("")
  const [statsErr, setStatsErr] = useState("")
  const [usersErr, setUsersErr] = useState("")

  const [confirmText, setConfirmText] = useState("")
  const [resetStartDate, setResetStartDate] = useState("")
  const [resetEndDate, setResetEndDate] = useState("")

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const aActive = a.is_active ?? true
      const bActive = b.is_active ?? true

      if (aActive !== bActive) return aActive ? -1 : 1

      return (a.username || "").localeCompare(b.username || "", "id-ID", {
        sensitivity: "base",
      })
    })
  }, [users])

  const anyUserActionBusy = Boolean(actionBusy)

  async function loadStats() {
    setStatsLoading(true)
    setStatsErr("")

    try {
      const res = await fetch(`${API_BASE}/api/admin/stats`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      })

      const data = await readJsonSafe(res)
      if (!res.ok) {
        throw new Error(data?.error || "Gagal mengambil statistik")
      }

      setStats(data)
    } catch (e: any) {
      setStatsErr(e?.message || "Gagal mengambil statistik")
      throw e
    } finally {
      setStatsLoading(false)
    }
  }

  async function loadUsers() {
    setUsersLoading(true)
    setUsersErr("")

    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      })

      const data = await readJsonSafe(res)
      if (!res.ok) {
        throw new Error(data?.error || "Gagal mengambil user")
      }

      setUsers(data?.data || [])
    } catch (e: any) {
      setUsersErr(e?.message || "Gagal mengambil user")
      throw e
    } finally {
      setUsersLoading(false)
    }
  }

  async function loadInitialData() {
    const results = await Promise.allSettled([loadStats(), loadUsers()])

    const rejected = results.find((item) => item.status === "rejected")
    if (rejected) {
      setErr(
        "Sebagian data admin gagal dimuat. Coba refresh atau login ulang jika akses ditolak."
      )
    }
  }

  useEffect(() => {
    if (!username) {
      nav("/", { replace: true })
      return
    }

    if (!isAdminAccount) {
      nav("/select-role", { replace: true })
      return
    }

    setBootLoading(false)
    loadInitialData()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleRefreshAll() {
    setErr("")
    setMsg("")
    setRefreshing(true)

    const results = await Promise.allSettled([loadStats(), loadUsers()])

    const hasError = results.some((item) => item.status === "rejected")
    if (hasError) {
      setErr("Sebagian data gagal diperbarui")
    } else {
      setMsg("Data admin diperbarui")
    }

    setRefreshing(false)
  }

  async function handleCreateUser() {
    if (!newUsername.trim() || !newPassword.trim() || !newRole.trim()) {
      setErr("Username, password, dan role wajib diisi")
      return
    }

    setErr("")
    setMsg("")
    setCreatingUser(true)

    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword.trim(),
          role: newRole,
          operational_access:
            newRole === "ADMIN" ? "ALL" : newOperationalAccess,
          site: newSite,
        }),
      })

      const data = await readJsonSafe(res)
      if (!res.ok) {
        throw new Error(data?.error || "Gagal menambah user")
      }

      setMsg("User berhasil dibuat")
      setNewUsername("")
      setNewPassword("")
      setNewRole("USER")
      setNewOperationalAccess("NONE")
      setNewSite("LAT")

      await loadUsers()
    } catch (e: any) {
      setErr(e?.message || "Gagal membuat user")
    } finally {
      setCreatingUser(false)
    }
  }

  async function handleUpdateUser(
    user: UserRow,
    patch: Partial<{
      role: AccountRole
      operational_access: OperationalAccess
      site: SiteCode
      is_active: boolean
      password: string
    }>,
    successMessage?: string,
    actionName = "update"
  ) {
    setErr("")
    setMsg("")
    setActionBusy(`${actionName}:${user.id}`)

    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(patch),
      })

      const result = await readJsonSafe(res)

      if (!res.ok) {
        throw new Error(result?.error || "Gagal memperbarui user")
      }

      const updatedUser = result?.data

      if (updatedUser) {
        setUsers((prev) =>
          prev.map((item) =>
            item.id === user.id
              ? {
                  ...item,
                  ...updatedUser,
                }
              : item
          )
        )
      } else {
        await loadUsers()
      }

      setMsg(successMessage || `User ${user.username} berhasil diperbarui`)
    } catch (e: any) {
      setErr(e?.message || "Gagal memperbarui user")
    } finally {
      setActionBusy(null)
    }
  }

  async function handleToggleUser(user: UserRow) {
    const actionLabel =
      user.is_active === false ? "mengaktifkan" : "menonaktifkan"

    const ok = window.confirm(
      `Yakin ingin ${actionLabel} user ${user.username}?`
    )

    if (!ok) return

    await handleUpdateUser(
      user,
      {
        is_active: !(user.is_active ?? true),
      },
      `User ${user.username} berhasil diperbarui`,
      "toggle"
    )
  }

  async function handleResetPassword(user: UserRow) {
    const newPass = window.prompt(
      `Masukkan password baru untuk ${user.username}`
    )

    if (!newPass) return

    await handleUpdateUser(
      user,
      {
        password: newPass,
      },
      `Password user ${user.username} berhasil direset`,
      "password"
    )
  }

  async function handleChangeRole(user: UserRow, nextRole: AccountRole) {
    const currentRole = (user.role as AccountRole) === "ADMIN" ? "ADMIN" : "USER"
    if (currentRole === nextRole) return

    const isSelf = user.username === username
    const roleLabel = nextRole === "ADMIN" ? "ADMIN" : "USER"

    const ok = window.confirm(
      isSelf
        ? `Yakin ingin mengubah akun kamu sendiri menjadi ${roleLabel}?`
        : `Yakin ingin mengubah role ${user.username} menjadi ${roleLabel}?`
    )

    if (!ok) return

    await handleUpdateUser(
      user,
      {
        role: nextRole,
        operational_access:
          nextRole === "ADMIN" ? "ALL" : user.operational_access ?? "NONE",
      },
      `Role ${user.username} berhasil diubah menjadi ${roleLabel}`,
      "role"
    )
  }

  async function handleChangeOperationalAccess(
    user: UserRow,
    operationalAccess: OperationalAccess
  ) {
    await handleUpdateUser(
      user,
      {
        operational_access: operationalAccess,
      },
      `Akses ${user.username} berhasil diperbarui`,
      "access"
    )
  }

  async function handleChangeSite(user: UserRow, site: SiteCode) {
    await handleUpdateUser(
      user,
      {
        site,
      },
      `Site ${user.username} berhasil diubah menjadi ${site}`,
      "site"
    )
  }

  async function handleReset() {
    if (confirmText !== "RESET") {
      setErr("Ketik RESET terlebih dahulu")
      return
    }

    if (resetStartDate && resetEndDate && resetStartDate > resetEndDate) {
      setErr("Tanggal mulai tidak boleh lebih besar dari tanggal akhir")
      return
    }

    const dateText =
      resetStartDate || resetEndDate
        ? `\n\nRange tanggal:\n${resetStartDate || "(awal)"} s/d ${
            resetEndDate || "(akhir)"
          }`
        : "\n\nSemua data akan dihapus."

    const ok = window.confirm(
      `Yakin ingin reset data operasional dan menghapus photo?${dateText}`
    )

    if (!ok) return

    setErr("")
    setMsg("")
    setResetting(true)

    try {
      const res = await fetch(`${API_BASE}/api/admin/reset-operational`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          startDate: resetStartDate || null,
          endDate: resetEndDate || null,
        }),
      })

      const data = await readJsonSafe(res)
      if (!res.ok) throw new Error(data?.error || "Reset gagal")

      setMsg(data?.message || "Reset berhasil")
      setConfirmText("")

      await Promise.allSettled([loadStats(), loadUsers()])
    } catch (e: any) {
      setErr(e?.message || "Reset gagal")
    } finally {
      setResetting(false)
    }
  }

  if (bootLoading) return <PageLoading />

  if (!username || !isAdminAccount) return null

  return (
    <>
      <AdminTopbar />

      <AppLayout hideTopbar>
        <div className="mx-auto w-full max-w-7xl p-3 sm:p-6">
          <div className="mb-5 flex flex-col gap-4 rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-emerald-50/50 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-700 sm:text-[11px]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  className="shrink-0"
                >
                  <path
                    fill="currentColor"
                    d="M12 23C6.443 21.765 2 16.522 2 11V5l10-4l10 4v6c0 5.524-4.443 10.765-10 12M4 6v5a10.58 10.58 0 0 0 8 10a10.58 10.58 0 0 0 8-10V6l-8-3Z"
                  />
                  <circle cx="12" cy="8.5" r="2.5" fill="currentColor" />
                  <path
                    fill="currentColor"
                    d="M7 15a5.78 5.78 0 0 0 5 3a5.78 5.78 0 0 0 5-3c-.025-1.896-3.342-3-5-3c-1.667 0-4.975 1.104-5 3"
                  />
                </svg>
                Admin Workspace
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Admin Panel
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Kelola user sistem, pantau isi database, dan lakukan reset
                operasional dari satu dashboard.
              </p>

              <div className="mt-3 text-xs font-semibold text-slate-500">
                Login sebagai:{" "}
                <span className="text-slate-800">{username}</span>
              </div>
            </div>

            <button
              onClick={handleRefreshAll}
              disabled={refreshing}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {refreshing ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Refreshing...
                </>
              ) : (
                "Refresh Semua Data"
              )}
            </button>
          </div>

          {err ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {err}
            </div>
          ) : null}

          {msg ? (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {msg}
            </div>
          ) : null}

          <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
            <section className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-[0_18px_55px_rgba(15,23,42,0.08)] sm:p-6">
              <div className="mb-5">
                <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-sky-700 sm:text-[11px]">
                  User Access Management
                </div>

                <h2 className="mt-3 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                  Kelola Akses User
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Tambah user baru, ubah role user/admin, atur site, atur akses operasional,
                  aktif-nonaktifkan akun, dan reset password.
                </p>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                <div className="mb-4 text-sm font-bold text-slate-800">
                  Tambah User Baru
                </div>

                <div className="space-y-3">
                  <input
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Username baru"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />

                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Password awal user"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <select
                      value={newRole}
                      onChange={(e) => {
                        const value = e.target.value as AccountRole
                        setNewRole(value)

                        if (value === "ADMIN") {
                          setNewOperationalAccess("ALL")
                        }
                      }}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>

                    <select
                      value={newOperationalAccess}
                      onChange={(e) =>
                        setNewOperationalAccess(
                          e.target.value as OperationalAccess
                        )
                      }
                      disabled={newRole === "ADMIN"}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="NONE">NONE</option>
                      <option value="FIELD">FIELD</option>
                      <option value="PJA">PJA</option>
                      <option value="ALL">ALL</option>
                    </select>

                    <select
                      value={newSite}
                      onChange={(e) => setNewSite(e.target.value as SiteCode)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    >
                      {SITE_OPTIONS.map((site) => (
                        <option key={site.code} value={site.code}>
                          {site.label}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={handleCreateUser}
                      disabled={creatingUser}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#15803D] to-[#22A745] px-4 py-3 font-extrabold text-white shadow-[0_12px_30px_rgba(5,150,105,0.20)] transition hover:from-[#166534] hover:to-[#16A34A] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {creatingUser ? (
                        <>
                          <Spinner className="h-4 w-4" />
                          Menambah...
                        </>
                      ) : (
                        "Tambah User"
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-slate-800">
                        Daftar User
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Total user: {usersLoading ? "..." : sortedUsers.length}
                      </div>
                    </div>

                    {usersLoading ? (
                      <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">
                        <Spinner className="h-3.5 w-3.5" />
                        Loading
                      </div>
                    ) : null}
                  </div>
                </div>

                {usersErr ? (
                  <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {usersErr}
                  </div>
                ) : null}

                {usersLoading && sortedUsers.length === 0 ? (
                  <UserListSkeleton />
                ) : sortedUsers.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-500">
                    Belum ada user.
                  </div>
                ) : (
                  <>
                    <div className="block md:hidden">
                      <div className="space-y-3 bg-slate-50/60 p-3">
                        {sortedUsers.map((u) => {
                          const active = u.is_active ?? true
                          const currentRole =
                            (u.role as AccountRole) === "ADMIN"
                              ? "ADMIN"
                              : "USER"
                          const rowBusy = actionBusy?.endsWith(`:${u.id}`)
                          const currentSite = getUserSite(u)

                          return (
                            <div
                              key={u.id}
                              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="truncate font-black text-slate-900">
                                    {u.username}
                                  </div>
                                  <div className="mt-1 text-[11px] text-slate-500">
                                    Dibuat: {formatDateLabel(u.created_at)}
                                  </div>
                                </div>

                                <span
                                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                    active
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-red-50 text-red-700"
                                  }`}
                                >
                                  {active ? "ACTIVE" : "INACTIVE"}
                                </span>
                              </div>

                              <div className="mt-4 grid gap-3">
                                <div>
                                  <label className="mb-1 block text-xs font-bold text-slate-500">
                                    Role Akun
                                  </label>
                                  <select
                                    value={currentRole}
                                    disabled={anyUserActionBusy}
                                    onChange={(e) =>
                                      handleChangeRole(
                                        u,
                                        e.target.value as AccountRole
                                      )
                                    }
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
                                  >
                                    <option value="USER">USER</option>
                                    <option value="ADMIN">ADMIN</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="mb-1 block text-xs font-bold text-slate-500">
                                    Site
                                  </label>
                                  <select
                                    value={currentSite}
                                    disabled={anyUserActionBusy}
                                    onChange={(e) =>
                                      handleChangeSite(u, e.target.value as SiteCode)
                                    }
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
                                  >
                                    {SITE_OPTIONS.map((site) => (
                                      <option key={site.code} value={site.code}>
                                        {site.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="mb-1 block text-xs font-bold text-slate-500">
                                    Akses Operasional
                                  </label>

                                  {currentRole === "ADMIN" ? (
                                    <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                                      FULL ACCESS
                                    </div>
                                  ) : (
                                    <select
                                      value={u.operational_access ?? "NONE"}
                                      disabled={anyUserActionBusy}
                                      onChange={(e) =>
                                        handleChangeOperationalAccess(
                                          u,
                                          e.target.value as OperationalAccess
                                        )
                                      }
                                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
                                    >
                                      <option value="NONE">NONE</option>
                                      <option value="FIELD">FIELD</option>
                                      <option value="PJA">PJA</option>
                                      <option value="ALL">ALL</option>
                                    </select>
                                  )}
                                </div>

                                <div className="text-[11px] font-semibold text-slate-500">
                                  Update terakhir:{" "}
                                  {formatDateLabel(u.updated_at)}
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    onClick={() => handleResetPassword(u)}
                                    disabled={anyUserActionBusy}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                                  >
                                    {rowBusy &&
                                    actionBusy?.startsWith("password") ? (
                                      <Spinner className="h-3.5 w-3.5" />
                                    ) : null}
                                    Reset Pass
                                  </button>

                                  <button
                                    onClick={() => handleToggleUser(u)}
                                    disabled={anyUserActionBusy}
                                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-white transition disabled:opacity-60 ${
                                      active
                                        ? "bg-red-600 hover:bg-red-500"
                                        : "bg-emerald-600 hover:bg-emerald-500"
                                    }`}
                                  >
                                    {rowBusy &&
                                    actionBusy?.startsWith("toggle") ? (
                                      <Spinner className="h-3.5 w-3.5" />
                                    ) : null}
                                    {active ? "Nonaktifkan" : "Aktifkan"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="hidden overflow-x-auto md:block">
                      <table className="min-w-full text-sm">
                        <thead className="bg-white">
                          <tr>
                            <th className="px-4 py-3 text-left font-bold text-slate-600">
                              Username
                            </th>
                            <th className="px-4 py-3 text-left font-bold text-slate-600">
                              Site
                            </th>
                            <th className="px-4 py-3 text-left font-bold text-slate-600">
                              Role Akun
                            </th>
                            <th className="px-4 py-3 text-left font-bold text-slate-600">
                              Akses Operasional
                            </th>
                            <th className="px-4 py-3 text-left font-bold text-slate-600">
                              Status
                            </th>
                            <th className="px-4 py-3 text-left font-bold text-slate-600">
                              Update
                            </th>
                            <th className="px-4 py-3 text-right font-bold text-slate-600">
                              Action
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {sortedUsers.map((u) => {
                            const active = u.is_active ?? true
                            const currentRole =
                              (u.role as AccountRole) === "ADMIN"
                                ? "ADMIN"
                                : "USER"
                            const rowBusy = actionBusy?.endsWith(`:${u.id}`)
                            const currentSite = getUserSite(u)

                            return (
                              <tr
                                key={u.id}
                                className="border-t border-slate-200 align-top"
                              >
                                <td className="px-4 py-3">
                                  <div className="font-semibold text-slate-800">
                                    {u.username}
                                  </div>
                                  <div className="mt-1 text-[11px] text-slate-500">
                                    Dibuat: {formatDateLabel(u.created_at)}
                                  </div>
                                </td>

                                <td className="px-4 py-3 text-slate-700">
                                  <select
                                    value={currentSite}
                                    disabled={anyUserActionBusy}
                                    onChange={(e) =>
                                      handleChangeSite(u, e.target.value as SiteCode)
                                    }
                                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
                                  >
                                    {SITE_OPTIONS.map((site) => (
                                      <option key={site.code} value={site.code}>
                                        {site.label}
                                      </option>
                                    ))}
                                  </select>
                                </td>

                                <td className="px-4 py-3 text-slate-700">
                                  <select
                                    value={currentRole}
                                    disabled={anyUserActionBusy}
                                    onChange={(e) =>
                                      handleChangeRole(
                                        u,
                                        e.target.value as AccountRole
                                      )
                                    }
                                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
                                  >
                                    <option value="USER">USER</option>
                                    <option value="ADMIN">ADMIN</option>
                                  </select>
                                </td>

                                <td className="px-4 py-3 text-slate-700">
                                  {currentRole === "ADMIN" ? (
                                    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                                      FULL ACCESS
                                    </span>
                                  ) : (
                                    <select
                                      value={u.operational_access ?? "NONE"}
                                      disabled={anyUserActionBusy}
                                      onChange={(e) =>
                                        handleChangeOperationalAccess(
                                          u,
                                          e.target.value as OperationalAccess
                                        )
                                      }
                                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
                                    >
                                      <option value="NONE">NONE</option>
                                      <option value="FIELD">FIELD</option>
                                      <option value="PJA">PJA</option>
                                      <option value="ALL">ALL</option>
                                    </select>
                                  )}
                                </td>

                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                                      active
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-red-50 text-red-700"
                                    }`}
                                  >
                                    {active ? "ACTIVE" : "INACTIVE"}
                                  </span>
                                </td>

                                <td className="px-4 py-3 text-[11px] text-slate-500">
                                  {formatDateLabel(u.updated_at)}
                                </td>

                                <td className="px-4 py-3">
                                  <div className="flex min-w-[240px] flex-wrap justify-end gap-2">
                                    <button
                                      onClick={() => handleResetPassword(u)}
                                      disabled={anyUserActionBusy}
                                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                                    >
                                      {rowBusy &&
                                      actionBusy?.startsWith("password") ? (
                                        <Spinner className="h-3.5 w-3.5" />
                                      ) : null}
                                      Reset Password
                                    </button>

                                    <button
                                      onClick={() => handleToggleUser(u)}
                                      disabled={anyUserActionBusy}
                                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-white transition disabled:opacity-60 ${
                                        active
                                          ? "bg-red-600 hover:bg-red-500"
                                          : "bg-emerald-600 hover:bg-emerald-500"
                                      }`}
                                    >
                                      {rowBusy &&
                                      actionBusy?.startsWith("toggle") ? (
                                        <Spinner className="h-3.5 w-3.5" />
                                      ) : null}
                                      {active ? "Nonaktifkan" : "Aktifkan"}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </section>

            <section className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-[0_18px_55px_rgba(15,23,42,0.08)] sm:p-6">
              <div className="mb-5">
                <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-700 sm:text-[11px]">
                  System & Database
                </div>

                <h2 className="mt-3 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                  Pantau & Reset Data
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Lihat isi database operasional dan lakukan reset data
                  seluruhnya atau berdasarkan range tanggal.
                </p>
              </div>

              {statsErr ? (
                <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {statsErr}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <StatCard
                  label="Inspections"
                  value={stats?.inspectionsCount}
                  loading={statsLoading && !stats}
                />

                <StatCard
                  label="Inspection Lines"
                  value={stats?.linesCount}
                  loading={statsLoading && !stats}
                />

                <StatCard
                  label="Measures"
                  value={stats?.measuresCount}
                  loading={statsLoading && !stats}
                />

                <StatCard
                  label="Photos"
                  value={stats?.photoCount}
                  helper={`Bucket: ${stats?.bucket ?? "-"}`}
                  loading={statsLoading && !stats}
                />
              </div>

              {statsLoading && stats ? (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500">
                  <Spinner className="h-3.5 w-3.5" />
                  Memperbarui statistik...
                </div>
              ) : null}

              <div className="mt-5 rounded-[24px] border border-red-200 bg-gradient-to-b from-red-50 to-white p-4 sm:p-5">
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-black tracking-tight text-red-700">
                    Danger Zone
                  </h3>

                  <p className="text-sm leading-6 text-slate-600">
                    Bisa hapus seluruh data atau filter berdasarkan range
                    tanggal. Jika tanggal dikosongkan, semua data operasional
                    dan semua file photo akan dihapus.
                  </p>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-800">
                      Tanggal mulai
                    </label>

                    <input
                      type="date"
                      value={resetStartDate}
                      onChange={(e) => setResetStartDate(e.target.value)}
                      className="w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-800">
                      Tanggal akhir
                    </label>

                    <input
                      type="date"
                      value={resetEndDate}
                      onChange={(e) => setResetEndDate(e.target.value)}
                      className="w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-1.5 block text-sm font-bold text-slate-800">
                    Ketik <span className="text-red-600">RESET</span> untuk
                    konfirmasi
                  </label>

                  <input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Ketik RESET"
                    className="w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-100"
                  />
                </div>

                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-[0_12px_30px_rgba(220,38,38,0.20)] transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resetting ? (
                    <>
                      <Spinner className="h-4 w-4" />
                      Memproses Reset...
                    </>
                  ) : (
                    "Reset Operasional + Hapus Photo"
                  )}
                </button>
              </div>
            </section>
          </div>
        </div>
      </AppLayout>
    </>
  )
}