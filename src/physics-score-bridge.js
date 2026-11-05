// Game logic maps shared physics events to independent scoring events.
export const PHYSICS_SCORE_EVENTS = Object.freeze({
  'tipped-over': 'objectKnockedOver',
  fallen: 'objectFellOffTable',
});

export function connectPhysicsScoring(events, scoring) {
  const off = [
    events.on('tipped-over', event => scoring.notifyToppled(event.objectId)),
    events.on('fallen', event => scoring.notifyFallen(event.objectId)),
  ];
  return () => off.forEach(unsubscribe => unsubscribe());
}
