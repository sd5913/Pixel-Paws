import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3, Quaternion, Box3 } from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { bodyHasLeftRoundTable, footprintHasLeftRoundTable } from '../src/round-table-footprint.js';
import { hasLeftRoundTable, loosePartHasLeftTable } from '../src/table-clearance.js';

function corners(center, half, angle=0) {
  const q=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),angle),points=[];
  for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])points.push(new Vector3(x*half.x,y*half.y,z*half.z).applyQuaternion(q).add(center));
  return points;
}

test('a diagonal prop outside the circular tabletop clears despite overlapping AABB', () => {
  const points=corners(new Vector3(1.5,.8,1.5),new Vector3(.7,.04,.1),Math.PI/4);
  assert.equal(hasLeftRoundTable(new Box3().setFromPoints(points),.78,1.95),false);
  assert.equal(footprintHasLeftRoundTable(points,.78,1.95),true);
  assert.equal(footprintHasLeftRoundTable(corners(new Vector3(1.3,.8,1.3),new Vector3(.7,.04,.1),Math.PI/4),.78,1.95),false);
});

test('tiny pieces outside the edge clear without an unrelated 12cm margin', () => {
  const center=new Vector3(2.015,.8,0);
  assert.equal(loosePartHasLeftTable(center,.78,1.95),false);
  assert.equal(footprintHasLeftRoundTable(corners(center,new Vector3(.01,.01,.01)),.78,1.95),true);
  assert.equal(footprintHasLeftRoundTable(corners(new Vector3(0,.8,0),new Vector3(.01,.01,.01)),.78,1.95),false);
});

test('physical collider offsets and rotations, not model origins, drive round clearance', async () => {
  await RAPIER.init(); const world=new RAPIER.World({x:0,y:-9.81,z:0});
  try {
    const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(1.5,.8,1.5));
    const q=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),Math.PI/4);
    world.createCollider(RAPIER.ColliderDesc.cuboid(.7,.04,.1).setRotation(q),body);
    assert.equal(bodyHasLeftRoundTable(body,.78,1.95),true);
    body.setTranslation({x:0,y:.8,z:0},true);
    assert.equal(bodyHasLeftRoundTable(body,.78,1.95),false);
    body.setTranslation({x:0,y:.1,z:0},true);
    assert.equal(bodyHasLeftRoundTable(body,.78,1.95),true);
  } finally { world.free(); }
});
