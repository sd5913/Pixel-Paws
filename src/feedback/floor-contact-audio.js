export function floorSoundKind(id='') {
  id=id.toLowerCase();
  if(/glass|vase|ink-bottle|jam|spice|jug/.test(id))return 'glass';
  if(/mug|ceramic|bowl|cake-stand|holder/.test(id))return 'ceramic';
  if(/whisk|utensil|cutter|scale|metal/.test(id))return 'metal';
  if(/book|mitt|egg|piping|chips|candy|tissue|chocolate|eraser|cake|spatula/.test(id))return 'soft';
  return 'wood';
}

export function createFloorContactAudio(physics,floorCollider,audio) {
  const played=new Set();
  let nextSoundAt=0;
  return {
    update(){
      if(!audio)return;
      const now=audio.listener?.context.currentTime??0;
      physics.world.contactPairsWith(floorCollider,collider=>{
        const body=collider.parent();
        if(!body?.isDynamic()||played.has(body.handle)||body.userData?.floorAsset==='player-cat')return;
        let touching=false;
        physics.world.contactPair(floorCollider,collider,manifold=>{
          for(let i=0;i<manifold.numContacts();i++)if(manifold.contactDist(i)<=.006)touching=true;
        });
        if(!touching)return;
        played.add(body.handle);
        // Ignore fragments and suppress simultaneous cascades rather than queueing sound.
        if(!body.userData?.floorAsset||now<nextSoundAt)return;
        const kind=floorSoundKind(body.userData.floorAsset);
        if(audio.playUISound('floor-'+kind,1))nextSoundAt=now+.14;
      });
    },
    reset(){played.clear();nextSoundAt=0;},
  };
}
