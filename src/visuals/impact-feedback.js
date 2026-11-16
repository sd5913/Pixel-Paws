import * as T from 'three';

// Fixed pools: no per-frame geometry allocation, no changes to physical poses.
export function createImpactFeedback(scene, { reducedMotion = false } = {}) {
  const group = new T.Group(); group.name = 'Paw impact feedback'; scene.add(group);
  const capacity = 48, geometry = new T.IcosahedronGeometry(.014, 0);
  const material = new T.MeshBasicMaterial({ color: '#ffe5aa', toneMapped: false });
  const mesh = new T.InstancedMesh(geometry, material, capacity);
  mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); mesh.frustumCulled = false; group.add(mesh);
  const dummy = new T.Object3D(), particles = Array.from({ length: capacity }, () => ({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 }));
  let cursor = 0, kick = 0, elapsed = 0;
  const pulses = new Map(), rings = [];
  const ringGeometry = new T.RingGeometry(.055, .066, 20);
  for (let i = 0; i < 4; i++) {
    const ring = new T.Mesh(ringGeometry, new T.MeshBasicMaterial({ color: '#fff0cf', transparent: true,
      opacity: 0, side: T.DoubleSide, depthWrite: false, toneMapped: false }));
    ring.visible = false; group.add(ring); rings.push({ ring, life: 0 });
  }
  function burst(position, strength = .3, object = null, direct = false) {
    if (reducedMotion || !Number.isFinite(strength) || !position
      || !Number.isFinite(position.x + position.y + position.z)) return;
    const power = T.MathUtils.clamp(strength, .08, 1);
    for (let i = 0; i < (direct ? 9 : 5); i++) {
      const p = particles[cursor++ % capacity], angle = i * 2.399 + elapsed;
      Object.assign(p, { life: .36, x: position.x, y: position.y + .025, z: position.z,
        vx: Math.cos(angle) * (.22 + power * .22), vy: .3 + (i % 3) * .12,
        vz: Math.sin(angle) * (.22 + power * .22) });
    }
    if (direct) {
      kick = Math.min(.012, kick + .008);
      const entry = rings.find(item => item.life <= 0) ?? rings[0];
      entry.life = .25; entry.ring.position.copy(position); entry.ring.rotation.x = -Math.PI / 2;
      entry.ring.position.y += .035;
    } else if (power > .3) kick = Math.max(kick, .004);
    if (object && !pulses.has(object)) pulses.set(object, { life: .14, scale: object.scale.clone() });
  }
  function reset() {
    kick = 0;
    for (const p of particles) p.life = 0;
    for (const entry of rings) { entry.life = 0; entry.ring.visible = false; }
    for (const [object, state] of pulses) object.scale.copy(state.scale);
    pulses.clear();
  }
  const api = {
    burst, reset,
    update(delta, camera) {
      elapsed += delta;
      for (let i = 0; i < capacity; i++) {
        const p = particles[i]; p.life = Math.max(0, p.life - delta);
        if (p.life) { p.vy -= delta * 1.9; p.x += p.vx * delta; p.y += p.vy * delta; p.z += p.vz * delta; }
        dummy.position.set(p.x, p.y, p.z); dummy.scale.setScalar(p.life ? p.life / .36 : 0);
        dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      for (const entry of rings) {
        entry.life = Math.max(0, entry.life - delta); entry.ring.visible = entry.life > 0;
        entry.ring.scale.setScalar(1 + (1 - entry.life / .25) * 3);
        entry.ring.material.opacity = entry.life / .25 * .6;
      }
      for (const [object, state] of pulses) {
        state.life -= delta;
        if (state.life <= 0) { object.scale.copy(state.scale); pulses.delete(object); continue; }
        const pulse = Math.sin((1 - state.life / .14) * Math.PI) * .025;
        object.scale.set(state.scale.x * (1 + pulse), state.scale.y * (1 - pulse), state.scale.z * (1 + pulse));
      }
      if (camera && kick > .0001) {
        camera.position.x += Math.sin(elapsed * 110) * kick;
        camera.position.y += Math.cos(elapsed * 95) * kick * .65;
        kick *= Math.exp(-delta * 24);
      }
    },
    dispose() { reset(); group.removeFromParent(); geometry.dispose(); material.dispose(); ringGeometry.dispose(); for (const { ring } of rings) ring.material.dispose(); },
  };
  api.update(0);
  return api;
}
