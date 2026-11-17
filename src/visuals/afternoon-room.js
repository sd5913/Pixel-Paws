import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Decorative environment only: everything stays outside the playable desk.
export function createAfternoonRoom(surface) {
  const root = new T.Group();
  root.name = 'Afternoon study — decorative room';
  const materials = new Map();
  const mat = color => {
    if (!materials.has(color)) materials.set(color, new T.MeshStandardMaterial({ color, roughness: .88 }));
    return materials.get(color);
  };
  function box(name, size, position, color, shadow = true) {
    const mesh = new T.Mesh(new T.BoxGeometry(...size), mat(color));
    mesh.name = name; mesh.position.set(...position);
    mesh.castShadow = shadow; mesh.receiveShadow = true; root.add(mesh); return mesh;
  }
  const [cx, cz] = surface.centerXZ, [hx, hz] = surface.halfExtentsXZ;
  const rear = cz - hz - .52;
  box('Warm plaster wall', [12, 5, .15], [cx, 2.1, rear], '#d8cbb8', false);
  box('Cream skirting', [12, .12, .12], [cx, .09, rear + .12], '#eee0c5', false);
  // Subdued board seams and staggered ends add room depth, without a texture download.
  for (let i = -10; i <= 10; i++) {
    box('Floorboard seam', [.012, .003, 16], [i * .56, -.006, 0], '#b6a38f', false);
    for (const z of [-4.2, -.2, 3.8]) box('Floorboard joint', [.54, .003, .009],
      [i * .56, -.005, z + (i % 2 ? 1.6 : 0)], '#bcaa94', false);
  }
  const shelfX = cx - hx - .72;
  for (const y of [.2, .95, 1.7]) box('Oak bookshelf', [1.02, .07, .5], [shelfX, y, rear + .36], '#b99470');
  for (const side of [-1, 1]) box('Bookcase upright', [.06, 1.75, .49], [shelfX + side * .49, .87, rear + .36], '#bd9b77');
  const colors = ['#9aa99a', '#c18f81', '#a6afc3', '#d6bd91', '#8f9baf'];
  for (let i = 0; i < 8; i++) {
    const x = shelfX - .36 + i * .095, h = .35 + .08 * Math.sin(i * 2.4);
    const book = box('Pastel book', [.075, h, .29], [x, .99 + h / 2, rear + .37], colors[i % colors.length]);
    book.rotation.z = i === 7 ? -.12 : 0;
    box('Book spine label', [.045, .018, .004], [x, 1.12, rear + .518], '#efe2c7', false);
  }
  // Simple framed abstract print, softly colored so gameplay keeps visual priority.
  const pictureX = cx + hx + .62;
  box('Picture oak frame', [.78, .98, .06], [pictureX, 1.85, rear + .12], '#b49170');
  box('Picture paper', [.67, .87, .012], [pictureX, 1.85, rear + .158], '#f0e4cc', false);
  const disc = new T.Mesh(new T.CircleGeometry(.19, 24), mat('#d7a57b'));
  disc.position.set(pictureX + .06, 2, rear + .17); root.add(disc);
  box('Print sage horizon', [.53, .15, .008], [pictureX, 1.62, rear + .175], '#99ab9b', false);
  function plant(x, y, z, scale = 1) {
    const group = new T.Group(); group.name = 'Sage plant outside play area'; group.position.set(x, y, z); group.scale.setScalar(scale);
    const pot = new T.Mesh(new T.CylinderGeometry(.14, .105, .22, 10), mat('#bd8270'));
    pot.position.y = .11; pot.castShadow = true; group.add(pot);
    const soil = new T.Mesh(new T.CylinderGeometry(.125, .125, .012, 10), mat('#6f6655'));
    soil.position.y = .222; group.add(soil);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.399, leaf = new T.Mesh(new T.IcosahedronGeometry(.12, 0), mat(i % 2 ? '#93a779' : '#718e70'));
      leaf.scale.set(.6, 2.2, .35); leaf.position.set(Math.cos(a) * .09, .37 + (i % 3) * .09, Math.sin(a) * .09);
      leaf.rotation.set(.3 * Math.cos(a), a, .5 * Math.sin(a)); leaf.castShadow = true; group.add(leaf);
    }
    root.add(group);
  }
  plant(shelfX, 1.74, rear + .35, .8);
  plant(cx + hx + .66, 0, cz - .5, 2.1);
  // Batch static decoration by material/shadow state for mobile draw-call cost.
  root.updateMatrixWorld(true);
  const meshes = [], batches = new Map();
  root.traverse(object => { if (object.isMesh) meshes.push(object); });
  for (const mesh of meshes) {
    const key = `${mesh.material.uuid}:${mesh.castShadow}`;
    if (!batches.has(key)) batches.set(key, { material: mesh.material, shadow: mesh.castShadow, geometries: [] });
    const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    geometry.applyMatrix4(mesh.matrixWorld);
    batches.get(key).geometries.push(geometry);
    mesh.removeFromParent(); mesh.geometry.dispose();
  }
  for (const { material, shadow, geometries } of batches.values()) {
    const geometry = mergeGeometries(geometries);
    for (const source of geometries) source.dispose();
    const mesh = new T.Mesh(geometry, material);
    mesh.name = 'Batched decorative room'; mesh.castShadow = shadow; mesh.receiveShadow = true;
    root.add(mesh);
  }
  root.userData.decorative = true;
  root.userData.dispose = () => {
    root.removeFromParent();
    root.traverse(object => object.geometry?.dispose());
    for (const material of materials.values()) material.dispose();
  };
  return root;
}

export function createWoodGrainTexture() {
  const size = 256, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const grain = Math.sin(y * .41 + Math.sin(x * .025) * 1.8)
      + .38 * Math.sin(y * 1.7 + Math.sin(x * .049));
    const value = Math.round(244 + grain * 5);
    const i = (y * size + x) * 4;
    data[i] = value; data[i + 1] = value; data[i + 2] = value - 2; data[i + 3] = 255;
  }
  const texture = new T.DataTexture(data, size, size);
  texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.repeat.set(3, 4); texture.magFilter = T.LinearFilter;
  texture.minFilter = T.LinearMipmapLinearFilter; texture.generateMipmaps = true; texture.needsUpdate = true;
  return texture;
}

export function styleStudyMaterials(instances) {
  const wood = createWoodGrainTexture(), cloned = new Map();
  for (const instance of instances) {
    if (instance.assetId === 'mug') continue; // Keep the approved ceramic reference intact.
    instance.object3D.traverse(mesh => {
      if (!mesh.isMesh) return;
      const tune = original => {
        if (cloned.has(original)) return cloned.get(original);
        const material = original.clone();
        const name = original.name.toLowerCase();
        material.metalness = 0;
        if (instance.assetId === 'desk' && name.includes('tabletop')) {
          material.map = wood; material.roughness = .77;
          material.color.set('#c8a47b');
        } else if (name.includes('glass')) {
          material.roughness = .23; material.envMapIntensity = .6;
        } else if (name.includes('rubber')) material.roughness = .96;
        else if (name.includes('paper') || name.includes('sleeve')) material.roughness = .9;
        else if (name.includes('enamel') || name.includes('porcelain')) material.roughness = .5;
        material.needsUpdate = true; cloned.set(original, material); return material;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(tune) : tune(mesh.material);
    });
  }
  return { dispose() { wood.dispose(); for (const material of cloned.values()) material.dispose(); } };
}
