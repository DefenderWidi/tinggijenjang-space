import { useEffect, useState } from "react"
import AppLayout from "../layouts/AppLayout"
import AdminTopbar from "../components/AdminTopbar"

const API_BASE = import.meta.env.VITE_API_BASE_URL || ""

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
  role: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export default function Admin() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])

  const [newUsername, setNewUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newRole, setNewRole] = useState("USER")

  const [err, setErr] = useState("")
  const [msg, setMsg] = useState("")
  const [busy, setBusy] = useState(false)

  const [confirmText, setConfirmText] = useState("")

  async function checkAdmin() {
    try {
      const res = await fetch(`${API_BASE}/api/admin/me`, {
        method: "GET",
        credentials: "include",
      })

      const data = await res.json()
      setIsAdmin(!!data?.isAdmin)

      if (data?.isAdmin) {
        await Promise.all([loadStats(), loadUsers()])
      }
    } catch {
      setIsAdmin(false)
    } finally {
      setLoading(false)
    }
  }

  async function loadStats() {
    const res = await fetch(`${API_BASE}/api/admin/stats`, {
      method: "GET",
      credentials: "include",
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || "Gagal mengambil statistik")
    setStats(data)
  }

  async function loadUsers() {
    const res = await fetch(`${API_BASE}/api/admin/users`, {
      method: "GET",
      credentials: "include",
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || "Gagal mengambil user")

    setUsers(data?.data || [])
  }

  useEffect(() => {
    checkAdmin()
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErr("")
    setMsg("")
    setBusy(true)

    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Login admin gagal")

      setIsAdmin(true)
      setPassword("")
      setMsg("Login admin berhasil")
      await Promise.all([loadStats(), loadUsers()])
    } catch (e: any) {
      setErr(e?.message || "Login admin gagal")
    } finally {
      setBusy(false)
    }
  }

  async function handleRefreshStats() {
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
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Gagal menambah user")

      setMsg("User berhasil dibuat")
      setNewUsername("")
      setNewPassword("")
      setNewRole("USER")
      await loadUsers()
    } catch (e: any) {
      setErr(e?.message || "Gagal membuat user")
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
        body: JSON.stringify({
          is_active: !(user.is_active ?? true),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Gagal mengubah status user")

      setMsg(`User ${user.username} berhasil diperbarui`)
      await loadUsers()
    } catch (e: any) {
      setErr(e?.message || "Gagal mengubah status user")
    } finally {
      setBusy(false)
    }
  }

  async function handleResetPassword(user: UserRow) {
    const newPass = window.prompt(
      `Masukkan password baru untuk ${user.username}`
    )
    if (!newPass) return

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
        body: JSON.stringify({
          password: newPass,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Gagal reset password")

      setMsg(`Password user ${user.username} berhasil direset`)
      await loadUsers()
    } catch (e: any) {
      setErr(e?.message || "Gagal reset password")
    } finally {
      setBusy(false)
    }
  }

  async function handleReset() {
    if (confirmText !== "RESET") {
      setErr("Ketik RESET terlebih dahulu")
      return
    }

    const ok = window.confirm(
      "Yakin ingin reset data operasional dan menghapus semua photo di bucket?"
    )
    if (!ok) return

    setErr("")
    setMsg("")
    setBusy(true)

    try {
      const res = await fetch(`${API_BASE}/api/admin/reset-operational`, {
        method: "POST",
        credentials: "include",
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Reset gagal")

      setMsg(data?.message || "Reset berhasil")
      setConfirmText("")
      await loadStats()
    } catch (e: any) {
      setErr(e?.message || "Reset gagal")
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <AppLayout hideTopbar>
        <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
          <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-8 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
            <div className="text-sm font-semibold text-slate-700">
              Loading admin...
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!isAdmin) {
    return (
      <AppLayout hideTopbar>
        <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
          <div className="rounded-[32px] border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-emerald-50/60 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:p-6">
            <div className="mx-auto flex min-h-[calc(100vh-210px)] items-center justify-center">
              <div className="w-full max-w-md rounded-[30px] border border-slate-200 bg-white px-6 py-6 shadow-[0_16px_50px_rgba(15,23,42,0.10)]">
                <div className="mb-6">
                  <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">
                    Admin Access
                  </div>

                  <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">
                    Admin Login
                  </h1>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Halaman ini hanya untuk admin internal sistem Monitoring
                    Tinggi Jenjang.
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-800">
                      Username
                    </label>
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      placeholder="Masukkan username admin"
                      className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-800">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      placeholder="Masukkan password admin"
                      className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>

                  {err ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                      {err}
                    </div>
                  ) : null}

                  {msg ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                      {msg}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-2xl bg-gradient-to-r from-[#15803D] to-[#22A745] px-4 py-3.5 text-base font-extrabold text-white shadow-[0_12px_30px_rgba(5,150,105,0.25)] transition hover:from-[#166534] hover:to-[#16A34A] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? "Memproses..." : "Masuk Admin"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <>
      <AdminTopbar />
      <AppLayout hideTopbar>
        <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
          <div className="rounded-[32px] border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-emerald-50/50 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:p-6">
            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] sm:p-6">
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">
                    System Control
                  </div>

                  <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
                    Admin Panel
                  </h1>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Kontrol operasional internal untuk monitoring data, storage,
                    user, dan reset sistem.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleRefreshStats}
                    disabled={busy}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    Refresh
                  </button>
                </div>
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

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                  <div className="mt-2 text-xs font-semibold text-slate-500">
                    Bucket: {stats?.bucket ?? "-"}
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-2">
                  <h2 className="text-xl font-black tracking-tight text-slate-900">
                    User Management
                  </h2>
                  <p className="text-sm leading-6 text-slate-600">
                    Tambah user baru, lihat daftar user, nonaktifkan user, dan
                    reset password.
                  </p>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-4">
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
                    placeholder="Password awal"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />

                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>

                  <button
                    onClick={handleCreateUser}
                    disabled={busy}
                    className="rounded-2xl bg-gradient-to-r from-[#15803D] to-[#22A745] px-4 py-3 font-extrabold text-white shadow-[0_12px_30px_rgba(5,150,105,0.20)] transition hover:from-[#166534] hover:to-[#16A34A] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Tambah User
                  </button>
                </div>

                <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-bold text-slate-600">
                            Username
                          </th>
                          <th className="px-4 py-3 text-left font-bold text-slate-600">
                            Role
                          </th>
                          <th className="px-4 py-3 text-left font-bold text-slate-600">
                            Status
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
                              colSpan={4}
                              className="px-4 py-6 text-center text-sm text-slate-500"
                            >
                              Belum ada user.
                            </td>
                          </tr>
                        ) : (
                          users.map((u) => {
                            const active = u.is_active ?? true

                            return (
                              <tr
                                key={u.id}
                                className="border-t border-slate-200"
                              >
                                <td className="px-4 py-3 font-semibold text-slate-800">
                                  {u.username}
                                </td>
                                <td className="px-4 py-3 text-slate-700">
                                  {u.role}
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
                                <td className="px-4 py-3">
                                  <div className="flex flex-wrap justify-end gap-2">
                                    <button
                                      onClick={() => handleResetPassword(u)}
                                      disabled={busy}
                                      className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                                    >
                                      Reset Password
                                    </button>

                                    <button
                                      onClick={() => handleToggleUser(u)}
                                      disabled={busy}
                                      className={`rounded-xl px-3 py-1.5 text-xs font-bold text-white transition disabled:opacity-60 ${
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
              </div>

              <div className="mt-6 rounded-[28px] border border-red-200 bg-gradient-to-b from-red-50 to-white p-6">
                <div className="flex flex-col gap-2">
                  <h2 className="text-xl font-black tracking-tight text-red-700">
                    Danger Zone
                  </h2>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600">
                    Aksi ini akan menghapus seluruh data operasional dan semua
                    file photo pada bucket storage. Pastikan data penting sudah
                    dibackup sebelum melanjutkan.
                  </p>
                </div>

                <div className="mt-5 max-w-md">
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
                  className="mt-4 rounded-2xl bg-red-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-[0_12px_30px_rgba(220,38,38,0.20)] transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? "Memproses..." : "Reset Operasional + Hapus Photo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </>
  )
}