export const BASE_URL = __ENV.BFF_BASE_URL || "http://127.0.0.1:3000";
export const AUTH_HEADERS = {
  Authorization: "Bearer dev-token",
  "X-Tenant-Id": "tenant-demo",
};
