import type { GameSave, GraphicsQuality } from "./types";

const SAVE_KEY = "port-meridian.save.v1";
const SETTINGS_KEY = "port-meridian.settings.v1";

const finite = (value: unknown, fallback: number, min: number, max: number): number =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;

export class Persistence {
  static load(): GameSave | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const value: unknown = JSON.parse(raw);
      if (!value || typeof value !== "object") return null;
      const data = value as Partial<GameSave>;
      if (data.version !== 1 || !data.player || !data.vehicle || !Array.isArray(data.ownedVehicles)) return null;
      const quality = data.settings?.quality;
      const safeQuality: GraphicsQuality =
        quality === "low" || quality === "high" ? quality : "medium";
      return {
        version: 1,
        savedAt: finite(data.savedAt, Date.now(), 0, Number.MAX_SAFE_INTEGER),
        player: {
          x: finite(data.player.x, -12, -158, 158),
          z: finite(data.player.z, 10, -158, 158),
          yaw: finite(data.player.yaw, 0, -1000, 1000),
          stamina: finite(data.player.stamina, 100, 0, 100)
        },
        vehicle: {
          x: finite(data.vehicle.x, -12, -158, 158),
          z: finite(data.vehicle.z, 2, -158, 158),
          yaw: finite(data.vehicle.yaw, 0, -1000, 1000),
          kind: data.vehicle.kind === "van" ? "van" : "compact"
        },
        money: finite(data.money, 500, 0, 999999),
        completedMissions: Array.isArray(data.completedMissions)
          ? data.completedMissions.filter((item): item is string => typeof item === "string").slice(0, 100)
          : [],
        ownedVehicles: data.ownedVehicles
          .filter((item): item is string => item === "compact" || item === "van")
          .slice(0, 10),
        settings: { quality: safeQuality, volume: finite(data.settings?.volume, 65, 0, 100) }
      };
    } catch (error) {
      console.warn("Save data could not be read; starting safely without it.", error);
      return null;
    }
  }

  static save(data: GameSave): boolean {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
      return true;
    } catch (error) {
      console.error("Progress could not be saved.", error);
      return false;
    }
  }

  static hasSave(): boolean {
    return this.load() !== null;
  }

  static clear(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (error) {
      console.warn("Could not clear the local save.", error);
    }
  }
}
