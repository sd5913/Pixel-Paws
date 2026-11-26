import { bindSwatButton } from './swat-button.js';
import { createJoystick } from './joystick.js';
import { createScoring, roundRating, COMBO_WINDOW_MS } from './level-scoring.js';
import { createRoundTimer, formatRoundTime } from './ui-gameplay/round-timer.js';
import { renderDigits } from './level-digits.js';
import digitArt from './assets/ui/ui-nishiki-digits.svg';
import template from './level-ui-template.js';
import { Box3 } from 'three';
import { hasLeftRoundTable, hasLeftRectangularTable } from './table-clearance.js';

// Carrier groups score once; decorative parts and breakage fragments never register targets.
export const KITCHEN_POINTS = Object.freeze({
  '01-kitchen-scale': 30, '02-recipe-book': 20, '03-utensil-holder': 30,
  '04-glass-spice-jar': 20, '05-mixing-bowl-and-whisk': 30,
  '06-strawberry-jam': 20, '07-piping-bag': 10, '08-wooden-cutting-board': 30,
  '09-ceramic-bowl': 20, '10-cookie-cutters': 10, '11-oven-mitt': 10,
  '12-cake-stand': 30, '13-egg-tray': 20, '14-wooden-rolling-pin': 20,
  '15-glass-measuring-jug': 30,
  '16-strawberry-cupcake': 20, '17-blueberry-and-strawberries': 10,
  '18-cake-slice': 20, '19-cookies': 10, '20-butter-block-and-knife': 20,
  '21-butter-cubes': 10, '22-lemon': 10,
});

