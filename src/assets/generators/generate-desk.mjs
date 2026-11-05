/** Deterministic cozy study desk authoring; meters, Y-up, -Z front, bottom-center origin. */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(buffer => {
      this.result = buffer;
      this.onloadend?.();
    });
  }

  readAsDataURL(blob) {
    blob.arrayBuffer().then(buffer => {
      this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`;
      this.onloadend?.();
    });
  }
};

const PARAMETERS = Object.freeze({
  dimensionsMeters: [1.8, 0.75, 0.9],
  tabletop: { size: [1.8, 0.1, 0.9], center: [0, 0.7, 0], radius: 0.045 },
  leg: { size: [0.16, 0.65, 0.16], y: 0.325, x: 0.72, z: 0.31, radius: 0.035 },
  frontBackApron: { size: [1.48, 0.12, 0.1], y: 0.59, z: 0.36, radius: 0.025 },
  sideApron: { size: [0.1, 0.12, 0.62], y: 0.59, x: 0.76, radius: 0.025 },
  drawerBody: { size: [0.62, 0.15, 0.38], center: [0, 0.55, -0.2], radius: 0.025 },
  drawerFront: { size: [0.66, 0.18, 0.035], center: [0, 0.55, -0.43], radius: 0.02 },
  drawerPull: { size: [0.18, 0.035, 0.012], center: [0, 0.55, -0.443], radius: 0.012 },
  roundedSegments: 2,
});

const COLORS = Object.freeze({
  oatWood: '#C8AA86',
  softSage: '#A9BBA0',
  warmCream: '#FFF0D7',
});

function flatRoundedBox(size, center, radius) {
  const source = new RoundedBoxGeometry(...size, PARAMETERS.roundedSegments, radius);
  const geometry = source.index ? source.toNonIndexed() : source.clone();
  geometry.computeVertexNormals();
  geometry.translate(...center);
  return geometry;
}

function paint(geometry, color) {
  const linear = new T.Color(color);
  const colors = [];
  for (let index = 0; index < geometry.attributes.position.count; index += 1) {
    colors.push(linear.r, linear.g, linear.b);
  }
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  return geometry;
}

function addPair(target, size, axis, amount, y, radius, color = COLORS.oatWood) {
  for (const sign of [-1, 1]) {
    const center = axis === 'x' ? [sign * amount, y, 0] : [0, y, sign * amount];
    target.push(paint(flatRoundedBox(size, center, radius), color));
  }
}

function buildDesk() {
  const group = new T.Group();
  group.name = 'Cozy Study Desk';

  const tabletopMaterial = new T.MeshStandardMaterial({
    name: 'Oat wood tabletop', color: COLORS.oatWood, roughness: 0.78, metalness: 0,
  });
  const drawerMaterial = new T.MeshStandardMaterial({
    name: 'Soft sage drawer', color: COLORS.softSage, roughness: 0.78, metalness: 0,
  });
  const frameMaterial = new T.MeshStandardMaterial({
    name: 'Warm wood frame and cream pull', color: 0xffffff, vertexColors: true,
    roughness: 0.82, metalness: 0,
  });

  const tabletop = new T.Mesh(
    flatRoundedBox(PARAMETERS.tabletop.size, PARAMETERS.tabletop.center, PARAMETERS.tabletop.radius),
    tabletopMaterial,
  );
  tabletop.name = 'Rounded oat wood tabletop';

  const frameParts = [];
  for (const x of [-PARAMETERS.leg.x, PARAMETERS.leg.x]) {
    for (const z of [-PARAMETERS.leg.z, PARAMETERS.leg.z]) {
      frameParts.push(paint(
        flatRoundedBox(PARAMETERS.leg.size, [x, PARAMETERS.leg.y, z], PARAMETERS.leg.radius),
        COLORS.oatWood,
      ));
    }
  }
  addPair(
    frameParts, PARAMETERS.frontBackApron.size, 'z', PARAMETERS.frontBackApron.z,
    PARAMETERS.frontBackApron.y, PARAMETERS.frontBackApron.radius,
  );
  addPair(
    frameParts, PARAMETERS.sideApron.size, 'x', PARAMETERS.sideApron.x,
    PARAMETERS.sideApron.y, PARAMETERS.sideApron.radius,
  );
  frameParts.push(paint(
    flatRoundedBox(PARAMETERS.drawerBody.size, PARAMETERS.drawerBody.center, PARAMETERS.drawerBody.radius),
    COLORS.oatWood,
  ));
  frameParts.push(paint(
    flatRoundedBox(PARAMETERS.drawerPull.size, PARAMETERS.drawerPull.center, PARAMETERS.drawerPull.radius),
    COLORS.warmCream,
  ));
  const frame = new T.Mesh(mergeGeometries(frameParts, false), frameMaterial);
  frame.name = 'Chunky legs, aprons, drawer body and cream pull';

  const drawer = new T.Mesh(
    flatRoundedBox(PARAMETERS.drawerFront.size, PARAMETERS.drawerFront.center, PARAMETERS.drawerFront.radius),
    drawerMaterial,
  );
  drawer.name = 'Soft sage study drawer front';

  group.add(tabletop, frame, drawer);
  group.userData = {
    units: 'meters',
    upAxis: 'Y',
    front: '-Z',
    pivotConvention: 'bottom center',
    tabletopHeightMeters: 0.75,
    dimensionsMeters: PARAMETERS.dimensionsMeters,
    style: 'Cozy Stylized Low-Poly Diorama',
  };
  return group;
}

function outputDirectory() {
  const option = process.argv.find(argument => argument.startsWith('--output-dir='));
  return option
    ? resolve(option.slice('--output-dir='.length))
    : fileURLToPath(new URL('../', import.meta.url));
}

const output = outputDirectory();
await mkdir(resolve(output, 'models'), { recursive: true });
const desk = buildDesk();
const scene = new T.Scene();
scene.add(desk);
const data = await new GLTFExporter().parseAsync(scene, { binary: true, onlyVisible: true });
const bytes = Buffer.from(data);
await writeFile(resolve(output, 'models/desk.glb'), bytes);

const bounds = new T.Box3().setFromObject(desk, true);
const dimensions = bounds.getSize(new T.Vector3());
let triangles = 0;
let vertices = 0;
desk.traverse(object => {
  if (!object.isMesh) return;
  const count = object.geometry.index?.count ?? object.geometry.attributes.position.count;
  triangles += count / 3;
  vertices += object.geometry.attributes.position.count;
});
const spec = {
  generatorVersion: 1,
  parameters: PARAMETERS,
  palette: COLORS,
  triangles,
  vertices,
  dimensionsMeters: dimensions.toArray(),
  bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
  bytes: bytes.length,
  materials: 3,
  drawCalls: 3,
  textures: 0,
  tabletopHeightMeters: 0.75,
};
await writeFile(resolve(output, 'desk-spec.json'), `${JSON.stringify(spec, null, 2)}\n`);
console.log(spec);
