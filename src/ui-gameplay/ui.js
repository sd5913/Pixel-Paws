import { markup, styles } from './view.js';
import { createJoystick } from './joystick.js';
import { createGameLogic } from './game-logic.js';
import { formatRoundTime } from './round-timer.js';

// Explicit mount only. Shadow DOM prevents these styles/IDs altering teammate UI.
export function mountGameUI(host, { targets = [], resetScene, onSwat, onInput = () => {},
  onPlaying = () => {}, assetBase = new URL('./', import.meta.url), onError = console.error } = {}) {
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>${styles}</style>${markup}`;
  const $ = selector => root.querySelector(selector);
  for (const image of root.querySelectorAll('img')) image.src = new URL(image.getAttribute('src'), assetBase);
  // Inline background URLs resolve relative to the document unless rewritten.
  root.querySelector('style').textContent = styles.replace(/url\('([^']+)'\)/g,
    (_, path) => `url('${new URL(path, assetBase)}')`);
  const joystick = createJoystick($('#joystick'));
  let frame, previous = 0, disposed = false, lastTotal = 0;
  const game = createGameLogic({ resetScene, onSwat, onEnd: () => { joystick.reset(); onPlaying(false); } });
  function render() {
    const state = game.snapshot();
    host.dataset.gameState = state.paused ? 'paused' : state.state;
    $('#start').disabled = state.resetting;
    $('#score').textContent = state.total;
    $('#timer').textContent = formatRoundTime(state.seconds);
    $('#final-score').textContent = state.total;
    $('.result-art').src = new URL(`assets/ui/ui-result-panel-${state.reason === 'cleared' ? 'cleared' : 'timeout'}.png`, assetBase);
    const result = state.state === 'ended' && state.reason !== 'restart';
    for (const [selector, open] of [['#result', result], ['#pause-menu', state.paused]]) {
      const dialog = $(selector);
      if (open && !dialog.open) dialog.showModal();
      if (!open && dialog.open) dialog.close();
    }
    $('#swat').disabled = state.state !== 'playing' || state.paused || state.swatting || state.resetting;
    if (state.total > lastTotal) {
      const popup = document.createElement('span'); popup.className = 'score-popup';
      popup.textContent = `+${state.total-lastTotal}`; popup.style.cssText = 'left:50%;top:35%';
      $('#game-root').append(popup); setTimeout(() => popup.remove(), 1000);
    }
    lastTotal = state.total;
  }
  async function start() {
    joystick.reset(); onPlaying(false);
    try { await game.start(typeof targets === 'function' ? targets() : targets); onPlaying(true); }
    catch (error) { $('#status').textContent = 'Could not reset scene. Retry.'; $('.meta').hidden = false; onError(error); }
    render();
  }
  for (const id of ['#start', '#replay', '#pause-restart']) $(id).addEventListener('click', start);
  $('#pause-button').addEventListener('click', () => { if (game.pause()) { joystick.reset(); onPlaying(false); } render(); });
  $('#resume').addEventListener('click', () => { if (game.resume()) onPlaying(true); render(); });
  for (const button of root.querySelectorAll('.home-button')) button.addEventListener('click', () => { game.home(); joystick.reset(); onPlaying(false); render(); });
  for (const dialog of root.querySelectorAll('dialog')) dialog.addEventListener('cancel', event => event.preventDefault());
  $('#swat').addEventListener('click', () => game.requestSwat());
  $('#retry').addEventListener('click', start);
  function key(event) {
    if (event.repeat || event.composedPath().some(node => node.matches?.('input,textarea,select,[contenteditable]'))) return;
    if (event.code === 'KeyK' || event.key?.toLowerCase() === 'k') { event.preventDefault(); game.requestSwat(); }
  }
  function blur() { joystick.reset(); if (game.pause()) onPlaying(false); }
  window.addEventListener('keydown', key); window.addEventListener('blur', blur);
  function animate(time) {
    if (disposed) return;
    game.tick(Math.min((time-(previous || time))/1000,.05)); previous = time;
    const state = game.snapshot();
    onInput(state.state === 'playing' && !state.paused && !state.resetting && !state.swatting
      ? joystick.read() : { x:0, z:0, dash:false });
    render(); frame = requestAnimationFrame(animate);
  }
  host.dataset.gameState = 'ready'; render(); frame = requestAnimationFrame(animate);
  return { game, dispose() { disposed = true; cancelAnimationFrame(frame); game.home(); joystick.reset();
    window.removeEventListener('keydown', key); window.removeEventListener('blur', blur); host.remove(); } };
}
