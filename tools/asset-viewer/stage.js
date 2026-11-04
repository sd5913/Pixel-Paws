import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Match the published experiment's temporary stage; no asset export.
export function createStage() {
  const stage = new T.Group();
  const decorations = [];
  function box(parent, size, position, colorRole, radius = 0.015) {
    const mesh = new T.Mesh(new RoundedBoxGeometry(...size, 2, radius), new T.MeshLambertMaterial());
    mesh.position.set(...position);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    decorations.push({ mesh, colorRole });
    return mesh;
  }

  // Ephemeral scene dressing, never exported to GLB or registered with the game.
  box(stage, [2.48, 0.13, 2.04], [0, -0.075, 0.08], 'base', 0.07);
  for (let i = 0; i < 8; i++) {
    box(stage, [2.40, 0.035, 0.245], [0, 0, -0.78 + i * 0.25], 'floor', 0.007);
  }
  box(stage, [2.45, 0.82, 0.07], [0, 0.40, 1.035], 'wall', 0.025);
  box(stage, [0.065, 0.82, 2.04], [-1.205, 0.40, 0.045], 'wall', 0.025);
  box(stage, [2.4, 0.05, 0.035], [0, 0.04, 0.982], 'trim', 0.008);
  box(stage, [0.025, 0.05, 1.97], [-1.16, 0.04, 0.05], 'trim', 0.006);
  // A little lavender window echoes the supplied illustration's warm/cool contrast.
  box(stage, [0.70, 0.52, 0.027], [0.15, 0.48, 0.985], 'trim', 0.035);
  box(stage, [0.60, 0.42, 0.018], [0.15, 0.49, 0.966], 'window', 0.02);
  box(stage, [0.035, 0.44, 0.025], [0.15, 0.49, 0.95], 'trim', 0.004);
  box(stage, [0.62, 0.028, 0.025], [0.15, 0.49, 0.95], 'trim', 0.004);
  box(stage, [0.79, 0.045, 0.13], [0.15, 0.235, 0.94], 'trim', 0.008);
  box(stage, [2.0, 0.009, 1.12], [0.02, 0.022, -0.12], 'rug', 0.045);
  // A few quiet stitch marks keep the stage graphic rather than photorealistic.
  for (const x of [-0.91, 0.95]) {
    for (let z = -0.56; z < 0.36; z += 0.11) box(stage, [0.008, 0.002, 0.045], [x, 0.028, z], 'trim', 0.001);
  }

  stage.position.y = -0.027;
  return { group: stage, decorations };
}
