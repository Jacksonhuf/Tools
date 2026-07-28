import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL, AUTH_HEADERS } from "./lib/config.js";

export const options = {
  vus: Number(__ENV.K6_VUS || 50),
  duration: __ENV.K6_DURATION || "20s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<3000"],
  },
};

export default function pricingSimulate() {
  const res = http.post(
    `${BASE_URL}/api/v1/skus/demo-sku-001/pricing/simulate`,
    JSON.stringify({ explicit_price_mxn: 1599 }),
    {
      headers: {
        ...AUTH_HEADERS,
        "Content-Type": "application/json",
      },
    }
  );
  check(res, {
    "status is 200": (r) => r.status === 200,
  });
  sleep(0.1);
}
