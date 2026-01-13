/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      animation: {
        "loader-rotate": "loaderRotate 6s linear infinite",
        "spin-slow": "spin 2.5s linear infinite",
        "spin-reverse": "spinReverse 3s linear infinite",
        fade: "fade 1.6s ease-in-out infinite",
      },
      keyframes: {
        loaderRotate: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        spinReverse: {
          from: { transform: "rotate(360deg)" },
          to: { transform: "rotate(0deg)" },
        },
        fade: {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
