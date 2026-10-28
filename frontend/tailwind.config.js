/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#9399A5",
        cream: {
          50: "#FCFAF6",
          100: "#FAF7F2",
          200: "#F4EFE6",
          300: "#EBE5D8",
          subtle: "#F5F2EB",
          border: "#ECE7DC",
          card: "#FFFFFF",
        },
        gold: {
          100: "#FFFBEB",
          200: "#FEF3C7",
          300: "#FDE68A",
          400: "#F5C842",
          500: "#EAB326",
          600: "#D19815",
          accent: "#F5C842",
        },
        charcoal: {
          900: "#111215",
          850: "#18191E",
          800: "#1C1D22",
          700: "#2B2D37",
          muted: "#6B7280",
          light: "#9CA3AF",
        },
        status: {
          successBg: "#DCFCE7",
          successText: "#15803D",
          warningBg: "#FEF3C7",
          warningText: "#92400E",
          errorBg: "#FEE2E2",
          errorText: "#B91C1C",
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'window': '0 25px 60px -15px rgba(0, 0, 0, 0.28), 0 10px 25px -10px rgba(0, 0, 0, 0.18)',
        'panel': '0 4px 20px -2px rgba(18, 19, 22, 0.04)',
        'soft': '0 2px 10px rgba(0, 0, 0, 0.03)',
        'glow-gold': '0 0 25px rgba(245, 200, 66, 0.25)',
      },
      borderRadius: {
        'window': '32px',
        'panel': '24px',
        'card': '18px',
      }
    },
  },
  plugins: [],
}
