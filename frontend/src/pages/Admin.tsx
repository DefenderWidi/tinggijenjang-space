import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import AppLayout from "../layouts/AppLayout"
import AdminTopbar from "../components/AdminTopbar"

const API_BASE = import.meta.env.VITE_API_BASE_URL || ""
const LS_KEY = "mt_session_v1"

type ActiveRole = "FIELD" | "PJA" | "EVALUATOR"
type AccountRole = "USER" | "ADMIN"
type OperationalAccess = "NONE" | "FIELD" | "PJA"

type SessionData = {
  id?: string | null
  username?: string
  accountRole?: AccountRole
  operationalAccess?: OperationalAccess
  activeRole?: ActiveRole | null
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

export default function Admin() {
  const nav = useNavigate()

  const session = useMemo(() => getSession(), [])
  const username = session?.username || ""
  const accountRole = session?.accountRole
  const isAdminAccount = accountRole === "ADMIN"

  const [pageLoading, setPageLoading] = useState(true)

  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])

  const [newUsername, setNewUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newRole, setNewRole] = useState<AccountRole>("USER")
  const [newOperationalAccess, setNewOperationalAccess] =
    useState<OperationalAccess>("NONE")

  const [err, setErr] = useState("")
  const [msg, setMsg] = useState("")
  const [busy, setBusy] = useState(false)

  const [confirmText, setConfirmText] = useState("")
  const [resetStartDate, setResetStartDate] = useState("")
  const [resetEndDate, setResetEndDate] = useState("")

  async function loadStats() {
    const res = await fetch(`${API_BASE}/api/admin/stats`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || "Gagal mengambil statistik")
    setStats(data)
  }

  async function loadUsers() {
    const res = await fetch(`${API_BASE}/api/admin/users`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || "Gagal mengambil user")
    setUsers(data?.data || [])
  }

  async function initAdminPage() {
    if (!username) {
      nav("/", { replace: true })
      return
    }

    if (!isAdminAccount) {
      nav("/select-role", { replace: true })
      return
    }

    try {
      setErr("")
      await Promise.all([loadStats(), loadUsers()])
    } catch (e: any) {
      setErr(
        e?.message ||
          "Akses admin tidak valid atau data admin gagal dimuat. Silakan login ulang."
      )
    } finally {
      setPageLoading(false)
    }
  }

  useEffect(() => {
    initAdminPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleRefreshAll() {
    setErr("")
    setMsg("")
    setBusy(true)

    try {
      await Promise.all([loadStats(), loadUsers()])
      setMsg("Data admin diperbarui")
    } catch (e: any) {
      setErr(e?.message || "Gagal memperbarui data")
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateUser() {
    if (!newUsername.trim() || !newPassword.trim() || !newRole.trim()) {
      setErr("Username, password, dan role wajib diisi")
      return
    }

    setErr("")
    setMsg("")
    setBusy(true)

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
            newRole === "ADMIN" ? "NONE" : newOperationalAccess,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Gagal menambah user")

      setMsg("User berhasil dibuat")
      setNewUsername("")
      setNewPassword("")
      setNewRole("USER")
      setNewOperationalAccess("NONE")
      await loadUsers()
    } catch (e: any) {
      setErr(e?.message || "Gagal membuat user")
    } finally {
      setBusy(false)
    }
  }

  async function handleUpdateUser(
    user: UserRow,
    patch: Partial<{
      role: AccountRole
      operational_access: OperationalAccess
      is_active: boolean
      password: string
    }>,
    successMessage?: string
  ) {
    setErr("")
    setMsg("")
    setBusy(true)

    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(patch),
      })

      const result = await res.json()

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
      setBusy(false)
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
      `User ${user.username} berhasil diperbarui`
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
      `Password user ${user.username} berhasil direset`
    )
  }

  async function handleChangeRole(user: UserRow, nextRole: AccountRole) {
    const currentRole = (user.role as AccountRole) || "USER"
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
        operational_access: nextRole === "ADMIN" ? "NONE" : user.operational_access ?? "NONE",
      },
      `Role ${user.username} berhasil diubah menjadi ${roleLabel}`
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
      `Akses ${user.username} berhasil diperbarui`
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
        ? `\n\nRange tanggal:\n${resetStartDate || "(awal)"} s/d ${resetEndDate || "(akhir)"}`
        : "\n\nSemua data akan dihapus."

    const ok = window.confirm(
      `Yakin ingin reset data operasional dan menghapus photo?${dateText}`
    )
    if (!ok) return

    setErr("")
    setMsg("")
    setBusy(true)

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

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Reset gagal")

      setMsg(data?.message || "Reset berhasil")
      setConfirmText("")
      await Promise.all([loadStats(), loadUsers()])
    } catch (e: any) {
      setErr(e?.message || "Reset gagal")
    } finally {
      setBusy(false)
    }
  }

  if (pageLoading) {
    return (
      <AppLayout hideTopbar>
        <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
          <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-8 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
            <div className="text-sm font-semibold text-slate-700">
              Loading admin workspace...
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!username || !isAdminAccount) return null

  return (
    <>
      <AdminTopbar />
      <AppLayout hideTopbar>
        <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-emerald-50/50 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">
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

              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
                Admin Panel
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Kelola user sistem, pantau isi database, dan lakukan reset
                operasional dari satu dashboard yang rapi.
              </p>

              <div className="mt-3 text-xs font-semibold text-slate-500">
                Login sebagai: <span className="text-slate-800">{username}</span>
              </div>
            </div>

            <button
              onClick={handleRefreshAll}
              disabled={busy}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Refresh Semua Data
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
            <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] sm:p-6">
              <div className="mb-5">
                <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-sky-700">
                  User Access Management
                </div>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
                  Kelola Akses User
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Tambah user baru, ubah role user/admin, atur akses operasional,
                  aktif-nonaktifkan akun, dan reset password bila diperlukan.
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

                  <div className="grid gap-3 sm:grid-cols-3">
                    <select
                      value={newRole}
                      onChange={(e) => {
                        const value = e.target.value as AccountRole
                        setNewRole(value)
                        if (value === "ADMIN") {
                          setNewOperationalAccess("NONE")
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
                    </select>

                    <button
                      onClick={handleCreateUser}
                      disabled={busy}
                      className="rounded-2xl bg-gradient-to-r from-[#15803D] to-[#22A745] px-4 py-3 font-extrabold text-white shadow-[0_12px_30px_rgba(5,150,105,0.20)] transition hover:from-[#166534] hover:to-[#16A34A] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Tambah User
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-sm font-bold text-slate-800">
                    Daftar User
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Total user: {users.length}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-white">
                      <tr>
                        <th className="px-4 py-3 text-left font-bold text-slate-600">
                          Username
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
                      {users.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-8 text-center text-sm text-slate-500"
                          >
                            Belum ada user.
                          </td>
                        </tr>
                      ) : (
                        users.map((u) => {
                          const active = u.is_active ?? true
                          const currentRole =
                            (u.role as AccountRole) === "ADMIN"
                              ? "ADMIN"
                              : "USER"

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
                                  value={currentRole}
                                  disabled={busy}
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
                                    disabled={busy}
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
                                    disabled={busy}
                                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                                  >
                                    Reset Password
                                  </button>

                                  <button
                                    onClick={() => handleToggleUser(u)}
                                    disabled={busy}
                                    className={`rounded-xl px-3 py-2 text-xs font-bold text-white transition disabled:opacity-60 ${
                                      active
                                        ? "bg-red-600 hover:bg-red-500"
                                        : "bg-emerald-600 hover:bg-emerald-500"
                                    }`}
                                  >
                                    {active ? "Nonaktifkan" : "Aktifkan"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] sm:p-6">
              <div className="mb-5">
                <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">
                  System & Database
                </div>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
                  Pantau & Reset Data
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Lihat isi database operasional dan lakukan reset data seluruhnya
                  atau berdasarkan range tanggal.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-5 shadow-sm">
                  <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">
                    Inspections
                  </div>
                  <div className="mt-3 text-3xl font-black text-slate-900">
                    {stats?.inspectionsCount ?? 0}
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-5 shadow-sm">
                  <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">
                    Inspection Lines
                  </div>
                  <div className="mt-3 text-3xl font-black text-slate-900">
                    {stats?.linesCount ?? 0}
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-5 shadow-sm">
                  <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">
                    Measures
                  </div>
                  <div className="mt-3 text-3xl font-black text-slate-900">
                    {stats?.measuresCount ?? 0}
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-5 shadow-sm">
                  <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">
                    Photos
                  </div>
                  <div className="mt-3 text-3xl font-black text-slate-900">
                    {stats?.photoCount ?? 0}
                  </div>
                  <div className="mt-2 break-all text-xs font-semibold text-slate-500">
                    Bucket: {stats?.bucket ?? "-"}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-[24px] border border-red-200 bg-gradient-to-b from-red-50 to-white p-5">
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-black tracking-tight text-red-700">
                    Danger Zone
                  </h3>
                  <p className="text-sm leading-6 text-slate-600">
                    Bisa hapus seluruh data atau filter berdasarkan range tanggal.
                    Jika tanggal dikosongkan, semua data operasional dan semua
                    file photo akan dihapus.
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
                  disabled={busy}
                  className="mt-4 w-full rounded-2xl bg-red-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-[0_12px_30px_rgba(220,38,38,0.20)] transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy
                    ? "Memproses..."
                    : "Reset Operasional + Hapus Photo"}
                </button>
              </div>
            </section>
          </div>
        </div>
      </AppLayout>
    </>
  )
}