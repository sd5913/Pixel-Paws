// Trigger on contact so a second finger can swat while the joystick stays captured.
export function bindSwatButton(button, requestSwat) {
  button.addEventListener('pointerdown', event => {
    if (event.button !== 0 || button.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    requestSwat();
  });
  // Keyboard and assistive activation still use click. Pointer clicks already fired above.
  button.addEventListener('click', event => {
    if (event.detail === 0 && !button.disabled) requestSwat();
  });
}
