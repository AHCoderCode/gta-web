import "./styles.css";
import { Game } from "./game/Game";

const errorPanel = document.querySelector<HTMLElement>("#fatal-error");
const errorMessage = document.querySelector<HTMLElement>("#fatal-message");
const reloadButton = document.querySelector<HTMLButtonElement>("#reload-game");

reloadButton?.addEventListener("click", () => window.location.reload());

try {
  const viewport = document.querySelector<HTMLElement>("#viewport");
  if (!viewport) throw new Error("The game viewport element is missing.");
  new Game(viewport);
} catch (error) {
  console.error("Port Meridian failed to initialize:", error);
  if (errorMessage) {
    errorMessage.textContent =
      error instanceof Error ? error.message : "An unexpected graphics error occurred.";
  }
  errorPanel?.classList.remove("hidden");
}
