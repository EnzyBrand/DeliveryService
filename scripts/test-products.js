import { stopSuiteRequest } from "./lib/stopsuite-sync.js";

(async () => {
  try {
    const res = await stopSuiteRequest("GET", "/shop-products/");
    console.log("🧾 Product list:", res);
  } catch (err) {
    console.error("💥 Error fetching products:", err);
  }
})();
