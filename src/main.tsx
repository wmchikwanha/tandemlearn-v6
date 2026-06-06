import { createRoot } from "react-dom/client";
import { TourProvider } from "@/contexts/TourContext";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <TourProvider>
    <App />
  </TourProvider>
);
