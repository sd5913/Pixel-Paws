// Clearance is relative to the play surface, never an imported model's pivot.
export function hasLeftRoundTable(bounds, tableHeight, tableRadius) {
  if (!bounds || bounds.min.x > bounds.max.x) return false;
  if (bounds.max.y < tableHeight - 0.1) return true;
  const x = Math.max(bounds.min.x, Math.min(0, bounds.max.x));
  const z = Math.max(bounds.min.z, Math.min(0, bounds.max.z));
  return Math.hypot(x, z) > tableRadius + 0.02;
}

export function loosePartHasLeftTable(position, tableHeight, tableRadius) {
  return position.y < tableHeight - 0.1 || Math.hypot(position.x, position.z) > tableRadius + 0.12;
}
