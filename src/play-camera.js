export const PLAY_CAMERA = Object.freeze({
  elevation: 50 * Math.PI / 180,
  distance: 3,
  focusHeight: 0.05,
  frameZ: -0.35,
});

export function resizePlayCamera(camera, aspect) {
  const halfHeight = Math.max(1.45, 1.48 / aspect);
  camera.left = -halfHeight * aspect;
  camera.right = halfHeight * aspect;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.updateProjectionMatrix();
}
