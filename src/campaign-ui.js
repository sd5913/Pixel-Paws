import { createCampaignProgress, ROOMS } from './campaign-progress.js';
import { readAudioPreferences, saveAudioPreferences } from './audio-preferences.js';

function panel(title) {
  const dialog = document.createElement('dialog');
  dialog.className = 'campaign-panel';
  dialog.setAttribute('aria-label', title);
  const heading = document.createElement('header');
  const back = document.createElement('button');
  back.type = 'button'; back.className = 'panel-back'; back.textContent = '←'; back.setAttribute('aria-label', 'Back');
  back.onclick = () => dialog.close();
  const name = document.createElement('h2'); name.textContent = title;
  heading.append(back, name); dialog.append(heading); document.body.append(dialog);
  return dialog;
}

export function showRoomSelection() {
  const progress = createCampaignProgress().snapshot();
  const dialog = panel('Choose a room');
  const list = document.createElement('div'); list.className = 'room-list';
  for (const room of ROOMS) {
    const saved = progress[room.level];
    const link = document.createElement('a'); link.href = room.url;
    const title = document.createElement('strong'); title.textContent = `${room.level}. ${room.name}`;
    const stars = document.createElement('span'); stars.className = 'room-stars';
    stars.textContent = '★'.repeat(saved.stars) + '☆'.repeat(3 - saved.stars);
    stars.setAttribute('aria-label', `${saved.stars} out of 3 stars`);
    const detail = document.createElement('small'); detail.textContent = `Best: ${saved.best} · ${saved.cleared ? 'Cleared' : 'Not cleared yet'}`;
    link.append(title, stars, detail); list.append(link);
  }
  dialog.append(list); dialog.addEventListener('close', () => dialog.remove(), { once: true }); dialog.showModal();
}

export function mountAudioSettings(parent) {
  const group = document.createElement('fieldset'); group.className = 'audio-settings';
  const legend = document.createElement('legend'); legend.textContent = 'Sound'; group.append(legend);
  let value = readAudioPreferences();
  const controls = [];
  for (const [key, label] of [['music', 'Music'], ['effects', 'Sound effects']]) {
    const row = document.createElement('label'); row.className = 'audio-setting';
    const text = document.createElement('span'); text.textContent = label;
    const toggle = document.createElement('input'); toggle.type = 'checkbox'; toggle.checked = value[key + 'Enabled'];
    toggle.setAttribute('aria-label', `${label} enabled`);
    const volume = document.createElement('input'); volume.type = 'range'; volume.min = '0'; volume.max = '100'; volume.value = Math.round(value[key + 'Volume'] * 100);
    volume.setAttribute('aria-label', `${label} volume`);
    const output = document.createElement('output');
    const update = () => {
      value[key + 'Enabled'] = toggle.checked; value[key + 'Volume'] = Number(volume.value) / 100;
      output.textContent = `${volume.value}%`; volume.disabled = !toggle.checked;
    };
    toggle.onchange = volume.oninput = () => { update(); value = saveAudioPreferences(value); };
    update(); row.append(text, toggle, volume, output); group.append(row);
    controls.push({ key, toggle, volume, update });
  }
  parent.prepend(group);
  const dialog = parent.closest('dialog');
  dialog?.addEventListener('toggle', () => {
    if (!dialog.open) return;
    value = readAudioPreferences();
    for (const { key, toggle, volume, update } of controls) {
      toggle.checked = value[key + 'Enabled']; volume.value = Math.round(value[key + 'Volume'] * 100); update();
    }
  });
}

export function addPauseSettings(pauseMenu) {
  const open = document.createElement('button'); open.className = 'pause-settings'; open.type = 'button'; open.textContent = 'Sound settings';
  pauseMenu.append(open);
  open.onclick = () => {
    pauseMenu.close();
    const dialog = panel('Settings'); mountAudioSettings(dialog);
    dialog.addEventListener('close', () => { dialog.remove(); pauseMenu.showModal(); }, { once: true }); dialog.showModal();
  };
}

export function ensureControlsGuide() {
  try { if (localStorage.getItem('pixel-paws.controls-seen') === '1') return Promise.resolve(); } catch { /* Show the guide when storage is unavailable. */ }
  const dialog = panel('Make some mischief!');
  dialog.querySelector('.panel-back').remove();
  const list = document.createElement('div'); list.className = 'controls-guide';
  for (const [title, text] of [
    ['MOVE', 'Drag the joystick to move.'],
    ['DASH', 'Push the joystick farther out to dash.'],
    ['SWAT', 'Tap SWAT with your other finger while moving.'],
  ]) {
    const row = document.createElement('p'); const name = document.createElement('strong'); name.textContent = title;
    row.append(name, document.createTextNode(text)); list.append(row);
  }
  const keyboard = document.createElement('small'); keyboard.textContent = 'Keyboard: WASD / arrows · Shift to dash · K to swat'; list.append(keyboard);
  const button = document.createElement('button'); button.type = 'button'; button.className = 'panel-primary'; button.textContent = 'Got it!'; list.append(button);
  dialog.append(list); dialog.addEventListener('cancel', event => event.preventDefault());
  return new Promise(resolve => {
    button.onclick = () => {
      try { localStorage.setItem('pixel-paws.controls-seen', '1'); } catch { /* Continue without persisting. */ }
      dialog.close(); dialog.remove(); resolve();
    };
    dialog.showModal();
  });
}
