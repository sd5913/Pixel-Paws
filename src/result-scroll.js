// Touch uses native vertical scrolling; mouse users may drag the badge list too.
export function bindResultScroll(list) {
  let drag = null;
  list.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    drag = { id: event.pointerId, y: event.clientY, top: list.scrollTop };
    list.setPointerCapture(event.pointerId); list.classList.add('is-dragging'); event.preventDefault();
  });
  list.addEventListener('pointermove', event => {
    if (drag?.id === event.pointerId) list.scrollTop = drag.top + drag.y - event.clientY;
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) list.addEventListener(type, () => {
    drag = null; list.classList.remove('is-dragging');
  });
}
