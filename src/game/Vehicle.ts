import * as THREE from "three";
import type { Input } from "./Input";
import type { World } from "./World";

export type VehicleKind = "compact" | "van";

const PROFILES = {
  compact: { color: 0xd56f4d, maxSpeed: 30, acceleration: 18, turn: 1.9 },
  van: { color: 0x6b9fa5, maxSpeed: 23, acceleration: 13, turn: 1.35 }
} as const;

export class Vehicle {
  readonly group: THREE.Group;
  kind: VehicleKind = "compact";
  speed = 0;
  yaw = 0;
  private readonly wheels: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene, private readonly world: World) {
    this.group = new THREE.Group();
    this.buildModel();
    scene.add(this.group);
    this.reset();
  }

  private buildModel(): void {
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: PROFILES.compact.color, roughness: 0.65, metalness: 0.12 });
    const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x243c49, roughness: 0.25, metalness: 0.35 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.72, 4.1), bodyMaterial);
    body.position.y = 0.8;
    this.group.add(body);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.78, 2.0), glassMaterial);
    cabin.position.set(0, 1.45, -0.22);
    this.group.add(cabin);

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.12, 2.1),
      new THREE.MeshStandardMaterial({ color: 0x384d56, roughness: 0.7 })
    );
    roof.position.set(0, 1.88, -0.22);
    this.group.add(roof);

    const wheelGeo = new THREE.CylinderGeometry(0.43, 0.43, 0.26, 10);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x202427, roughness: 1 });
    for (const x of [-1.05, 1.05]) {
      for (const z of [-1.32, 1.32]) {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.48, z);
        this.group.add(wheel);
        this.wheels.push(wheel);
      }
    }

    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffedbc });
    for (const x of [-0.72, 0.72]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.18, 0.06), lampMat);
      lamp.position.set(x, 0.9, 2.08);
      this.group.add(lamp);
    }
  }

  update(dt: number, input: Input): void {
    const profile = PROFILES[this.kind];
    const throttle = Number(input.down("KeyW", "ArrowUp"));
    const reverse = Number(input.down("KeyS", "ArrowDown"));
    const steering = Number(input.down("KeyD", "ArrowRight")) - Number(input.down("KeyA", "ArrowLeft"));

    if (throttle) this.speed = Math.min(profile.maxSpeed, this.speed + profile.acceleration * dt);
    if (reverse) {
      if (this.speed > 1) this.speed = Math.max(0, this.speed - profile.acceleration * 2.6 * dt);
      else this.speed = Math.max(-7, this.speed - profile.acceleration * 0.65 * dt);
    }
    const handbrake = input.down("Space");
    const damping = handbrake ? 8.5 : (throttle || reverse ? 0.7 : 2.2);
    if (!throttle && !reverse) this.speed = THREE.MathUtils.damp(this.speed, 0, damping, dt);

    const speedFactor = Math.min(1, Math.abs(this.speed) / 8);
    this.yaw += steering * profile.turn * (0.22 + speedFactor) * Math.sign(this.speed || 1) * dt;

    const previous = this.group.position.clone();
    this.group.position.x += Math.sin(this.yaw) * this.speed * dt;
    this.group.position.z += Math.cos(this.yaw) * this.speed * dt;
    this.world.resolveCircle(this.group.position, 1.55);
    if (this.group.position.distanceToSquared(previous) < 0.0001 && Math.abs(this.speed) > 0.5) {
      this.speed = 0;
    }

    this.group.rotation.y = this.yaw;
    for (const wheel of this.wheels) wheel.rotation.x += this.speed * dt * 0.8;
  }

  setKind(kind: VehicleKind): void {
    this.kind = kind;
    const body = this.group.children[0];
    if (body instanceof THREE.Mesh && body.material instanceof THREE.MeshStandardMaterial) {
      body.material.color.setHex(PROFILES[kind].color);
    }
  }

  reset(): void {
    this.kind = "compact";
    this.speed = 0;
    this.yaw = 0;
    this.group.position.set(-12, 0, 2);
    this.group.rotation.y = 0;
    this.group.visible = true;
  }

  setPosition(x: number, z: number, yaw: number, kind: VehicleKind): void {
    this.setKind(kind);
    this.group.position.set(x, 0, z);
    this.world.resolveCircle(this.group.position, 1.55);
    this.yaw = yaw;
    this.group.rotation.y = yaw;
    this.speed = 0;
  }

  get speedKmh(): number {
    return Math.round(Math.abs(this.speed) * 3.6);
  }
}
