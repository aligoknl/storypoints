module.exports = {
  content: ["./index.html", "./src/**/*.{vue,ts,js,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          teal: "#007A6A",
          tealMid: "#009488",
          tealLight: "#D8F2EE",
          yellow: "#FFD200",
          gray: "#4A4F54",
          grayLight: "#E5E7EB",
          white: "#FFFFFF",
          blackish: "#222222",
          black: "#000000",
        },
      },
      boxShadow: {
        card: "0 8px 24px rgba(0,0,0,.12)",
      },
      borderRadius: {
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};
