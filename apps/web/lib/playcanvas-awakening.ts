import type { ExperienceSpec } from "@headstrong/core";
import { type Island, skyProjection } from "./awakening";

// Only this adapter knows the renderer. No content scripts, URLs, assets, API or storage.
export async function mountAwakening(
  canvas: HTMLCanvasElement,
  spec: ExperienceSpec,
  read: () => Island,
) {
  const pc = await import("playcanvas");
  const app = new pc.Application(canvas, {
    graphicsDeviceOptions: { antialias: true },
  });
  const materials: InstanceType<typeof pc.StandardMaterial>[] = [];
  let resize: ResizeObserver | undefined;
  let resizeFrame: number | undefined;
  try {
    app.setCanvasFillMode(pc.FILLMODE_NONE);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);
    app.scene.ambientLight = new pc.Color(0.55, 0.65, 0.72);
    const camera = new pc.Entity("Island view");
    camera.addComponent("camera", {
      clearColor: new pc.Color(0.045, 0.11, 0.18),
      projection: pc.PROJECTION_ORTHOGRAPHIC,
      orthoHeight: 12,
    });
    camera.setPosition(19, 22, 18);
    camera.lookAt(0, 0, -6);
    app.root.addChild(camera);
    const sun = new pc.Entity("Moonlight");
    sun.addComponent("light", {
      type: "directional",
      intensity: 1.8,
      color: new pc.Color(1, 0.86, 0.66),
    });
    sun.setEulerAngles(40, 25, 0);
    app.root.addChild(sun);
    function material(r: number, g: number, b: number, glow = false) {
      const m = new pc.StandardMaterial();
      m.diffuse = new pc.Color(r, g, b);
      if (glow) m.emissive = new pc.Color(r, g, b);
      m.update();
      materials.push(m);
      return m;
    }
    const sea = material(0.07, 0.25, 0.32);
    const stone = material(0.2, 0.31, 0.36);
    const grass = material(0.18, 0.45, 0.37);
    const bark = material(0.39, 0.27, 0.22);
    const leaf = material(0.24, 0.57, 0.46);
    const brass = material(0.88, 0.57, 0.24);
    const sail = material(1, 0.8, 0.46);
    const spark = material(0.59, 0.96, 0.8, true);
    const sleeping = material(0.24, 0.39, 0.46);
    function shape(
      name: string,
      type: "box" | "cylinder" | "sphere" | "cone",
      pos: number[],
      scale: number[],
      mat: InstanceType<typeof pc.StandardMaterial>,
      parent = app.root,
    ) {
      const e = new pc.Entity(name);
      e.addComponent("render", { type });
      e.setLocalPosition(pos[0], pos[1], pos[2]);
      e.setLocalScale(scale[0], scale[1], scale[2]);
      if (e.render) e.render.material = mat;
      parent.addChild(e);
      return e;
    }
    shape("Still cove", "box", [0, -1.5, -7], [65, 0.2, 65], sea);
    for (const item of spec.scene.entities.filter(
      (e) => e.type !== "character",
    )) {
      const p = item.position;
      const z = p.z / 5;
      shape(item.label, "cylinder", [p.x, -0.9, z], [8, 1.4, 6], stone);
      shape(
        `${item.label} moss`,
        "cylinder",
        [p.x, -0.1, z],
        [8.2, 0.25, 6.2],
        grass,
      );
    }
    for (const [x, z] of [
      [-3, 1],
      [3, 1],
      [-3, -15],
      [3, -16],
      [-5, -9],
      [5, -7],
    ]) {
      shape("Rock islet", "sphere", [x, -0.8, z], [2.2, 1.3, 2.1], stone);
      shape("Tree trunk", "cylinder", [x, 0.1, z], [0.25, 2, 0.25], bark);
      shape("Tree canopy", "cone", [x, 1.5, z], [1.5, 2.2, 1.5], leaf);
    }
    shape("Launch deck", "box", [0, 0.2, 0], [3, 0.35, 2], brass);
    // Wind ribbons make the two flight corridors legible without relying on color.
    const ribbons: InstanceType<typeof pc.Entity>[] = [];
    for (let i = 0; i < 7; i++) {
      shape(
        "Shelter stepping lights",
        "sphere",
        [-2.4, -0.8, -2 - i * 1.6],
        [0.18, 0.18, 0.18],
        spark,
      );
      const ribbon = shape(
        "Ridge crosswind ribbon",
        "box",
        [2.4, 0.2, -2 - i * 1.6],
        [1.2, 0.07, 0.15],
        sail,
      );
      ribbon.setEulerAngles(0, -30, 0);
      ribbons.push(ribbon);
    }
    const beaconZ =
      (spec.scene.entities.find((e) => e.id === "beacon")?.position.z ?? -70) /
      5;
    shape(
      "Observatory pedestal",
      "cylinder",
      [0, 0.8, beaconZ],
      [1.4, 1.7, 1.4],
      brass,
    );
    const beacon = shape(
      "Pulse crystal",
      "sphere",
      [0, 2.2, beaconZ],
      [1.2, 1.6, 1.2],
      sleeping,
    );
    const petals = Array.from({ length: 8 }, (_, i) => {
      const angle = (i * Math.PI) / 4;
      return shape(
        "Dormant star garden",
        "sphere",
        [Math.cos(angle) * 2.5, 0.15, beaconZ + Math.sin(angle) * 1.9],
        [0.5, 0.15, 0.5],
        sleeping,
      );
    });
    const skyLights = Array.from({ length: 5 }, (_, i) =>
      shape(
        `Projected star ${i + 1}`,
        "sphere",
        [0, 5, beaconZ],
        [0.24, 0.24, 0.24],
        spark,
      ),
    );
    // A walkable-looking causeway connects stops without a gameplay unlock.
    for (let i = 0; i < 12; i++)
      shape(
        "Trail stepping stone",
        "cylinder",
        [-3.6, -0.15, -1 - i],
        [0.65, 0.18, 0.65],
        brass,
      );
    const seedBeds = (["cove", "slope", "terrace"] as const).map(
      (bed, index) => {
        const x = -5 + index * 2;
        const z = -3 - index * 3.5;
        shape(
          `${bed} seed islet`,
          "cylinder",
          [x, -0.7, z],
          [2.5, 0.8, 2.2],
          stone,
        );
        shape(
          `${bed} sleeping soil`,
          "cylinder",
          [x, -0.25, z],
          [2.5, 0.15, 2.2],
          bark,
        );
        const clumps = Array.from({ length: 3 }, (_, i) => {
          const plant = new pc.Entity(`${bed} seed clump ${i + 1}`);
          plant.setLocalPosition(
            x + (i - 1) * 0.65,
            -0.1,
            z + (i === 1 ? -0.3 : 0.2),
          );
          app.root.addChild(plant);
          shape(
            "Seedling stem",
            "cylinder",
            [0, 0.35, 0],
            [0.09, 0.7, 0.09],
            leaf,
            plant,
          );
          shape(
            "Seedling leaves",
            "cone",
            [0, 0.45, 0],
            [0.55, 0.55, 0.5],
            leaf,
            plant,
          );
          shape(
            "Seedling blossom",
            "sphere",
            [0, 0.8, 0],
            [0.35, 0.3, 0.35],
            sail,
            plant,
          );
          plant.enabled = false;
          return plant;
        });
        return { bed, clumps };
      },
    );
    const creature = shape(
      "Lumiling",
      "sphere",
      [-2.8, 1.4, -2],
      [0.6, 0.45, 0.8],
      spark,
    );
    shape(
      "Lumiling left fin",
      "cone",
      [-0.45, 0, 0],
      [0.8, 0.15, 0.5],
      sail,
      creature,
    );
    shape(
      "Lumiling right fin",
      "cone",
      [0.45, 0, 0],
      [0.8, 0.15, 0.5],
      sail,
      creature,
    );
    const glider = new pc.Entity("Your glider");
    app.root.addChild(glider);
    shape("Glider frame", "box", [0, 0, 0], [0.12, 0.15, 1.3], brass, glider);
    const left = shape(
      "Left wing",
      "box",
      [-0.65, 0.06, 0],
      [1.4, 0.07, 0.8],
      sail,
      glider,
    );
    const right = shape(
      "Right wing",
      "box",
      [0.65, 0.06, 0],
      [1.4, 0.07, 0.8],
      sail,
      glider,
    );
    shape(
      "Carried spark",
      "sphere",
      [0, 0.25, -0.3],
      [0.2, 0.2, 0.2],
      spark,
      glider,
    );
    app.on("update", () => {
      const s = read();
      const f = s.flight;
      if (s.location === "garden") {
        camera.setPosition(12, 18, 10);
        camera.lookAt(-3, 0, -6);
      } else if (s.location === "observatory") {
        camera.setPosition(12, 15, beaconZ + 15);
        camera.lookAt(0, 3, beaconZ);
      } else {
        camera.setPosition(19, 22, 18);
        camera.lookAt(0, 0, -6);
      }
      if (camera.camera)
        camera.camera.orthoHeight = s.location === "workshop" ? 12 : 8;
      const projection = skyProjection(s.sky);
      skyLights.forEach((star, i) => {
        star.enabled = s.location === "observatory";
        star.setPosition(projection[i][0], 5 + projection[i][1], beaconZ);
      });
      for (const { bed, clumps } of seedBeds)
        for (let i = 0; i < clumps.length; i++)
          clumps[i].enabled = i < s.garden.beds[bed];
      const x = f.lane * 2.4;
      glider.setPosition(
        x,
        f.phase === "ready" ? 1.2 : f.height / 3 + 0.3,
        -f.distance / 5,
      );
      glider.setEulerAngles(0, 0, -f.lane * 8);
      left.setLocalEulerAngles(0, f.wing === "swept" ? 28 : 0, 0);
      right.setLocalEulerAngles(0, f.wing === "swept" ? -28 : 0, 0);
      for (const ribbon of ribbons)
        ribbon.setEulerAngles(0, s.wind ? 30 : -30, 0);
      if (beacon.render) beacon.render.material = s.restored ? spark : sleeping;
      for (const petal of petals) {
        if (petal.render) petal.render.material = s.restored ? spark : sleeping;
        petal.setLocalScale(0.5, s.restored ? 0.8 : 0.15, 0.5);
      }
      creature.setPosition(
        s.creature ? x - 1 : -2.8,
        s.creature ? f.height / 3 + 1 : 1.4,
        s.creature ? -f.distance / 5 + 1 : -2,
      );
    });
    const container = canvas.parentElement;
    let lastWidth = 0;
    const fit = () => {
      const width = container?.clientWidth ?? 640;
      if (width === lastWidth) return;
      lastWidth = width;
      app.resizeCanvas(width, width < 600 ? 340 : 460);
      // Fixed scale keeps the island legible on narrow touch screens too.
      if (camera.camera) camera.camera.orthoHeight = 12;
    };
    // Resizing the canvas changes its observed parent. Defer writes out of the
    // observer delivery cycle so mobile/layout changes cannot form a loop.
    resize = new ResizeObserver(() => {
      if (resizeFrame !== undefined) return;
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = undefined;
        fit();
      });
    });
    resize.observe(container ?? canvas);
    app.start();
    fit();
    return {
      destroy() {
        resize?.disconnect();
        if (resizeFrame !== undefined) cancelAnimationFrame(resizeFrame);
        for (const m of materials) m.destroy();
        app.destroy();
      },
    };
  } catch (error) {
    resize?.disconnect();
    if (resizeFrame !== undefined) cancelAnimationFrame(resizeFrame);
    for (const m of materials) m.destroy();
    app.destroy();
    throw error;
  }
}
