// Entrypoint: boot the hash router. Nothing else runs at load time;
// every view fetches its own data from make.fun's public API.
import { initRouter } from "./router.js";

window.__shotReady = false;
initRouter();
