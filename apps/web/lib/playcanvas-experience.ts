import type { ExperienceSpec } from "@headstrong/core";

// Adapter boundary: only this module knows PlayCanvas. No scripts/assets are fetched.
export async function mountPlayCanvasExperience(
  canvas: HTMLCanvasElement,
  spec: ExperienceSpec,
  observe: (entityId: string) => void,
) {
  const pc = await import("playcanvas");
  const app = new pc.Application(canvas, {
    graphicsDeviceOptions: { antialias: true },
  });
  try {
    app.setCanvasFillMode(pc.FILLMODE_NONE);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);
    const camera = new pc.Entity("camera");
    camera.addComponent("camera", {
      clearColor: new pc.Color(0.9, 0.92, 0.86),
    });
    const fractions = spec.scene.templateId === "fraction-blocks";
    camera.setPosition(fractions ? 5 : 0, fractions ? 6 : 3, fractions ? 8 : 8);
    camera.lookAt(0, 0.3, fractions ? 0 : -1);
    app.root.addChild(camera);
    const light = new pc.Entity("light");
    light.addComponent("light", { type: "directional", intensity: 1.5 });
    light.setEulerAngles(45, 30, 0);
    app.root.addChild(light);
    app.scene.ambientLight = new pc.Color(0.7, 0.72, 0.65);

    const entities = new Map<string, InstanceType<typeof pc.Entity>>();
    const materials: InstanceType<typeof pc.StandardMaterial>[] = [];
    const floor = new pc.Entity("Exploration stage");
    floor.addComponent("render", { type: "box" });
    floor.setLocalScale(9, 0.12, 7);
    floor.setPosition(0, -0.18, 0);
    const floorMaterial = new pc.StandardMaterial();
    floorMaterial.diffuse = new pc.Color(0.77, 0.82, 0.7);
    floorMaterial.update();
    if (floor.render) floor.render.material = floorMaterial;
    materials.push(floorMaterial);
    app.root.addChild(floor);
    for (const [index, item] of spec.scene.entities.entries()) {
      const entity = new pc.Entity(item.label);
      entity.addComponent("render", { type: "box" });
      // Constrain arbitrary persisted scene coordinates to a small navigable stage.
      entity.setPosition(
        ((index % 6) - (Math.min(spec.scene.entities.length, 6) - 1) / 2) *
          1.35,
        0.5,
        -Math.floor(index / 6) * 1.5,
      );
      if (fractions) {
        const row = index === 0 ? 0 : index < 3 ? 1 : 2;
        const count = 2 ** row;
        const column = index - (row === 0 ? 0 : row === 1 ? 1 : 3);
        entity.setLocalScale(4.6 / count, 0.7, 0.9);
        entity.setPosition(
          (column - (count - 1) / 2) * (4.6 / count + 0.06),
          0.3,
          (row - 1) * 1.55,
        );
      }
      const material = new pc.StandardMaterial();
      const color = fractions
        ? index === 0
          ? [0.79, 0.47, 0.28]
          : index < 3
            ? [0.91, 0.76, 0.49]
            : [0.28, 0.53, 0.43]
        : [0.28, 0.53, 0.43];
      material.diffuse = new pc.Color(...color);
      material.update();
      if (entity.render) entity.render.material = material;
      materials.push(material);
      entities.set(item.id, entity);
      app.root.addChild(entity);
    }
    function highlight(id: string) {
      const material = entities.get(id)?.render?.material;
      if (material instanceof pc.StandardMaterial) {
        material.diffuse = new pc.Color(0.63, 0.73, 0.37);
        material.update();
      }
    }
    function pick(event: PointerEvent) {
      const bounds = canvas.getBoundingClientRect();
      const component = camera.camera;
      if (!component) return;
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      const near = component.screenToWorld(x, y, component.nearClip);
      const far = component.screenToWorld(x, y, component.farClip);
      const ray = new pc.Ray(near, far.sub(near).normalize());
      const hit = new pc.Vec3();
      let nearest: { id: string; distance: number } | null = null;
      for (const [id, entity] of entities) {
        const box = entity.render?.meshInstances[0]?.aabb;
        if (box?.intersectsRay(ray, hit)) {
          const distance = hit.distance(near);
          if (!nearest || distance < nearest.distance)
            nearest = { id, distance };
        }
      }
      if (nearest) {
        highlight(nearest.id);
        observe(nearest.id);
      }
    }
    const container = canvas.parentElement;
    const resizeCanvas = () =>
      app.resizeCanvas(container?.clientWidth ?? 640, 360);
    const resize = new ResizeObserver(resizeCanvas);
    resize.observe(container ?? canvas);
    canvas.addEventListener("pointerdown", pick);
    app.start();
    resizeCanvas();
    return {
      highlight,
      destroy() {
        resize.disconnect();
        canvas.removeEventListener("pointerdown", pick);
        for (const material of materials) material.destroy();
        app.destroy();
      },
    };
  } catch (error) {
    app.destroy();
    throw error;
  }
}