export function createLevelUI({ level, onSwat, onRestart, targets = [], tableHeight = 0.78, tableRadius = 1.95, tableShape = null }) {
  document.querySelector('#room-loading')?.remove();
  const shell = document.createElement('div');
  shell.className = 'game-layout level-ui';
  shell.innerHTML = template;
  document.body.append(shell);
  const style = document.createElement('style');
  style.textContent = '.level-ui{pointer-events:none}.level-ui :is(button,dialog,.movement-controls){pointer-events:auto}.level-ui #swat{z-index:3}';
  document.head.append(style);
  const library = new DOMParser().parseFromString(digitArt, 'image/svg+xml').documentElement;
  library.classList.add('digit-library');
  library.setAttribute('aria-hidden', 'true');
  document.body.prepend(library);
  const find = selector => shell.querySelector(selector);
  const joystick = createJoystick(find('#joystick'));
  const targetBounds = new Box3();
  const intro = find('#round-intro');
  const pauseMenu = find('#pause-menu');
  const result = find('#result');
  let state = 'ready';
  let started = false;
  let countdown;
  let record = 0;
  const recordKey = `pixel-paws.level-${level}.best-score`;
  try { record = Number(localStorage.getItem(recordKey)) || 0; } catch { /* Keep a session record if storage is unavailable. */ }
  const scorer = createScoring({ onChange: render, onEnd: finish });
  const timer = createRoundTimer({ onExpire: () => scorer.endRound('timeout') });
  function setState(value) {
    state = value;
    document.body.dataset.gameState = value;
    if (value !== 'playing') joystick.reset();
  }
  function render(snapshot) {
    renderDigits(find('#score'), snapshot.total);
    find('#score').setAttribute('aria-label', `Score ${snapshot.total}`);
  }
  function finish(snapshot) {
    timer.stop();
    setState('ended');
    const cleared = snapshot.reason === 'cleared';
    const art = `assets/ui/ui-results-${cleared ? 'cleared' : 'time-up'}.png`;
    find('.result-art').src = art;
    find('#round-rating img').src = art;
    renderDigits(find('#final-score'), snapshot.total);
    const rating = roundRating(snapshot).stars;
    find('#round-rating').dataset.stars = rating;
    find('#round-rating').setAttribute('aria-label', `${rating} out of 3 stars`);
    find('#final-score').setAttribute('aria-label', `Final score ${snapshot.total}`);
    const newRecord = snapshot.total > record;
    if (newRecord) { record = snapshot.total; try { localStorage.setItem(recordKey, String(record)); } catch { /* Keep the in-memory record. */ } }
    find('#new-record').hidden = !newRecord;
    find('#best-score').textContent = `Best score: ${record}`;
    const next = find('#next-level');
    next.textContent = level === 2 && cleared ? 'Next' : 'Retry';
    next.onclick = () => {
      if (level === 2 && cleared) location.assign('./level-3.html');
      else { result.close(); begin(true); }
    };
    result.setAttribute('aria-label', cleared ? 'Table cleared' : 'Time’s up');
    result.showModal();
    const papers = find('#result-confetti');
    papers.replaceChildren();
    if (rating === 3) for (let i = 0; i < 20; i++) {
      const paper = document.createElement('span');
      for (const [key, value] of Object.entries({paper:['#ffd05c','#f78962','#5bbbd2','#ef9aab'][i%4],spread:`${(i-10)*3.5}cqw`,rise:`${-14-i%5*5}cqw`,spin:`${i*41}deg`,delay:`${i%4*28}ms`})) paper.style.setProperty('--'+key,value);
      papers.append(paper);
    }
  }
  function begin(reset = false) {
    clearInterval(countdown);
    if (reset) { onRestart(); started = false; }
    setState('countdown');
    intro.showModal();
    const prompts = ['Ready?', 'Paws up!', 'Go!'];
    let step = 0;
    intro.querySelector('p').textContent = prompts[0];
    countdown = setInterval(() => {
      if (++step < prompts.length) intro.querySelector('p').textContent = prompts[step];
      else {
        clearInterval(countdown); intro.close();
        if (!started) {
          scorer.startRound(targets.map(({id,points}) => ({id,points:points ?? KITCHEN_POINTS[id] ?? 20})));
          timer.start(performance.now()); started = true;
        } else timer.resume(performance.now());
        setState('playing');
      }
    }, 1000);
  }
  function pause() {
    if (state !== 'playing' && state !== 'countdown') return;
    if (state === 'playing') { timer.tick(performance.now()); if (state === 'ended') return; }
    clearInterval(countdown); intro.close(); timer.stop(); setState('paused'); pauseMenu.showModal();
  }
  find('#pause-button').addEventListener('click', pause);
  find('#resume').addEventListener('click', () => { pauseMenu.close(); begin(); });
  find('#pause-restart').addEventListener('click', () => { pauseMenu.close(); begin(true); });
  for (const button of shell.querySelectorAll('.home-button')) button.addEventListener('click', () => location.assign('./play.html'));
  bindSwatButton(find('#swat'), () => { if (state === 'playing') onSwat(); });
  for (const dialog of shell.querySelectorAll('dialog')) dialog.addEventListener('cancel', event => event.preventDefault());
  window.addEventListener('blur', pause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('keydown', event => { if (event.code === 'Escape') pause(); });
  renderDigits(find('#timer'), '00:45');
  renderDigits(find('#score'), 0);
  begin();
  return {
    get playing() { return state === 'playing'; },
    read: () => joystick.read(),
    tick() {
      if (state !== 'playing') return;
      const seconds = timer.tick(performance.now());
      renderDigits(find('#timer'), formatRoundTime(seconds));
      find('.timer-panel').setAttribute('aria-label', `Time remaining ${seconds} seconds`);
      const final = find('#final-countdown');
      final.hidden = seconds > 10 || seconds <= 0;
      if (!final.hidden) renderDigits(final, seconds);
      if (state !== 'playing') return;
      for (const target of targets) {
        // A carrier is cleared once its entire footprint leaves the table, even if a chair catches it.
        // Detached contents, puddles and fragments are not part of this roster.
        const bounds = target.body && (target.readBounds ? target.readBounds() : targetBounds.setFromObject(target.object, true));
        const offSurface = bounds && (tableShape
          ? hasLeftRectangularTable(bounds, tableHeight, tableShape)
          : hasLeftRoundTable(bounds, tableHeight, tableRadius));
        if (target.cleared || offSurface) scorer.notifyFallen(target.id, timer.elapsedMs);
        else if (target.body) {
          const q = target.body?.rotation() ?? target.object.quaternion;
          const up = 1 - 2 * (q.x*q.x + q.z*q.z);
          if (up < Math.cos(Math.PI / 3)) scorer.notifyToppled(target.id);
        }
      }
      const remaining = scorer.comboRemainingMs(timer.elapsedMs);
      find('#combo-clock').hidden = remaining <= 0;
      find('#combo-clock span').style.width = `${100*remaining/COMBO_WINDOW_MS}%`;
    },
  };
}
