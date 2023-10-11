/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "../../node_modules/flowbite-react/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ["Inter", "sans-serif"],
        inter: ["Poppins", "sans-serif"],
      },
      colors: {
        yellow1: "#FDBC00",
        yellow2: "#FFCA32",
        yellow3: "#FFD660",
        yellow4: "#FFDF83",
        yellow5: "#FFE9AA",
        blue1: "#03254C",
        blue2: "#1167B1",
        blue3: "#187BCD",
        blue4: "#2A9DF4",
        blue5: "#D0EFFF",
        base_black: "#1E2329",
        base_grey: "#BEC7D0",
        base_bg_grey: "#F1F1F4",
        base_bg_white: "#FFFFF",
        grayText: "#484848",
        danger1: "#DC3545",
        danger2: "#FF4530",
        danger3: "#A0AEC0",
        danger4: "#4A5568",
        success1: "#198754",
        success2: "#31BC53",
        success3: "#77CE8C",
        success4: "#8EDEA1",
        disable1: "#FF4530",
        disable2: "#E5E5E5",
        defaultbg: "#CFFAFE",
        darkbg: "#F3F4F6",
        failurebg: "#FDE8E8",
        successbg: "#DEF7EC",
        warningbg: "#FDF6B2",
        indigobg: "#E5EDFF",
        purplebg: "#EDEBFE",
        pinkbg: "#FCE8F3",
        defaultText: "#155E75",
        darkText: "#464E5A",
        failureText: "#B24D4D",
        successText: "#1E6854",
        warningText: "#79451B",
        indigoText: "#655FB2",
        purpleText: "#673ABE",
        pinkText: "#99154B",
      },
      letterSpacing: {
        tighter: "-0.1em",
        tight: "-0.05em",
        normal: "0",
        wide: "0.1em",
        wider: "0.2em",
        widest: "0.3em",
      },
      boxShadow: {
        "card-1": "0px 0px 5px 0px rgba(0, 0, 0, 0.3)",
        "3xl": "0px 0px 30px 0px rgba(0, 0, 0, 0.3)",
      },
      dropShadow: {
        "3xl": "0px 0px 30px 0px rgba(0, 0, 0, 0.3)",
      },
    },
  },

  plugins: [require("flowbite/plugin")],
};
