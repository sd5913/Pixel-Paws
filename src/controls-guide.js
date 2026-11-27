// The first room explains one control per page before the round timer starts.
export function ensureControlsGuide({ onStart, onFinish }) {
  try { if (localStorage.getItem('pixel-paws.controls-seen') === '7') return Promise.resolve(); } catch { /* Show the guide when storage is unavailable. */ }
  const pages = [
    { title: 'MOVE', text: 'Knock the objects off the table! Drag the joystick to move your cat around.' },
    { title: 'DASH', text: 'Push the joystick beyond its base to dash. Move faster and give objects a stronger push!' },
    { title: 'SWAT', text: 'Tap SWAT to knock nearby objects away. You can move and swat at the same time!' },
  ];
  const dialog = document.createElement('dialog');
  dialog.className = 'controls-panel';
  dialog.setAttribute('aria-label', 'How to play');
  dialog.innerHTML = '<div class="controls-inset"><div role="status" aria-live="polite"><h2></h2><img class="controls-crayon" src="assets/ui/ui-guide-crayon-lines.svg" alt=""><p class="controls-description"></p></div><button class="controls-next" type="button"></button><p class="controls-page"></p></div>';
  document.querySelector('.game-layout').append(dialog);
  let page = 0;
  function render() {
    const current = pages[page];
    dialog.dataset.step = current.title.toLowerCase();
    dialog.querySelector('.controls-page').textContent = `${page + 1} / ${pages.length}`;
    const title = document.createElement('img');
    title.src = `assets/ui/ui-guide-${current.title.toLowerCase()}.svg`;
    title.alt = current.title;
    dialog.querySelector('h2').replaceChildren(title);
    dialog.querySelector('.controls-description').textContent = current.text;
    dialog.querySelector('button').textContent = page === pages.length - 1 ? 'Start' : 'Next';
  }
  onStart(); render(); dialog.showModal();
  dialog.addEventListener('cancel', event => event.preventDefault());
  return new Promise(resolve => {
    dialog.querySelector('button').onclick = () => {
      if (++page < pages.length) { render(); return; }
      dialog.close(); dialog.remove(); onFinish();
      try { localStorage.setItem('pixel-paws.controls-seen', '7'); } catch { /* Continue without persisting. */ }
      resolve();
    };
  });
}
