export const getInitialTheme = (): string => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("theme") || "dark";
  }
  return "dark";
};
