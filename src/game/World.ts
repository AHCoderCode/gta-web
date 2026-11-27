import * as THREE from "three";

interface Collider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

interface BuildingData {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: number;
}

const ROAD_CENTERS = [-140, -100, -60, -20, 20, 60, 100, 140];
const WORLD_LIMIT = 164;

export class World {
  readonly colliders: Collider[] = [];
  readonly garage = new THREE.Vector3(-30, 0, 0);
  readonly market = new THREE.Vector3(82, 0, 82);
  readonly missionStart = new THREE.Vector3(-1, 0, 11);
  readonly missionDestination = new THREE.Vector3(108, 0, -100);
  private readonly buildings: BuildingData[] = [];
  private readonly poi: { x: number; z: number; color: string }[] = [
    { x: -30, z: 0, color: "#f5c45b" },
    { x: 82, z: 82, color: "#77d7bf" },
    { x: 108, z: -100, color: "#ff9a67" }
  ];

  constructor(private readonly scene: THREE.Scene) {
    this.createLighting();
    this.createGroundAndRoads();
    this.createBuildings();
    this.createLandmarks();
    this.createPark();
  }

  private createLighting(): void {
    this.scene.background = new THREE.Color(0x9bb7c5);
    this.scene.fog = new THREE.Fog(0x9bb7c5, 135, 390);
    this.scene.add(new THREE.HemisphereLight(0xdcecf2, 0x35444b, 2.0));
    const sun = new THREE.DirectionalLight(0xffe4bf, 2.15);
    sun.position.set(-70, 120, 65);
    sun.castShadow = false;
    this.scene.add(sun);
  }

  private createGroundAndRoads(): void {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(340, 340),
      new THREE.MeshStandardMaterial({ color: 0x66816e, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.12;
    this.scene.add(ground);

    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x30383d, roughness: 0.96 });
    const pavementMaterial = new THREE.MeshStandardMaterial({ color: 0x9a9b91, roughness: 1 });
    const lineMaterial = new THREE.MeshStandardMaterial({ color: 0xd8d0b8, roughness: 1 });
    const roadGeometry = new THREE.PlaneGeometry(12, 340);
    const horizontalRoadGeometry = new THREE.PlaneGeometry(340, 12);
    const pavementGeometry = new THREE.PlaneGeometry(3.1, 340);
    const horizontalPavementGeometry = new THREE.PlaneGeometry(340, 3.1);
    const lineGeometry = new THREE.PlaneGeometry(0.22, 340);

    for (const coordinate of ROAD_CENTERS) {
      const vertical = new THREE.Mesh(roadGeometry, roadMaterial);
      vertical.rotation.x = -Math.PI / 2;
      vertical.position.set(coordinate, 0.005, 0);
      this.scene.add(vertical);

      const horizontal = new THREE.Mesh(horizontalRoadGeometry, roadMaterial);
      horizontal.rotation.x = -Math.PI / 2;
      horizontal.position.set(0, 0.006, coordinate);
      this.scene.add(horizontal);

      for (const side of [-1, 1]) {
        const vWalk = new THREE.Mesh(pavementGeometry, pavementMaterial);
        vWalk.rotation.x = -Math.PI / 2;
        vWalk.position.set(coordinate + side * 7.6, 0.015, 0);
        this.scene.add(vWalk);

        const hWalk = new THREE.Mesh(horizontalPavementGeometry, pavementMaterial);
        hWalk.rotation.x = -Math.PI / 2;
        hWalk.position.set(0, 0.016, coordinate + side * 7.6);
        this.scene.add(hWalk);
      }

      const vLine = new THREE.Mesh(lineGeometry, lineMaterial);
      vLine.rotation.x = -Math.PI / 2;
      vLine.position.set(coordinate, 0.018, 0);
      this.scene.add(vLine);
    }

    // Dashed lane markings are limited to a few short sections to keep draw calls low.
    const dashGeometry = new THREE.PlaneGeometry(0.16, 2.4);
    const horizontalDashGeometry = new THREE.PlaneGeometry(2.4, 0.16);
    const dashMaterial = new THREE.MeshBasicMaterial({ color: 0xc8c0aa });
    const dashCount = ROAD_CENTERS.length * 27;
    const verticalDashes = new THREE.InstancedMesh(dashGeometry, dashMaterial, dashCount);
    const horizontalDashes = new THREE.InstancedMesh(horizontalDashGeometry, dashMaterial, dashCount);
    const dashTransform = new THREE.Object3D();
    let verticalIndex = 0;
    let horizontalIndex = 0;
    for (const road of ROAD_CENTERS) {
      for (let coordinate = -156; coordinate <= 156; coordinate += 12) {
        dashTransform.rotation.set(-Math.PI / 2, 0, 0);
        dashTransform.position.set(road, 0.024, coordinate);
        dashTransform.updateMatrix();
        verticalDashes.setMatrixAt(verticalIndex++, dashTransform.matrix);

        dashTransform.position.set(coordinate, 0.024, road);
        dashTransform.updateMatrix();
        horizontalDashes.setMatrixAt(horizontalIndex++, dashTransform.matrix);
      }
    }
    verticalDashes.instanceMatrix.needsUpdate = true;
    horizontalDashes.instanceMatrix.needsUpdate = true;
    this.scene.add(verticalDashes, horizontalDashes);
  }

