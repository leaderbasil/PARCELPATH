// Browser-only showcase mode. These are public demo values, not production credentials.
// Set VITE_DEMO_LOGIN_ENABLED=false to hide the one-click demo button in a real deployment.
const rawEnabled = (import.meta.env["VITE_DEMO_LOGIN_ENABLED"] ?? "").trim().toLowerCase();
const demoEnabled = rawEnabled === "" || rawEnabled === "true";

const demoEmail = (import.meta.env["VITE_DEMO_ADMIN_EMAIL"] ?? "demo@parcelpath.local").trim();
const demoPassword = import.meta.env["VITE_DEMO_ADMIN_PASSWORD"] ?? "Demo12345";

const rawAutoEnabled = (import.meta.env["VITE_DEMO_AUTO_LOGIN_ENABLED"] ?? "").trim().toLowerCase();
const autoEnabled = rawAutoEnabled === "" || rawAutoEnabled === "true";

export const demoLoginEnabled = demoEnabled;
export const demoCredentials = demoEnabled
  ? { email: demoEmail, password: demoPassword }
  : null;
export const demoAutoLoginEnabled =
  demoEnabled && autoEnabled && import.meta.env.MODE !== "test";

/** Set after an explicit logout so returning visitors can choose a real account. */
export const DEMO_AUTO_LOGIN_DISABLED_KEY = "parcelpath.demo.autoLoginDisabled";
