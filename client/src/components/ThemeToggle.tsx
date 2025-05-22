import { useTheme } from "../helpers/ThemeContext";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      className={`theme-toggle absolute top-4 right-4 text-2xl p-2 rounded-full shadow-lg hover:bg-blue-200/80 hover:dark:bg-pink-400/80 hover:text-white transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-200/40 dark:focus:ring-pink-400/40 animate-glow`}
      onClick={toggleTheme}
      title="Toggle theme"
      aria-label="Toggle theme"
      style={{
        boxShadow: "0 4px 12px rgba(31, 38, 135, 0.15)",
        backdropFilter: "blur(8px)",
      }}
    >
      <span style={{ pointerEvents: "none" }}>
        {theme === "dark" ? "🌙" : "☀️"}
      </span>
    </button>
  );
};

export default ThemeToggle;
