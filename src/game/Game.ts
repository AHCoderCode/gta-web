import * as THREE from "three";
import { WorldActors as Agents } from "./Agents";
import { AudioSystem } from "./Audio";
import { Input } from "./Input";
import { MissionSystem } from "./MissionSystem";
import { Persistence } from "./Persistence";
import { Player } from "./Player";
import { UI } from "./UI";
import { Vehicle, type VehicleKind } from "./Vehicle";
import { World } from "./World";
import type { GameSave, GraphicsQuality } from "./types";

type GameMode = "menu" | "playing" | "paused" | "map" | "settings" | "garage" | "shop";

export class Game {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(62, 1, 0.1, 520);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly input: Input;
  private readonly world: World;
  private readonly player: Player;
  private readonly vehicle: Vehicle;
  private readonly agents: Agents;
  private readonly missions: MissionSystem;
  private readonly audio = new AudioSystem();
  private readonly ui: UI;
  private mode: GameMode = "menu";
  private modeBeforeSettings: GameMode = "menu";
  private modeBeforeMap: GameMode = "playing";
  private money = 500;
  private quality: GraphicsQuality = "medium";
  private volume = 65;
  private ownedVehicles = new Set<string>(["compact"]);
  private inVehicle = false;
  private lastTime = 0;
  private hudTimer = 0;
  private animationFrame = 0;

