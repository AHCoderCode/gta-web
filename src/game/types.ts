export type GraphicsQuality = "low" | "medium" | "high";

export interface GameSave {
  version: 1;
  savedAt: number;
  player: { x: number; z: number; yaw: number; stamina: number };
  vehicle: { x: number; z: number; yaw: number; kind: "compact" | "van" };
  inVehicle?: boolean;
  money: number;
  completedMissions: string[];
  ownedVehicles: string[];
  settings: { quality: GraphicsQuality; volume: number };
}

export interface HUDState {
  money: number;
  missionTitle: string;
  missionDetail: string;
  missionState: string;
  reward: string;
  stamina: number;
  prompt: string;
  speed: number | null;
}