  private createBuildings(): void {
    const data: BuildingData[] = [];
    let seed = 91357;
    const random = (): number => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const cells = [-120, -80, -40, 0, 40, 80, 120];
    for (const x of cells) {
      for (const z of cells) {
        const isPark = x === -80 && z === 80;
        const isGarageBlock = x === -40 && z === 0;
        const isMarketBlock = x === 80 && z === 80;
        if (isPark || isGarageBlock || isMarketBlock) continue;

        const count = random() > 0.56 ? 2 : 1;
        for (let i = 0; i < count; i++) {
          const width = 9 + random() * 7;
          const depth = 9 + random() * 7;
          const offsetX = (random() - 0.5) * 14;
          const offsetZ = (random() - 0.5) * 14;
          const centerX = x + offsetX;
          const centerZ = z + offsetZ;
          let height: number;
          let palette: number[];

          if (Math.abs(x) <= 40 && Math.abs(z) <= 40) {
            height = 24 + random() * 42;
            palette = [0x52616b, 0x61727b, 0x77838a, 0x465761];
          } else if (x > 40) {
            height = 9 + random() * 15;
            palette = [0x827c70, 0x77786f, 0x9a8c78, 0x656f70];
          } else if (z > 40) {
            height = 10 + random() * 19;
            palette = [0x9a8e81, 0x858c83, 0x9a9b8b, 0x6e7e80];
          } else {
            height = 13 + random() * 22;
            palette = [0x8e8179, 0x7c8586, 0x9b927f, 0x697a82];
          }

          data.push({
            x: centerX,
            z: centerZ,
            width,
            depth,
            height,
            color: palette[Math.floor(random() * palette.length)]
          });
        }
      }
    }

    // Signature tower at the centre of the downtown district.
    data.push({ x: 0, z: 0, width: 18, depth: 18, height: 76, color: 0x344e5b });
    this.buildings.push(...data);

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.83 });
    const blocks = new THREE.InstancedMesh(geometry, material, data.length);
    const dummy = new THREE.Object3D();

    data.forEach((building, index) => {
      dummy.position.set(building.x, building.height / 2, building.z);
      dummy.scale.set(building.width, building.height, building.depth);
      dummy.updateMatrix();
      blocks.setMatrixAt(index, dummy.matrix);
      blocks.setColorAt(index, new THREE.Color(building.color));
      this.colliders.push({
        minX: building.x - building.width / 2,
        maxX: building.x + building.width / 2,
        minZ: building.z - building.depth / 2,
        maxZ: building.z + building.depth / 2
      });
    });
    blocks.instanceMatrix.needsUpdate = true;
    if (blocks.instanceColor) blocks.instanceColor.needsUpdate = true;
    this.scene.add(blocks);

    const windowPositions: THREE.Matrix4[] = [];
    const windowGeo = new THREE.BoxGeometry(1, 1, 1);
    const windowMat = new THREE.MeshBasicMaterial({ color: 0x8fc2cc });
    for (const building of data) {
      const floors = Math.min(9, Math.floor(building.height / 4));
      for (let floor = 0; floor < floors; floor++) {
        for (let column = 0; column < 3; column++) {
          const matrix = new THREE.Matrix4().compose(
            new THREE.Vector3(
              building.x - building.width * 0.28 + column * building.width * 0.28,
              2.2 + floor * 3.4,
              building.z - building.depth / 2 - 0.055
            ),
            new THREE.Quaternion(),
            new THREE.Vector3(1.1, 1.2, 0.08)
          );
          windowPositions.push(matrix);
        }
      }
    }
    if (windowPositions.length) {
      const windows = new THREE.InstancedMesh(windowGeo, windowMat, windowPositions.length);
      windowPositions.forEach((matrix, index) => windows.setMatrixAt(index, matrix));
      windows.instanceMatrix.needsUpdate = true;
      this.scene.add(windows);
    }

    this.createGarage();
    this.createMarket();
  }

  private createGarage(): void {
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(17, 7, 13),
      new THREE.MeshStandardMaterial({ color: 0x596b70, roughness: 0.9 })
    );
    building.position.set(-40, 3.5, 0);
    this.scene.add(building);
    this.colliders.push({ minX: -48.5, maxX: -31.5, minZ: -6.5, maxZ: 6.5 });

    const door = new THREE.Mesh(
      new THREE.BoxGeometry(6.8, 4.8, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x202b31, roughness: 0.8 })
    );
    door.position.set(-31.42, 2.4, 0);
    this.scene.add(door);
  }

  private createMarket(): void {
    const kiosk = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(8, 3.5, 6),
      new THREE.MeshStandardMaterial({ color: 0xb78c5c, roughness: 0.9 })
    );
    base.position.y = 1.75;
    kiosk.add(base);
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(9, 0.45, 7),
      new THREE.MeshStandardMaterial({ color: 0x4f9b8d, roughness: 0.8 })
    );
    canopy.position.y = 3.8;
    kiosk.add(canopy);
    kiosk.position.set(this.market.x, 0, this.market.z);
    this.scene.add(kiosk);
    this.colliders.push({
      minX: this.market.x - 4.5,
      maxX: this.market.x + 4.5,
      minZ: this.market.z - 3.5,
      maxZ: this.market.z + 3.5
    });
  }

  private createLandmarks(): void {
    const towerCap = new THREE.Mesh(
      new THREE.BoxGeometry(7, 1.1, 7),
      new THREE.MeshStandardMaterial({ color: 0xe8b764, emissive: 0x5a3210, emissiveIntensity: 0.4 })
    );
    towerCap.position.set(0, 77, 0);
    this.scene.add(towerCap);

    const beacon = new THREE.Mesh(
      new THREE.TorusGeometry(2.2, 0.18, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xffb85f })
    );
    beacon.rotation.x = Math.PI / 2;
    beacon.position.set(0, 78.5, 0);
    this.scene.add(beacon);
  }

  private createPark(): void {
    const center = new THREE.Vector3(-80, 0, 80);
    const grass = new THREE.Mesh(
      new THREE.PlaneGeometry(31, 31),
      new THREE.MeshStandardMaterial({ color: 0x739777, roughness: 1 })
    );
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(center.x, 0.02, center.z);
    this.scene.add(grass);

    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 2.3, 6);
    const crownGeo = new THREE.SphereGeometry(1.35, 7, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6a5140 });
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x477c5c, roughness: 1 });
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const x = center.x + Math.cos(angle) * (5 + (i % 3) * 3);
      const z = center.z + Math.sin(angle) * (5 + (i % 4) * 2);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(x, 1.15, z);
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.set(x, 3.1, z);
      this.scene.add(trunk, crown);
    }
  }

  resolveCircle(position: THREE.Vector3, radius: number): void {
    position.x = THREE.MathUtils.clamp(position.x, -WORLD_LIMIT, WORLD_LIMIT);
    position.z = THREE.MathUtils.clamp(position.z, -WORLD_LIMIT, WORLD_LIMIT);

    for (const box of this.colliders) {
      const closestX = THREE.MathUtils.clamp(position.x, box.minX, box.maxX);
      const closestZ = THREE.MathUtils.clamp(position.z, box.minZ, box.maxZ);
      let dx = position.x - closestX;
      let dz = position.z - closestZ;
      const distanceSq = dx * dx + dz * dz;
      if (distanceSq >= radius * radius) continue;

      if (distanceSq < 0.00001) {
        const pushX = Math.min(Math.abs(position.x - box.minX), Math.abs(box.maxX - position.x));
        const pushZ = Math.min(Math.abs(position.z - box.minZ), Math.abs(box.maxZ - position.z));
        if (pushX < pushZ) {
          position.x = position.x < (box.minX + box.maxX) / 2 ? box.minX - radius : box.maxX + radius;
        } else {
          position.z = position.z < (box.minZ + box.maxZ) / 2 ? box.minZ - radius : box.maxZ + radius;
        }
        continue;
      }

      const distance = Math.sqrt(distanceSq);
      const overlap = radius - distance;
      dx /= distance;
      dz /= distance;
      position.x += dx * overlap;
      position.z += dz * overlap;
    }
  }

  drawMinimap(ctx: CanvasRenderingContext2D, player: THREE.Vector3, yaw: number, objective: THREE.Vector3 | null): void {
    const size = ctx.canvas.width;
    const center = size / 2;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#15232b";
    ctx.fillRect(0, 0, size, size);

    const scale = 0.88;
    ctx.save();
    ctx.translate(center - player.x * scale, center - player.z * scale);
    ctx.fillStyle = "#37434a";
    for (const road of ROAD_CENTERS) {
      ctx.fillRect(road - 6, -WORLD_LIMIT, 12, WORLD_LIMIT * 2);
      ctx.fillRect(-WORLD_LIMIT, road - 6, WORLD_LIMIT * 2, 12);
    }
    ctx.fillStyle = "#64766a";
    for (const building of this.buildings) {
      ctx.fillRect(building.x - building.width / 2, building.z - building.depth / 2, building.width, building.depth);
    }
    ctx.fillStyle = "#729b77";
    ctx.fillRect(-95, 65, 31, 31);
    for (const marker of this.poi) {
      ctx.fillStyle = marker.color;
      ctx.beginPath();
      ctx.arc(marker.x, marker.z, 2.7, 0, Math.PI * 2);
      ctx.fill();
    }
    if (objective) {
      ctx.fillStyle = "#ff9a67";
      ctx.beginPath();
      ctx.arc(objective.x, objective.z, 3.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(-yaw);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(5.5, 6);
    ctx.lineTo(0, 3.5);
    ctx.lineTo(-5.5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = "rgba(255,255,255,.28)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center, center, center - 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawFullMap(ctx: CanvasRenderingContext2D, player: THREE.Vector3, objective: THREE.Vector3 | null): void {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const scaleX = width / 340;
    const scaleY = height / 340;
    const mapX = (x: number): number => (x + 170) * scaleX;
    const mapY = (z: number): number => (z + 170) * scaleY;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#19272f";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#354148";
    for (const road of ROAD_CENTERS) {
      ctx.fillRect(mapX(road - 6), 0, 12 * scaleX, height);
      ctx.fillRect(0, mapY(road - 6), width, 12 * scaleY);
    }
    for (const building of this.buildings) {
      ctx.fillStyle = "#66756f";
      ctx.fillRect(
        mapX(building.x - building.width / 2),
        mapY(building.z - building.depth / 2),
        building.width * scaleX,
        building.depth * scaleY
      );
    }
    ctx.fillStyle = "#527e61";
    ctx.fillRect(mapX(-95), mapY(65), 31 * scaleX, 31 * scaleY);
    this.poi.forEach((marker) => {
      ctx.fillStyle = marker.color;
      ctx.beginPath();
      ctx.arc(mapX(marker.x), mapY(marker.z), 6, 0, Math.PI * 2);
      ctx.fill();
    });
    if (objective) {
      ctx.fillStyle = "#ff9a67";
      ctx.beginPath();
      ctx.arc(mapX(objective.x), mapY(objective.z), 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(mapX(player.x), mapY(player.z), 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.45)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);
  }
}
