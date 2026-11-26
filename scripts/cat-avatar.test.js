import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { Vector3 } from 'three';
import { parseGlb } from '../src/assets/load-assets.js';
import { createCatAvatar } from '../src/assets/cat-avatar.js';

test('packaged cat loads with independent bones and animated walking', async () => {
  const bytes = await readFile('src/assets/models/mikan-cat.glb');
  const source = await parseGlb(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  assert.deepEqual(source.animations.map(clip => clip.name), ['Idle', 'Walk', 'PawWave']);
  const avatar = await createCatAvatar({ loadModel: async () => source });
  let skin;
  avatar.object.traverse(object => { if (object.isSkinnedMesh) skin = object; });
  assert.ok(skin);
  const bone = avatar.object.getObjectByName('Front_L_Upper');
  assert.notEqual(bone, source.getObjectByName('Front_L_Upper'));
  assert.ok(skin.skeleton.bones.includes(bone));
  avatar.update(0.05, 1, 0);
  const pose = bone.quaternion.clone();
  avatar.update(0.2, 1, 0);
  assert.ok(pose.angleTo(bone.quaternion) > 0.001);
  assert.equal(avatar.object.rotation.y, Math.PI / 2);
  avatar.update(0.2, 0, 0);
  avatar.reset();
  assert.equal(avatar.object.rotation.y, Math.PI);
  avatar.object.updateMatrixWorld(true);
  skin.skeleton.update();
  skin.computeBoundingBox();
  assert.ok(skin.boundingBox.getSize(new Vector3()).toArray().every(Number.isFinite));
  const paw = avatar.object.getObjectByName('Front_R_Upper');
  const initial = paw.quaternion.clone();
  avatar.swat();
  avatar.update(.2, 0, 0);
  assert.ok(initial.angleTo(paw.quaternion) > .01);
  const swatPose = paw.quaternion.clone();
  avatar.update(.05, 1, 0);
  assert.equal(avatar.object.rotation.y, Math.PI / 2, 'moving swat follows the movement direction');
  assert.ok(swatPose.angleTo(paw.quaternion) > .001, 'the swat animation continues while moving');
  avatar.update(.7, 0, 0);
  avatar.update(.2, 0, 0);
  assert.ok(paw.quaternion.toArray().every(Number.isFinite));
  avatar.swat();
  avatar.cancelSwat();
  avatar.reset();
});

test('walking stays continuous between fixed physics steps and returns to idle after stopping', async () => {
  const bytes = await readFile('src/assets/models/mikan-cat.glb');
  const source = await parseGlb(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  const continuous = await createCatAvatar({loadModel:async()=>source});
  const stepped = await createCatAvatar({loadModel:async()=>source});
  for (let i=0;i<77;i++) {
    continuous.update(1/120,.01,0);
    stepped.update(1/120,i%2===0?.02:0,0);
  }
  for (const name of ['Front_L_Upper','Front_R_Upper']) {
    assert.deepEqual(continuous.object.getObjectByName(name).quaternion.toArray(),
      stepped.object.getObjectByName(name).quaternion.toArray(), 'empty physics frames must not restart the stride');
  }
  stepped.swat();
  for(let i=0;i<24;i++) { stepped.update(1/120,.01,0); continuous.update(1/120,.01,0); }
  assert.deepEqual(stepped.object.getObjectByName('Front_R_Upper').quaternion.toArray(),
    continuous.object.getObjectByName('Front_R_Upper').quaternion.toArray(), 'moving swat leaves the walk cycle uninterrupted');
  const idle = await createCatAvatar({loadModel:async()=>source});
  for(let i=0;i<120;i++) { stepped.update(1/120,0,0); idle.update(1/120,0,0); }
  const stoppedPose=stepped.object.getObjectByName('Front_L_Upper').quaternion;
  assert.ok(stoppedPose.angleTo(idle.object.getObjectByName('Front_L_Upper').quaternion)<.01);
});
