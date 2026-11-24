export function createFloorContactAudio(physics, floorCollider, audio) {
  const landed = new Set();
  const hit = new Set();
  let catBody = null;

  function isTouching(first, second) {
    let touching = false;
    physics.world.contactPair(first, second, manifold => {
      for (let i = 0; i < manifold.numContacts(); i++) {
        if (manifold.contactDist(i) <= .006) touching = true;
      }
    });
    return touching;
  }
  function notifyHit(body) {
    if (!audio || !body?.isDynamic() || !body.userData?.floorAsset
      || body.userData.floorAsset === 'player-cat' || hit.has(body.handle) || landed.has(body.handle)) return;
    hit.add(body.handle);
    if(audio.playObjectContact)audio.playObjectContact(body.userData.floorAsset+':'+body.handle,false);
    else audio.playUISound('floor-pop',.85);
  }
  return {
    setCatBody(body) { catBody = body; },
    notifyHit,
    update() {
      if (!audio) return;
      if (catBody) {
        for (let i = 0; i < catBody.numColliders(); i++) {
          const catCollider = catBody.collider(i);
          physics.world.contactPairsWith(catCollider, collider => {
            if (isTouching(catCollider, collider)) notifyHit(collider.parent());
          });
        }
      }
      physics.world.contactPairsWith(floorCollider, collider => {
        const body = collider.parent();
        if (!body?.isDynamic() || landed.has(body.handle)
          || body.userData?.floorAsset === 'player-cat' || !isTouching(floorCollider, collider)) return;
        landed.add(body.handle);
        if (!body.userData?.floorAsset) return;
        if(audio.playObjectContact)audio.playObjectContact(body.userData.floorAsset+':'+body.handle,true);
        else audio.playUISound('floor-pop',1);
      });
    },
    reset() { landed.clear(); hit.clear(); audio?.resetObjectContactSounds?.(); },
  };
}
