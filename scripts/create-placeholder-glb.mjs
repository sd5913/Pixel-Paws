import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const outputPath = resolve('src/assets/models/placeholder-crate.glb');

const faces = [
  { normal: [0, 0, 1], vertices: [[-0.5, 0, 0.5], [0.5, 0, 0.5], [0.5, 1, 0.5], [-0.5, 1, 0.5]] },
  { normal: [0, 0, -1], vertices: [[0.5, 0, -0.5], [-0.5, 0, -0.5], [-0.5, 1, -0.5], [0.5, 1, -0.5]] },
  { normal: [1, 0, 0], vertices: [[0.5, 0, 0.5], [0.5, 0, -0.5], [0.5, 1, -0.5], [0.5, 1, 0.5]] },
  { normal: [-1, 0, 0], vertices: [[-0.5, 0, -0.5], [-0.5, 0, 0.5], [-0.5, 1, 0.5], [-0.5, 1, -0.5]] },
  { normal: [0, 1, 0], vertices: [[-0.5, 1, 0.5], [0.5, 1, 0.5], [0.5, 1, -0.5], [-0.5, 1, -0.5]] },
  { normal: [0, -1, 0], vertices: [[-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5]] },
];

const positions = new Float32Array(faces.flatMap((face) => face.vertices.flat()));
const normals = new Float32Array(faces.flatMap((face) => face.vertices.flatMap(() => face.normal)));
const indices = new Uint16Array(faces.flatMap((_, faceIndex) => {
  const first = faceIndex * 4;
  return [first, first + 1, first + 2, first, first + 2, first + 3];
}));

const binary = Buffer.alloc(positions.byteLength + normals.byteLength + indices.byteLength);
Buffer.from(positions.buffer).copy(binary, 0);
Buffer.from(normals.buffer).copy(binary, positions.byteLength);
Buffer.from(indices.buffer).copy(binary, positions.byteLength + normals.byteLength);

const gltf = {
  asset: { version: '2.0', generator: 'Pixel Paws placeholder generator' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ name: 'PlaceholderCrate', mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 }] }],
  materials: [{
    name: 'PlaceholderMaterial',
    pbrMetallicRoughness: {
      baseColorFactor: [0.95, 0.55, 0.24, 1],
      metallicFactor: 0,
      roughnessFactor: 0.8,
    },
  }],
  buffers: [{ byteLength: binary.byteLength }],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: positions.byteLength, target: 34962 },
    { buffer: 0, byteOffset: positions.byteLength, byteLength: normals.byteLength, target: 34962 },
    { buffer: 0, byteOffset: positions.byteLength + normals.byteLength, byteLength: indices.byteLength, target: 34963 },
  ],
  accessors: [
    { bufferView: 0, componentType: 5126, count: positions.length / 3, type: 'VEC3', min: [-0.5, 0, -0.5], max: [0.5, 1, 0.5] },
    { bufferView: 1, componentType: 5126, count: normals.length / 3, type: 'VEC3' },
    { bufferView: 2, componentType: 5123, count: indices.length, type: 'SCALAR', min: [0], max: [23] },
  ],
};

const json = Buffer.from(JSON.stringify(gltf));
const jsonPadding = (4 - (json.byteLength % 4)) % 4;
const paddedJson = Buffer.concat([json, Buffer.alloc(jsonPadding, 0x20)]);
const totalLength = 12 + 8 + paddedJson.byteLength + 8 + binary.byteLength;
const glb = Buffer.alloc(totalLength);

glb.writeUInt32LE(0x46546c67, 0);
glb.writeUInt32LE(2, 4);
glb.writeUInt32LE(totalLength, 8);
glb.writeUInt32LE(paddedJson.byteLength, 12);
glb.writeUInt32LE(0x4e4f534a, 16);
paddedJson.copy(glb, 20);
const binaryHeaderOffset = 20 + paddedJson.byteLength;
glb.writeUInt32LE(binary.byteLength, binaryHeaderOffset);
glb.writeUInt32LE(0x004e4942, binaryHeaderOffset + 4);
binary.copy(glb, binaryHeaderOffset + 8);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, glb);
console.log(`Wrote ${outputPath} (${glb.byteLength} bytes)`);
