export const COLORS = {
  primary: "#4A7BF7",
  primaryDark: "#2D5BE3",
  white: "#FFFFFF",
  black: "#000000",
  gray: "#6B7280",
  grayLight: "#F3F4F6",
  grayBorder: "#E5E7EB",
  red: "#EF4444",
  green: "#22C55E",
  orange: "#F97316",
  text: "#111827",
  textSecondary: "#6B7280",
  background: "#F9FAFB",
  cardBackground: "#FFFFFF",
  error: "#EF4444",
  success: "#22C55E",
  warning: "#F97316",
};

// API URL from environment variable or default to localhost
export const API_URL = "http://192.168.1.7:3000/api";

/**
 * Base URL for the OSM tile proxy served by the backend.
 * Use as: urlTemplate={`${TILE_URL}/{z}/{x}/{y}.png`}
 *
 * Routing tiles through the backend proxy ensures the User-Agent header
 * required by the OSM Tile Usage Policy is attached to every request.
 * https://operations.osmfoundation.org/policies/tiles/
 *
 * Assumes API_URL ends with "/api" (e.g. "http://host:3000/api").
 * The proxy is mounted at /tiles on the same host, so we strip the "/api"
 * suffix to get the root URL.
 */
export const TILE_URL = `${API_URL.replace(/\/api$/, "")}/tiles`;

export const STORAGE_KEYS = {
  TOKEN: "unistay_token",
  REFRESH_TOKEN: "unistay_refresh_token",
  USER: "unistay_user",
  ONBOARDING_DONE: "unistay_onboarding_done",
};

export const APP_VERSION = "2.4.0";
