import type * as THREE from "three";
import type { HUDState, GraphicsQuality } from "./types";

export interface UIActions {
  startNew(): void;
  continueGame(): void;
  resume(): void;
  save(): void;
  openMap(): void;
  openSettings(): void;
  closePanel(): void;
  mainMenu(): void;
  buyVehicle(kind: "compact" | "van"): void;
  buySnack(): void;
  setQuality(quality: GraphicsQuality): void;
  setVolume(volume: number): void;
}

const element = <T extends HTMLElement>(id: string): T => {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Required interface element #${id} is missing.`);
  return found as T;
};

export class UI {
  private readonly main = element<HTMLElement>("main-menu");
  private readonly hud = element<HTMLElement>("hud");
  private readonly pause = element<HTMLElement>("pause-screen");
  private readonly map = element<HTMLElement>("map-screen");
  private readonly settings = element<HTMLElement>("settings-screen");
  private readonly garage = element<HTMLElement>("garage-screen");
  private readonly shop = element<HTMLElement>("shop-screen");
  private readonly credits = element<HTMLElement>("credits-screen");
  private readonly toastNode = element<HTMLElement>("toast");
  private toastTimeout = 0;
  private menuHasSave = false;

  constructor(actions: UIActions) {
    this.bind("start-new", () => actions.startNew());
    this.bind("continue-game", () => actions.continueGame());
    this.bind("resume-game", () => actions.resume());
    this.bind("save-game", () => actions.save());
    this.bind("open-map", () => actions.openMap());
    this.bind("close-map", () => actions.closePanel());
    this.bind("pause-settings", () => actions.openSettings());
    this.bind("menu-settings", () => actions.openSettings());
    this.bind("close-settings", () => actions.closePanel());
    this.bind("settings-done", () => actions.closePanel());
    this.bind("back-to-menu", () => actions.mainMenu());
    this.bind("spawn-compact", () => actions.buyVehicle("compact"));
    this.bind("buy-van", () => actions.buyVehicle("van"));
    this.bind("close-garage", () => actions.closePanel());
    this.bind("buy-snack", () => actions.buySnack());
    this.bind("close-shop", () => actions.closePanel());
    this.bind("show-credits", () => this.showCredits());
    this.bind("close-credits", () => this.showMain(this.menuHasSave));

    element<HTMLSelectElement>("quality-select").addEventListener("change", (event) => {
      actions.setQuality((event.currentTarget as HTMLSelectElement).value as GraphicsQuality);
    });
    element<HTMLInputElement>("volume-select").addEventListener("input", (event) => {
      actions.setVolume(Number((event.currentTarget as HTMLInputElement).value));
    });
  }

  private bind(id: string, callback: () => void): void {
    element<HTMLButtonElement>(id).addEventListener("click", callback);
  }

  private hideAll(): void {
    [this.main, this.pause, this.map, this.settings, this.garage, this.shop, this.credits]
      .forEach((node) => node.classList.add("hidden"));
  }

  showMain(hasSave: boolean): void {
    this.menuHasSave = hasSave;
    this.hideAll();
    this.main.classList.remove("hidden");
    element<HTMLButtonElement>("continue-game").disabled = !hasSave;
    this.hud.classList.add("hidden");
  }

  showHUD(): void {
    this.hideAll();
    this.main.classList.add("hidden");
    this.hud.classList.remove("hidden");
  }

  showPause(): void {
    this.hideAll();
    this.hud.classList.remove("hidden");
    this.pause.classList.remove("hidden");
  }

  showMap(): void {
    this.hideAll();
    this.hud.classList.remove("hidden");
    this.map.classList.remove("hidden");
  }

  showSettings(quality: GraphicsQuality, volume: number): void {
    this.hideAll();
    this.hud.classList.remove("hidden");
    element<HTMLSelectElement>("quality-select").value = quality;
    element<HTMLInputElement>("volume-select").value = String(volume);
    this.settings.classList.remove("hidden");
  }

  showGarage(money: number, hasVan: boolean): void {
    this.hideAll();
    this.hud.classList.remove("hidden");
    element<HTMLButtonElement>("buy-van").textContent = hasVan ? "Spawn" : "Buy • $450";
    element<HTMLButtonElement>("buy-van").disabled = !hasVan && money < 450;
    this.garage.classList.remove("hidden");
  }

  showShop(money: number): void {
    this.hideAll();
    this.hud.classList.remove("hidden");
    element<HTMLButtonElement>("buy-snack").disabled = money < 30;
    this.shop.classList.remove("hidden");
  }

  showCredits(): void {
    this.hideAll();
    this.credits.classList.remove("hidden");
  }

  updateHUD(state: HUDState): void {
    element<HTMLElement>("money-value").textContent = `$${Math.floor(state.money).toLocaleString()}`;
    element<HTMLElement>("mission-title").textContent = state.missionTitle;
    element<HTMLElement>("mission-detail").textContent = state.missionDetail;
    element<HTMLElement>("mission-state").textContent = state.missionState;
    element<HTMLElement>("mission-reward").textContent = state.reward;
    element<HTMLElement>("energy-value").textContent = `${Math.round(state.stamina)}%`;
    element<HTMLElement>("energy-bar").style.width = `${state.stamina}%`;
    const prompt = element<HTMLElement>("interaction-prompt");
    prompt.textContent = state.prompt;
    prompt.classList.toggle("hidden", !state.prompt);
    const speed = element<HTMLElement>("vehicle-speed");
    speed.classList.toggle("hidden", state.speed === null);
    speed.innerHTML = state.speed === null ? "" : `${state.speed} <small>KM/H</small>`;
  }

  updateMap(world: { drawFullMap(ctx: CanvasRenderingContext2D, player: THREE.Vector3, objective: THREE.Vector3 | null): void }, player: THREE.Vector3, objective: THREE.Vector3 | null): void {
    const canvas = element<HTMLCanvasElement>("city-map");
    const context = canvas.getContext("2d");
    if (context) world.drawFullMap(context, player, objective);
  }

  updateMinimap(draw: (ctx: CanvasRenderingContext2D) => void): void {
    const canvas = element<HTMLCanvasElement>("minimap");
    const context = canvas.getContext("2d");
    if (context) draw(context);
  }

  toast(message: string): void {
    this.toastNode.textContent = message;
    this.toastNode.classList.remove("hidden");
    window.clearTimeout(this.toastTimeout);
    this.toastTimeout = window.setTimeout(() => this.toastNode.classList.add("hidden"), 2600);
  }
}
