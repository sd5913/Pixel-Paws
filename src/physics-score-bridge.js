import { createEventBus } from './feedback/events.js';

// Retain the existing independent topple bonus; ordinary impacts never award it.
export const PHYSICS_SCORE_EVENTS = Object.freeze({
  'tipped-over': 'objectKnockedOver',
  fallen: 'objectFellOffTable',
});

export function connectPhysicsScoring(events, scoring) {
  const bus = events.bus ?? createEventBus();
  const off = [
    events.on('tipped-over', event => {
      if (!event.isObstacle) scoring.notifyToppled(event.objectId);
    }),
    // The existing detector means the body has dropped 0.5 m below its initial height.
    events.on('fallen', event => {
      if (!event.isObstacle) bus.emit('game:object-cleared', { objectId: event.objectId });
    }),
    bus.on('game:object-cleared', event => scoring.notifyFallen(event.objectId)),
    bus.on('physics:impact', event => {
      if (event.isObstacle) bus.emit('game:obstacle-hit', event);
    }),
  ];
  return () => off.forEach(unsubscribe => unsubscribe());
}
