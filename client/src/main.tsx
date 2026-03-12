import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      // When a new service worker takes over, reload to get fresh content
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
      });

      // Check for updates every time the app is opened
      reg.update();
    }).catch(() => {});
  });
}
