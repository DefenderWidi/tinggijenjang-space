/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        buma: {
          // Base
          green: "#22A745",
          blue: "#2FA4DC",
          orange: "#F59A2A",
          greenDark: "#15803D",     // emerald-700
          greenDarker: "#166534",  // emerald-800
          blueDark: "#0369A1",     // sky-700
          blueDarker: "#075985",  // sky-800
          orangeDark: "#C2410C",   // orange-700
          orangeDarker: "#9A3412", // orange-800
          // UI
          bg: "#F5F7FA",
          surface: "#FFFFFF",
          text: "#1F2937",
          muted: "#6B7280",
          border: "#E5E7EB",
        },
      },
      boxShadow: {
        soft: "0 10px 30px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
}

