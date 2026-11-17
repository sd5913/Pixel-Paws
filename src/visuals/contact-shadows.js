import * as T from 'three';

export function createContactShadows(scene, instances, player, surface) {
  const size = 64, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const r = Math.hypot((x + .5) / size * 2 - 1, (y + .5) / size * 2 - 1);
    const i = (y * size + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = 255;
    data[i + 3] = Math.round(255 * Math.pow(Math.max(0, 1 - r), 2));
  }
  const texture = new T.DataTexture(data, size, size); texture.needsUpdate = true;
  texture.magFilter = texture.minFilter = T.LinearFilter;
  const geometry = new T.PlaneGeometry(1, 1), entries = [];
  const add = (object, width, depth, baseY, center = [0, 0, 0]) => {
    const mesh = new T.Mesh(geometry, new T.MeshBasicMaterial({ color: '#51435d', map: texture,
      transparent: true, opacity: .27, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
    mesh.name = 'Soft contact shadow'; mesh.rotation.x = -Math.PI / 2;
    mesh.scale.set(width, depth, 1); mesh.renderOrder = 1; scene.add(mesh);
    entries.push({ object, mesh, baseY, center });
  };
  for (const instance of instances.filter(item => item.physics.bodyType === 'dynamic')) {
    const half = instance.bounds.halfExtents, scale = instance.object3D.scale;
    add(instance.object3D, Math.max(.11, half[0] * scale.x * 2.3), Math.max(.11, half[2] * scale.z * 2.3),
      instance.initialTransform.position[1], instance.bounds.center);
  }
  add(player, .64, .72, surface.height);
  const center = new T.Vector3();
  return {
    update() {
      for (const entry of entries) {
        const { object, mesh } = entry, altitude = object.position.y - entry.baseY;
        mesh.visible = object.position.y >= surface.height - .07 && altitude < .9;
        mesh.material.opacity = .28 * Math.max(0, 1 - Math.max(0, altitude) / .9);
        object.updateMatrixWorld(true);
        center.fromArray(entry.center).applyMatrix4(object.matrixWorld);
        mesh.position.set(center.x, surface.height + .003, center.z);
      }
    },
    dispose() { for (const { mesh } of entries) { mesh.removeFromParent(); mesh.material.dispose(); } geometry.dispose(); texture.dispose(); },
  };
}
