import * as THREE from "three";
import type { World } from "./World";

export type MissionAction = "none" | "started" | "completed";

export class MissionSystem {
  private state: "available" | "active" | "completed" = "available";
  private readonly startMarker: THREE.Group;
  private readonly destinationMarker: THREE.Group;
  private pulseTime = 0;

  constructor(private readonly scene: THREE.Scene, private readonly world: World) {
    this.startMarker = this.makeMarker(0xf2c16b);
    this.destinationMarker = this.makeMarker(0xff966e);
    this.scene.add(this.startMarker, this.destinationMarker);
    this.startMarker.position.copy(world.missionStart);
    this.destinationMarker.position.copy(world.missionDestination);
    this.destinationMarker.visible = false;
  }

  private makeMarker(color: number): THREE.Group {
    const group = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.1, 0.14, 8, 28),
      new THREE.MeshBasicMaterial({ color })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.18;
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 3.5, 7, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22 })
    );
    beam.position.y = 1.8;
    group.add(ring, beam);
    return group;
  }

  update(dt: number): void {
    this.pulseTime += dt;
    this.startMarker.rotation.y += dt * 0.45;
    this.destinationMarker.rotation.y -= dt * 0.5;
    this.startMarker.position.y = Math.sin(this.pulseTime * 2) * 0.12;
    this.destinationMarker.position.y = Math.sin(this.pulseTime * 2.2) * 0.12;
  }

  canInteract(position: THREE.Vector3): boolean {
    if (this.state === "available") return position.distanceTo(this.world.missionStart) < 6;
    if (this.state === "active") return position.distanceTo(this.world.missionDestination) < 7;
    return false;
  }

  interact(position: THREE.Vector3): { action: MissionAction; reward: number } {
    if (!this.canInteract(position)) return { action: "none", reward: 0 };
    if (this.state === "available") {
      this.state = "active";
      this.startMarker.visible = false;
      this.destinationMarker.visible = true;
      return { action: "started", reward: 0 };
    }
    this.state = "completed";
    this.destinationMarker.visible = false;
    return { action: "completed", reward: 250 };
  }

  get objective(): THREE.Vector3 | null {
    if (this.state === "available") return this.world.missionStart;
    if (this.state === "active") return this.world.missionDestination;
    return null;
  }

  get title(): string {
    if (this.state === "available") return "A delivery is waiting";
    if (this.state === "active") return "Deliver the parcel";
    return "Route completed";
  }

  get detail(): string {
    if (this.state === "available") return "Visit the glowing marker near the garage and press E to accept the city delivery.";
    if (this.state === "active") return "Take the parcel to the orange marker in the eastern harbour district.";
    return "You completed the first route. Keep exploring or save your progress.";
  }

  get status(): string {
    return this.state === "available" ? "AVAILABLE" : this.state === "active" ? "IN PROGRESS" : "COMPLETED";
  }

  get rewardText(): string {
    return this.state === "completed" ? "PAID +$250" : this.state === "active" ? "REWARD $250" : "REWARD $250";
  }

  get completed(): boolean {
    return this.state === "completed";
  }

  restoreCompleted(completed: boolean): void {
    this.state = completed ? "completed" : "available";
    this.startMarker.visible = !completed;
    this.destinationMarker.visible = false;
  }

  reset(): void {
    this.state = "available";
    this.startMarker.visible = true;
    this.destinationMarker.visible = false;
  }
}
