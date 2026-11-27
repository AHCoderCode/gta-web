# Port Meridian — Open City

An original browser-based 3D open-city exploration and driving game. The first implementation is a playable vertical slice built with Three.js, TypeScript and Vite.

## Run locally

- Install Node.js 20 or newer.
- Run `npm install`.
- Run `npm run dev`.
- Open the local Vite URL shown in the terminal.

For a production build, run `npm run build`. Vercel is configured to publish the generated `dist/` directory.

## Controls

- **WASD / arrow keys:** Walk or drive.
- **Shift:** Sprint on foot.
- **Space:** Jump on foot; handbrake in a vehicle.
- **Mouse:** Rotate the third-person camera after clicking the 3D world.
- **E:** Enter / exit a nearby vehicle, accept or complete a delivery, or use a nearby service.
- **M:** Open the city map.
- **Escape:** Pause and release mouse capture.

## Included in this vertical slice

- A procedural city with several visual districts, roads, sidewalks, a park and a central landmark.
- Third-person movement, jumping, stamina and building collision.
- Two arcade-handling vehicles with entry, exit, steering, acceleration, braking and reverse.
- Lightweight pedestrian loops and traffic circulation.
- A completable harbour delivery mission with a cash reward.
- A garage purchase/spawn interaction and an energy-snack shop.
- HUD, minimap, city map, pause menu and graphics/audio settings.
- Validated local save data for player position, vehicle, money, mission state, owned vehicles and settings.
- Low, medium and high rendering presets.

## Scope notes

This is a first playable foundation, not a finished AAA-scale game. Pedestrians and traffic use lightweight waypoint loops rather than full pathfinding. The first mission is a single delivery route; broader mission variety, detailed animations, advanced traffic intersections, audio ambience, controller support, richer interiors and deeper progression are not implemented yet. The initial design prioritizes nonviolent exploration, driving and delivery gameplay rather than realistic combat.

The project uses procedural geometry and original materials; it does not bundle commercial game assets.
