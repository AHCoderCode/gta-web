import * as THREE from "three";
import type { Input } from "./Input";
import type { World } from "./World";

export class Player {
  readonly position = new THREE.Vector3(-12, 0, 10);
  readonly mesh: THREE.Group;
  yaw = 0;
  cameraYaw = 0;
  cameraPitch = 0.18;
  stamina = 100;
  private verticalVelocity = 0;
  private grounded = true;
  private readonly velocity = new THREE.Vector3();

  constructor(scene: THREE.Scene, private readonly world: World) {
    this.mesh = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.42, 0.85, 4, 7),
      new THREE.MeshStandardMaterial({ color: 0x344d5a, roughness: 0.8 })
    );
    body.position.y = 0.9;
    this.mesh.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.31, 8, 7),
      new THREE.MeshStandardMaterial({ color: 0xc99370, roughness: 0.9 })
    );
    head.position.y = 1.75;
    this.mesh.add(head);

    const jacket = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.35, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xe4a65d, roughness: 0.8 })
    );
    jacket.position.set(0, 1.08, 0.19);
    this.mesh.add(jacket);
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
  }

  update(dt: number, input: Input): void {
    const mouse = input.takeMouseDelta();
    if (document.pointerLockElement) {
      this.cameraYaw -= mouse.x * 0.0022;
      this.cameraPitch = THREE.MathUtils.clamp(this.cameraPitch - mouse.y * 0.0017, -0.12, 0.78);
    }

    const forwardInput = Number(input.down("KeyW", "ArrowUp")) - Number(input.down("KeyS", "ArrowDown"));
    const sideInput = Number(input.down("KeyD", "ArrowRight")) - Number(input.down("KeyA", "ArrowLeft"));
    const forward = new THREE.Vector3(Math.sin(this.cameraYaw), 0, Math.cos(this.cameraYaw));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    const direction = forward.multiplyScalar(forwardInput).add(right.multiplyScalar(sideInput));

    const moving = direction.lengthSq() > 0.001;
    if (moving) direction.normalize();

    const sprinting = input.down("ShiftLeft", "ShiftRight") && this.stamina > 1 && moving;
    const speed = sprinting ? 10.5 : 6.2;
    if (sprinting) this.stamina = Math.max(0, this.stamina - 22 * dt);
    else this.stamina = Math.min(100, this.stamina + 13 * dt);

    const targetVelocity = direction.multiplyScalar(speed);
    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, targetVelocity.x, 12, dt);
    this.velocity.z = THREE.MathUtils.damp(this.velocity.z, targetVelocity.z, 12, dt);

    if (input.consume("Space") && this.grounded) {
      this.verticalVelocity = 7.3;
      this.grounded = false;
    }
    this.verticalVelocity -= 19 * dt;
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.position.y = Math.max(0, this.position.y + this.verticalVelocity * dt);
    if (this.position.y === 0) {
      this.verticalVelocity = 0;
      this.grounded = true;
    }

    this.world.resolveCircle(this.position, 0.7);
    if (moving) {
      this.yaw = Math.atan2(this.velocity.x, this.velocity.z);
      this.mesh.rotation.y = this.yaw;
    }
    this.mesh.position.copy(this.position);
  }

  updateCamera(camera: THREE.PerspectiveCamera, dt: number): void {
    const forward = new THREE.Vector3(Math.sin(this.cameraYaw), 0, Math.cos(this.cameraYaw));
    const target = this.position.clone().add(new THREE.Vector3(0, 1.45, 0));
    const desired = target.clone()
      .addScaledVector(forward, -7.2)
      .add(new THREE.Vector3(1.05, 2.25 + this.cameraPitch * 2.8, 0));
    camera.position.lerp(desired, 1 - Math.exp(-7 * dt));
    camera.lookAt(target);
  }

  reset(): void {
    this.position.set(-12, 0, 10);
    this.mesh.position.copy(this.position);
    this.velocity.set(0, 0, 0);
    this.stamina = 100;
    this.yaw = 0;
    this.cameraYaw = 0;
    this.cameraPitch = 0.18;
    this.verticalVelocity = 0;
    this.grounded = true;
  }

  setPosition(x: number, z: number, yaw: number, stamina: number): void {
    this.position.set(x, 0, z);
    this.world.resolveCircle(this.position, 0.7);
    this.mesh.position.copy(this.position);
    this.yaw = yaw;
    this.cameraYaw = yaw;
    this.mesh.rotation.y = yaw;
    this.stamina = THREE.MathUtils.clamp(stamina, 0, 100);
    this.velocity.set(0, 0, 0);
  }

  setVisible(visible: boolean): void {
    this.mesh.visible = visible;
  }
}