  constructor(viewport: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: "low-power"
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    viewport.appendChild(this.renderer.domElement);

    this.input = new Input(this.renderer.domElement);
    this.world = new World(this.scene);
    this.player = new Player(this.scene, this.world);
    this.vehicle = new Vehicle(this.scene, this.world);
    this.agents = new Agents(this.scene);
    this.missions = new MissionSystem(this.scene, this.world);

    this.ui = new UI({
      startNew: () => this.startNew(),
      continueGame: () => this.continueGame(),
      resume: () => this.resume(),
      save: () => this.save(),
      openMap: () => this.openMap(),
      openSettings: () => this.openSettings(),
      closePanel: () => this.closePanel(),
      mainMenu: () => this.returnToMenu(),
      buyVehicle: (kind) => this.buyVehicle(kind),
      buySnack: () => this.buySnack(),
      setQuality: (quality) => this.setQuality(quality),
      setVolume: (volume) => this.setVolume(volume)
    });

    this.renderer.domElement.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      this.ui.toast("Graphics context paused. Reload the page if it does not recover.");
    });
    window.addEventListener("resize", this.resize);
    this.setQuality(this.quality);
    this.setVolume(this.volume);
    this.ui.showMain(Persistence.hasSave());
    this.animationFrame = requestAnimationFrame(this.frame);
  }

  private resize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private frame = (time: number): void => {
    const dt = this.lastTime === 0 ? 0 : Math.min((time - this.lastTime) / 1000, 0.04);
    this.lastTime = time;

    if (this.mode === "playing") this.update(dt);
    else if (this.mode === "paused" && this.input.consume("Escape")) this.resume();
    else if ((this.mode === "map" || this.mode === "garage" || this.mode === "shop" || this.mode === "settings") && this.input.consume("Escape")) this.closePanel();
    this.renderer.render(this.scene, this.camera);
    this.animationFrame = requestAnimationFrame(this.frame);
  };

  private update(dt: number): void {
    if (this.input.consume("Escape")) {
      this.pause();
      return;
    }
    if (this.input.consume("KeyM")) {
      this.openMap();
      return;
    }
    if (this.input.consume("KeyE")) this.interact();

    if (this.inVehicle) {
      this.vehicle.update(dt, this.input);
      this.cameraFollowVehicle(dt);
    } else {
      this.player.update(dt, this.input);
      this.player.updateCamera(this.camera, dt);
    }

    this.agents.update(dt);
    this.missions.update(dt);
    this.hudTimer += dt;
    if (this.hudTimer > 0.1) {
      this.hudTimer = 0;
      this.updateHUD();
    }
  }

  private cameraFollowVehicle(dt: number): void {
    const direction = new THREE.Vector3(Math.sin(this.vehicle.yaw), 0, Math.cos(this.vehicle.yaw));
    const target = this.vehicle.group.position.clone().add(new THREE.Vector3(0, 1.2, 0));
    const desired = target.clone().addScaledVector(direction, -10).add(new THREE.Vector3(0, 4.3, 0));
    this.camera.position.lerp(desired, 1 - Math.exp(-5.5 * dt));
    this.camera.lookAt(target);
  }

  private startNew(): void {
    this.money = 500;
    this.ownedVehicles = new Set(["compact"]);
    this.player.reset();
    this.vehicle.reset();
    this.missions.reset();
    this.inVehicle = false;
    this.player.setVisible(true);
    this.vehicle.group.visible = true;
    this.mode = "playing";
    this.ui.showHUD();
    this.audio.playTone(560, 0.12);
    this.ui.toast("Welcome to Port Meridian. Explore the city or visit the garage.");
    this.updateHUD();
  }

  private continueGame(): void {
    const data = Persistence.load();
    if (!data) {
      this.ui.toast("No valid save was found. Starting a new journey.");
      this.startNew();
      return;
    }
    this.player.setPosition(data.player.x, data.player.z, data.player.yaw, data.player.stamina);
    this.vehicle.setPosition(data.vehicle.x, data.vehicle.z, data.vehicle.yaw, data.vehicle.kind);
    this.money = data.money;
    this.ownedVehicles = new Set(data.ownedVehicles);
    this.quality = data.settings.quality;
    this.volume = data.settings.volume;
    this.missions.restoreCompleted(data.completedMissions.includes("harbor-delivery"));
    this.inVehicle = false;
    this.player.setVisible(true);
    this.vehicle.group.visible = true;
    this.setQuality(this.quality);
    this.setVolume(this.volume);
    this.mode = "playing";
    this.ui.showHUD();
    this.ui.toast("Journey restored.");
    this.updateHUD();
  }

  private pause(): void {
    if (this.mode !== "playing") return;
    this.mode = "paused";
    document.exitPointerLock?.();
    this.ui.showPause();
  }

  private resume(): void {
    if (this.mode === "menu") return;
    this.mode = "playing";
    this.ui.showHUD();
    this.audio.playTone(430, 0.06);
  }

  private openMap(): void {
    if (this.mode !== "playing" && this.mode !== "paused") return;
    this.modeBeforeMap = this.mode;
    this.mode = "map";
    this.updateMap();
    this.ui.showMap();
  }

  private openSettings(): void {
    this.modeBeforeSettings = this.mode;
    this.mode = "settings";
    this.ui.showSettings(this.quality, this.volume);
  }

  private closePanel(): void {
    if (this.mode === "settings" && this.modeBeforeSettings === "menu") {
      this.mode = "menu";
      this.ui.showMain(Persistence.hasSave());
      return;
    }
    if (this.mode === "settings" || this.mode === "map" || this.mode === "garage" || this.mode === "shop") {
      this.mode = this.mode === "settings" ? (this.modeBeforeSettings === "paused" ? "paused" : "playing") : (this.mode === "map" ? this.modeBeforeMap : "playing");
      if (this.mode === "paused") this.ui.showPause();
      else this.ui.showHUD();
    }
  }

  private returnToMenu(): void {
    this.save();
    this.mode = "menu";
    this.inVehicle = false;
    this.player.setVisible(true);
    document.exitPointerLock?.();
    this.ui.showMain(Persistence.hasSave());
  }

  private interact(): void {
    if (this.inVehicle) {
      this.inVehicle = false;
      const position = this.vehicle.group.position.clone();
      position.x += Math.cos(this.vehicle.yaw) * 2.2;
      position.z -= Math.sin(this.vehicle.yaw) * 2.2;
      this.world.resolveCircle(position, 0.8);
      this.player.setPosition(position.x, position.z, this.vehicle.yaw, this.player.stamina);
      this.player.setVisible(true);
      this.ui.toast("You left the vehicle.");
      return;
    }

    if (this.player.position.distanceTo(this.vehicle.group.position) < 4.1 && this.vehicle.group.visible) {
      this.inVehicle = true;
      this.player.setVisible(false);
      this.vehicle.speed = 0;
      this.audio.playTone(350, 0.07);
      return;
    }

    const missionResult = this.missions.interact(this.player.position);
    if (missionResult.action === "started") {
      this.audio.playTone(620, 0.11);
      this.ui.toast("Delivery accepted. Follow the orange marker to the harbour.");
      this.updateHUD();
      return;
    }
    if (missionResult.action === "completed") {
      this.money += missionResult.reward;
      this.audio.playTone(780, 0.2);
      this.ui.toast(`Delivery completed. You earned $${missionResult.reward}.`);
      this.save();
      this.updateHUD();
      return;
    }

    if (this.player.position.distanceTo(this.world.garage) < 9) {
      this.mode = "garage";
      this.ui.showGarage(this.money, this.ownedVehicles.has("van"));
      return;
    }
    if (this.player.position.distanceTo(this.world.market) < 10) {
      this.mode = "shop";
      this.ui.showShop(this.money);
    }
  }

  private promptText(): string {
    if (this.inVehicle) return "E  •  Exit vehicle";
    if (this.player.position.distanceTo(this.vehicle.group.position) < 4.1) return "E  •  Enter vehicle";
    if (this.missions.canInteract(this.player.position)) {
      return this.missions.completed ? "" : "E  •  " + (this.missions.status === "AVAILABLE" ? "Accept delivery" : "Complete delivery");
    }
    if (this.player.position.distanceTo(this.world.garage) < 9) return "E  •  Open garage";
    if (this.player.position.distanceTo(this.world.market) < 10) return "E  •  Visit market";
    return "";
  }

  private updateHUD(): void {
    const objective = this.missions.objective;
    const activePosition = this.inVehicle ? this.vehicle.group.position : this.player.position;
    this.ui.updateHUD({
      money: this.money,
      missionTitle: this.missions.completed ? "City is yours to explore" : this.missions.title,
      missionDetail: this.missions.completed ? "The harbour route is complete. Explore, shop, drive and save your progress." : this.missions.detail,
      missionState: this.missions.status,
      reward: this.missions.rewardText,
      stamina: this.player.stamina,
      prompt: this.promptText(),
      speed: this.inVehicle ? this.vehicle.speedKmh : null
    });
    this.ui.updateMinimap((ctx) => this.world.drawMinimap(ctx, activePosition, this.inVehicle ? this.vehicle.yaw : this.player.cameraYaw, objective));
  }

  private updateMap(): void {
    const position = this.inVehicle ? this.vehicle.group.position : this.player.position;
    this.ui.updateMap(this.world, position, this.missions.objective);
  }

  private save(): void {
    const savedPlayerPosition = this.inVehicle ? this.vehicle.group.position : this.player.position;
    const savedPlayerYaw = this.inVehicle ? this.vehicle.yaw : this.player.yaw;
    const data: GameSave = {
      version: 1,
      savedAt: Date.now(),
      player: {
        x: savedPlayerPosition.x,
        z: savedPlayerPosition.z,
        yaw: savedPlayerYaw,
        stamina: this.player.stamina
      },
      vehicle: {
        x: this.vehicle.group.position.x,
        z: this.vehicle.group.position.z,
        yaw: this.vehicle.yaw,
        kind: this.vehicle.kind
      },
      money: this.money,
      completedMissions: this.missions.completed ? ["harbor-delivery"] : [],
      ownedVehicles: [...this.ownedVehicles],
      settings: { quality: this.quality, volume: this.volume }
    };
    if (Persistence.save(data)) this.ui.toast("Progress saved on this device.");
    else this.ui.toast("Save failed. Check browser storage settings.");
  }

  private buyVehicle(kind: VehicleKind): void {
    if (kind === "van" && !this.ownedVehicles.has("van")) {
      if (this.money < 450) {
        this.ui.toast("You need $450 to purchase the Harbor Van.");
        return;
      }
      this.money -= 450;
      this.ownedVehicles.add("van");
      this.ui.toast("Harbor Van purchased. It is ready to spawn.");
    }
    this.vehicle.setKind(kind);
    this.vehicle.group.position.copy(this.world.garage).add(new THREE.Vector3(1, 0, 8));
    this.vehicle.group.visible = true;
    this.inVehicle = false;
    this.player.setVisible(true);
    this.mode = "playing";
    this.ui.showHUD();
    this.updateHUD();
  }

  private buySnack(): void {
    if (this.money < 30) {
      this.ui.toast("You need $30 for an energy snack.");
      return;
    }
    this.money -= 30;
    this.player.stamina = 100;
    this.ui.toast("Energy restored. Enjoy the rest of your route.");
    this.mode = "playing";
    this.ui.showHUD();
    this.updateHUD();
  }

  private setQuality(quality: GraphicsQuality): void {
    this.quality = quality;
    const pixelRatio = quality === "low" ? 0.75 : quality === "medium" ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.agents.setDensity(quality);
  }

  private setVolume(volume: number): void {
    this.volume = THREE.MathUtils.clamp(volume, 0, 100);
    this.audio.setVolume(this.volume / 100);
  }

  destroy(): void {
    cancelAnimationFrame(this.animationFrame);
    this.input.destroy();
    window.removeEventListener("resize", this.resize);
    this.renderer.dispose();
  }
}
