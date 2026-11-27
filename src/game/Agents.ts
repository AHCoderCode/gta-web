import * as THREE from "three";

interface Walker {
  group: THREE.Group;
  phase: number;
  radius: number;
  speed: number;
  centerX: number;
  centerZ: number;
}

interface TrafficCar {
  group: THREE.Group;
  axis: "x" | "z";
  lane: number;
  speed: number;
  offset: number;
}

export class WorldActors {
  private readonly walkers: Walker[] = [];
  private readonly traffic: TrafficCar[] = [];

  constructor(private readonly scene: THREE.Scene) {
    this.createWalkers();
    this.createTraffic();
  }

  private createWalkers(): void {
    const bodyColors = [0x547b83, 0xb87c58, 0x657b57, 0x8a6f9b, 0xb39b65];
    for (let index = 0; index < 12; index++) {
      const group = new THREE.Group();
      const color = bodyColors[index % bodyColors.length];
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.28, 0.56, 3, 5),
        new THREE.MeshStandardMaterial({ color, roughness: 0.9 })
      );
      body.position.y = 0.68;
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 7, 6),
        new THREE.MeshStandardMaterial({ color: 0xc99472, roughness: 0.95 })
      );
      head.position.y = 1.27;
      group.add(body, head);
      const centerX = index % 2 === 0 ? -80 : 40;
      const centerZ = index % 3 === 0 ? 40 : -40;
      const radius = 7.4 + (index % 4) * 0.55;
      group.position.set(centerX + radius, 0, centerZ);
      this.scene.add(group);
      this.walkers.push({
        group,
        phase: (index / 12) * Math.PI * 2,
        radius,
        speed: 0.18 + (index % 4) * 0.035,
        centerX,
        centerZ
      });
    }
  }

  private createTraffic(): void {
    const colors = [0x718b94, 0xc18b5b, 0x75866d, 0x8d7377, 0xd2b56d, 0x62818b];
    for (let index = 0; index < 6; index++) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.75, 0.62, 3.1),
        new THREE.MeshStandardMaterial({ color: colors[index], roughness: 0.78 })
      );
      body.position.y = 0.65;
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.35, 0.55, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x2b414a, roughness: 0.35 })
      );
      cabin.position.set(0, 1.12, -0.15);
      group.add(body, cabin);
      const axis = index % 2 === 0 ? "x" : "z";
      const lane = [-100, -60, 20, 60, 100, 140][index];
      const offset = -145 + index * 45;
      if (axis === "x") group.position.set(offset, 0, lane + 2.3);
      else group.position.set(lane - 2.3, 0, offset);
      this.scene.add(group);
      this.traffic.push({ group, axis, lane, speed: 5 + (index % 3) * 1.4, offset });
    }
  }

  setDensity(quality: "low" | "medium" | "high"): void {
    const density = quality === "low" ? 0.45 : quality === "medium" ? 0.75 : 1;
    this.walkers.forEach((walker, index) => (walker.group.visible = index < Math.ceil(this.walkers.length * density)));
    this.traffic.forEach((car, index) => (car.group.visible = index < Math.ceil(this.traffic.length * density)));
  }

  update(dt: number): void {
    for (const walker of this.walkers) {
      walker.phase += dt * walker.speed;
      const x = walker.centerX + Math.cos(walker.phase) * walker.radius;
      const z = walker.centerZ + Math.sin(walker.phase) * walker.radius;
      walker.group.position.set(x, 0, z);
      walker.group.rotation.y = -walker.phase;
      const body = walker.group.children[0];
      body.position.y = 0.68 + Math.sin(walker.phase * 5) * 0.045;
    }

    for (const car of this.traffic) {
      car.offset += car.speed * dt;
      if (car.offset > 155) car.offset = -155;
      if (car.axis === "x") {
        car.group.position.x = car.offset;
        car.group.position.z = car.lane + 2.3;
        car.group.rotation.y = Math.PI / 2;
      } else {
        car.group.position.x = car.lane - 2.3;
        car.group.position.z = car.offset;
        car.group.rotation.y = 0;
      }
    }
  }
}
