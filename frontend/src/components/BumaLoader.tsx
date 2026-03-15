export default function BumaLoader() {
  return (
    <div className="flex w-full max-w-[320px] flex-col items-center justify-center gap-3 text-center sm:max-w-[360px] sm:gap-4">
      <div className="relative flex items-center justify-center">
        {/* Outer Ring */}
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-transparent border-t-buma-green border-r-buma-green/40 sm:h-20 sm:w-20" />

        {/* Inner Ring (reverse direction) */}
        <div className="absolute h-11 w-11 animate-[spin_1.2s_linear_reverse_infinite] rounded-full border-4 border-transparent border-t-buma-blue border-l-buma-blue/40 sm:h-14 sm:w-14" />
      </div>

      <div className="text-sm font-extrabold tracking-wide text-buma-text sm:text-[15px]">
        Memproses..
      </div>

      <div className="text-xs leading-relaxed text-buma-muted sm:text-sm">
        Mohon tunggu. Sistem sedang memproses unggahan dan pencatatan hasil.
      </div>
    </div>
  )
}