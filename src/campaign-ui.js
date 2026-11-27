import { createCampaignProgress, ROOMS } from './campaign-progress.js';
import { readAudioPreferences, saveAudioPreferences } from './audio-preferences.js';
import { setWordmark } from './ui-wordmark.js';

function panel(title) {
  const dialog = document.createElement('dialog');
  dialog.className = 'campaign-panel';
  dialog.setAttribute('aria-label', title);
  const heading = document.createElement('header');
  const back = document.createElement('button');
  back.type = 'button'; back.className = 'panel-back'; back.textContent = '←'; back.setAttribute('aria-label', 'Back');
  back.onclick = () => dialog.close();
  const name = document.createElement('h2'); name.textContent = title;
  if (title === 'Settings') setWordmark(name, title);
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
  const legend = document.createElement('legend'); legend.textContent = 'Sound'; legend.className = 'sr-only'; group.append(legend);
  let value = readAudioPreferences();
  const controls = [];
  for (const [key, label] of [['music', 'Music'], ['effects', 'Sound effects']]) {
    const row = document.createElement('label'); row.className = 'audio-setting';
    const text = document.createElement('span'); setWordmark(text, label);
    if (key === 'music') {
      text.className = 'sound-music-heading';
      const heading = document.createElement('span'); setWordmark(heading, 'Sound'); text.prepend(heading);
    }
    const volume = document.createElement('input'); volume.type = 'range'; volume.min = '0'; volume.max = '100'; volume.value = value[key + 'Enabled'] ? Math.round(value[key + 'Volume'] * 100) : 0;
    volume.setAttribute('aria-label', `${label} volume`);
    const output = document.createElement('output');
    const update = () => {
      value[key + 'Volume'] = Number(volume.value) / 100; value[key + 'Enabled'] = Number(volume.value) > 0;
      output.textContent = `${volume.value}%`;
    };
    volume.oninput = () => { update(); value = saveAudioPreferences(value); };
    update(); row.append(text, volume, output); group.append(row);
    controls.push({ key, volume, update });
  }
  parent.prepend(group);
  const dialog = parent.closest('dialog');
  dialog?.addEventListener('toggle', () => {
    if (!dialog.open) return;
    value = readAudioPreferences();
    for (const { key, volume, update } of controls) {
      volume.value = value[key + 'Enabled'] ? Math.round(value[key + 'Volume'] * 100) : 0; update();
    }
  });
}

export function addGameSettings(shell, pauseMenu, pause) {
  const open = document.createElement('button'); open.id = 'settings-button'; open.className = 'art-button'; open.type = 'button'; open.setAttribute('aria-label', 'Settings');
  const icon = document.createElement('img'); icon.src = 'assets/ui/ui-button-settings.png'; icon.alt = ''; open.append(icon);
  shell.append(open);
  open.onclick = () => {
    pause();
    pauseMenu.close();
    const dialog = panel('Settings'); mountAudioSettings(dialog);
    dialog.addEventListener('close', () => { dialog.remove(); pauseMenu.showModal(); }, { once: true }); dialog.showModal();
  };
}

export function confirmProgressReset() {
  const dialog = panel('Reset progress');
  dialog.classList.add('reset-confirmation');
  const settingsBack = document.querySelector('#settings .settings-heading button[aria-label="Back"]');
  if (settingsBack) {
    const back = settingsBack.cloneNode(true);
    back.type = 'button'; back.removeAttribute('autofocus');
    back.onclick = () => dialog.close();
    dialog.querySelector('.panel-back').replaceWith(back);
  }
  setWordmark(dialog.querySelector('h2'), 'Reset progress');
  const content = document.createElement('div'); content.className = 'reset-confirm-content';
  const text = document.createElement('p');
  text.textContent = 'Reset badges and the first-room guide? Badge progress will be cleared, and the guide will appear again next time you start room one. Room scores and stars will stay saved.';
  const actions = document.createElement('div'); actions.className = 'reset-confirm-actions';
  const cancel = document.createElement('button'); cancel.type = 'button'; setWordmark(cancel, 'Cancel');
  const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'confirm-reset'; setWordmark(reset, 'Reset');
  actions.append(cancel, reset); content.append(text, actions); dialog.append(content);
  let confirmed = false;
  return new Promise(resolve => {
    cancel.onclick = () => dialog.close();
    reset.onclick = () => { confirmed = true; dialog.close(); };
    dialog.addEventListener('close', () => { dialog.remove(); resolve(confirmed); }, { once: true });
    dialog.showModal(); cancel.focus();
  });
}
