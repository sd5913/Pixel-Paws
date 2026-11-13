import {
  BoxGeometry, BufferGeometry, CatmullRomCurve3, Color, DoubleSide, Float32BufferAttribute,
  Group, InstancedMesh, MathUtils, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  Object3D, PlaneGeometry, TubeGeometry, Vector3,
} from 'three';

export function createWindowBackdrop({ height, centerXZ, halfExtentsXZ }) {
  const backdrop = new Group();
  backdrop.name = 'Window and trailing ivy';
  backdrop.position.set(centerXZ[0], height, centerXZ[1] - halfExtentsXZ[1] - 0.19);
  const width = 2 * halfExtentsXZ[0] + 0.24;
  const windowHeight = 1.62;
  const bottom = 0.13;
  const frame = new MeshStandardMaterial({ color: '#e9d4c7', roughness: 0.9 });
  const sill = new MeshStandardMaterial({ color: '#dec1ac', roughness: 0.9 });

  const skyGeometry = new PlaneGeometry(width, windowHeight);
  const skyColors = [...new Color('#9fbfe4'), ...new Color('#9fbfe4'),
    ...new Color('#d9edf7'), ...new Color('#d9edf7')];
  skyGeometry.setAttribute('color', new Float32BufferAttribute(skyColors, 3));
  const sky = new Mesh(skyGeometry, new MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
  sky.position.set(0, bottom + windowHeight / 2, -0.11);
  backdrop.add(sky);

  function addFrame(w, h, d, x, y, material = frame) {
    const piece = new Mesh(new BoxGeometry(w, h, d), material);
    piece.position.set(x, y, 0);
    piece.castShadow = true;
    piece.receiveShadow = true;
    backdrop.add(piece);
  }
  addFrame(width, 0.11, 0.38, 0, bottom, sill);
  const wallBase = new Mesh(new BoxGeometry(2 * halfExtentsXZ[0] + 0.7, height + bottom, 0.24), frame);
  wallBase.position.set(0, (bottom - height) / 2, 0.07);
  wallBase.receiveShadow = true;
  backdrop.add(wallBase);
  addFrame(width, 0.09, 0.13, 0, bottom + 0.12);
  addFrame(width, 0.075, 0.13, 0, bottom + 0.92);
  addFrame(width, 0.09, 0.13, 0, bottom + windowHeight);
  for (const x of [-width / 2, 0, width / 2]) {
    addFrame(0.1, windowHeight, 0.13, x, bottom + windowHeight / 2);
  }

  // Folded leaves give the ivy a low-poly silhouette and cast individual shadows.
  const leafGeometry = new BufferGeometry();
  leafGeometry.setAttribute('position', new Float32BufferAttribute([
    0, -0.07, 0.024, 0, 0.035, 0,
    -0.09, 0.052, 0, -0.126, -0.025, -0.015, -0.071, -0.132, 0,
    0, -0.209, 0.017, 0.071, -0.132, 0, 0.126, -0.025, -0.015, 0.09, 0.052, 0,
  ], 3));
  leafGeometry.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 6, 0, 6, 7, 0, 7, 8, 0, 8, 1]);
  leafGeometry.computeVertexNormals();
  const leavesPerVine = 11;
  const foliage = new InstancedMesh(leafGeometry, new MeshStandardMaterial({
    side: DoubleSide, roughness: 0.9,
  }), 4 * leavesPerVine);
  foliage.castShadow = true;
  foliage.receiveShadow = true;
  backdrop.add(foliage);
  const stem = new MeshStandardMaterial({ color: '#697b3b', roughness: 0.9 });
  const palette = ['#839b48', '#a0ad58', '#6e873d', '#b0b866'].map(value => new Color(value));
  const leaf = new Object3D();

  for (let vine = 0; vine < 4; vine++) {
    const side = vine < 2 ? -1 : 1;
    const outer = vine % 2 === 0;
    const x = side * (width / 2 - (outer ? 0.28 : 0.61));
    const curve = new CatmullRomCurve3([
      new Vector3(x, 1.91, 0.11), new Vector3(x - side * 0.12, 1.42, 0.18),
      new Vector3(x + side * 0.06, 0.86, 0.22),
      new Vector3(x - side * 0.09, outer ? 0.02 : 0.25, 0.38),
    ]);
    const branch = new Mesh(new TubeGeometry(curve, 16, 0.013, 5, false), stem);
    branch.castShadow = true;
    backdrop.add(branch);
    for (let i = 0; i < leavesPerVine; i++) {
      const direction = i % 2 === 0 ? -1 : 1;
      leaf.position.copy(curve.getPoint((i + 0.3) / leavesPerVine));
      leaf.position.x += direction * 0.035;
      leaf.rotation.set(-0.3 + 0.15 * Math.sin(i * 2.1), 0.37 * direction, direction * (0.68 + 0.2 * Math.sin(i)));
      leaf.scale.setScalar(MathUtils.lerp(1.13, 0.68, i / leavesPerVine) * (outer ? 1.08 : 0.86));
      leaf.updateMatrix();
      const index = vine * leavesPerVine + i;
      foliage.setMatrixAt(index, leaf.matrix);
      foliage.setColorAt(index, palette[(i * 3 + vine) % palette.length]);
    }
  }
  return backdrop;
}
