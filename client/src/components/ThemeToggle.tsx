interface ThemeToggleProps {
  theme: string;
  toggleTheme: () => void;
}

const ThemeToggle = ({ theme, toggleTheme }: ThemeToggleProps) => {
  return (
    <button
      className="theme-toggle absolute top-4 right-4 text-2xl text-cyan-400 hover:text-fuchsia-500 transition-colors"
      onClick={toggleTheme}
      title="Toggle theme"
    >
      {theme === "dark" ? "🌙" : "☀️"}
    </button>
  );
};

export default ThemeToggle;
