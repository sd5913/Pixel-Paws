import * as T from 'three';
import { presets } from '../../experiments/illustrated-rendering/presets.js';

const ramp = new T.DataTexture(new Uint8Array([110, 170, 220, 255]), 4, 1, T.RedFormat);
ramp.minFilter = ramp.magFilter = T.NearestFilter;
ramp.generateMipmaps = false;
ramp.needsUpdate = true;
const identity = () => ({ position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] });
const materials = value => Array.isArray(value) ? value : [value];

export function prepareModel(source, entry) {
  const object = source.clone(true);
  object.scale.fromArray(entry.visualScale);
  const meshes = [];
  object.traverse(mesh => {
    if (!mesh.isMesh) return;
    const original = materials(mesh.material).map(m => m.clone());
    mesh.material = Array.isArray(mesh.material) ? original : original[0];
    mesh.castShadow = entry.render.castShadow;
    mesh.receiveShadow = entry.render.receiveShadow;
    meshes.push({ mesh, original: mesh.material });
  });
  return { object, meshes };
}

export function setModelStyle(record, { mode, preset = 'warm-illustrated', wireframe = false }) {
  for (const { mesh, original } of record.meshes) {
    for (const material of materials(mesh.material)) if (!materials(original).includes(material)) material.dispose();
    const styled = materials(original).map(source => {
      if (mode === 'inspection') { source.wireframe = wireframe; return source; }
      const p = presets[preset];
      if (!p) throw new Error(`Unknown preset: ${preset}`);
      const options = { color: source.color.clone(), vertexColors: source.vertexColors,
        map: source.map, alphaMap: source.alphaMap, side: source.side, opacity: source.opacity,
        transparent: source.transparent, alphaTest: source.alphaTest, wireframe };
      const material = preset === 'faceted-diorama'
        ? new T.MeshToonMaterial({ ...options, gradientMap: ramp }) : new T.MeshLambertMaterial(options);
      const tint = new T.Color(p.tint);
      material.onBeforeCompile = shader => {
        shader.uniforms.paintTint = { value: tint }; shader.uniforms.paintWash = { value: p.wash };
        shader.fragmentShader = 'uniform vec3 paintTint; uniform float paintWash;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>',
          '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, paintTint, paintWash);');
      };
      material.customProgramCacheKey = () => `viewer-paint-${preset}`;
      return material;
    });
    mesh.material = Array.isArray(original) ? styled : styled[0];
  }
}

export function modelMetadata(record, entry) {
  const bounds = new T.Box3().setFromObject(record.object);
  const dimensions = bounds.getSize(new T.Vector3()).toArray();
  let triangles = 0, vertices = 0;
  const materialSet = new Set();
  for (const { mesh, original } of record.meshes) {
    vertices += mesh.geometry.attributes.position.count;
    triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3;
    for (const material of materials(original)) materialSet.add(material.uuid);
  }
  return { dimensions, triangles, vertices, materials: materialSet.size,
    boundsMatch: dimensions.every((n, i) => Math.abs(n - entry.dimensionsMeters[i]) < 1e-6),
    front: entry.visualFront || '-Z', approvedSha256: entry.approvedSha256 || null };
}

export function createColliderLayer(entry, transform = identity()) {
  const group = new T.Group();
  group.name = `colliders:${entry.id}`;
  group.position.fromArray(transform.position); group.quaternion.fromArray(transform.rotation);
  // Manifest colliders are already measured after visualScale. Apply instance scale only.
  group.scale.fromArray(transform.scale);
  const warnings = [];
  for (const collider of entry.colliders) {
    let geometry;
    switch (collider.type) {
      case 'none': continue;
      case 'box': geometry = new T.BoxGeometry(...collider.halfExtents.map(n => n * 2)); break;
      case 'sphere': geometry = new T.SphereGeometry(collider.radius, 16, 10); break;
      case 'cylinder': geometry = new T.CylinderGeometry(collider.radius, collider.radius, collider.halfHeight * 2, 16); break;
      case 'capsule': geometry = new T.CapsuleGeometry(collider.radius, collider.halfHeight * 2, 4, 16); break;
      default: warnings.push(`${entry.id}: ${collider.type} visualization is unsupported; see includeNodes metadata.`); continue;
    }
    const mesh = new T.Mesh(geometry, new T.MeshBasicMaterial({ color: '#4eaa9b', wireframe: true,
      transparent: true, opacity: 0.8, depthTest: false, toneMapped: false }));
    mesh.position.fromArray(collider.center); mesh.renderOrder = 20;
    group.add(mesh);
  }
  return { group, warnings };
}

export function frameCamera(camera, bounds, aspect, elevation = 70, azimuth = 150) {
  if (!(aspect > 0) || bounds.isEmpty()) return new T.Vector3();
  const center = bounds.getCenter(new T.Vector3());
  const radius = Math.max(bounds.getSize(new T.Vector3()).length() / 2, 0.001);
  const halfHeight = radius * 1.12 / Math.min(aspect, 1);
  Object.assign(camera, { left: -halfHeight * aspect, right: halfHeight * aspect,
    top: halfHeight, bottom: -halfHeight, near: 0.001, far: radius * 20 + 10, zoom: 1 });
  const e = T.MathUtils.degToRad(elevation), a = T.MathUtils.degToRad(azimuth);
  camera.position.set(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a))
    .multiplyScalar(radius * 4 + 1).add(center);
  camera.lookAt(center); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  return center;
}

export function selectionInstances(selection, manifest, layout) {
  if (selection === 'desk-scene') return structuredClone(layout.instances);
  const entry = manifest.assets.find(a => a.id === selection);
  if (!entry) throw new Error(`Unknown asset: ${selection}`);
  return [{ id: `inspect-${entry.id}`, assetId: entry.id, transform: identity(), physics: { bodyType: entry.physics.bodyType, colliderSet: 'default' } }];
}

export function disposeLayer(group) {
  group.traverse(child => {
    child.geometry?.dispose();
    if (child.material) for (const material of materials(child.material)) material.dispose();
  });
  group.clear();
}
