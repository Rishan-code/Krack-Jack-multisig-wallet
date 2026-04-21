import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Web3Provider } from "./context/Web3Context";
import { ToastProvider } from "./components/Toast";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Web3Provider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </Web3Provider>
  </StrictMode>
);
