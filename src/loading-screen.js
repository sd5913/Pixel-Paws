export function finishLoading() {
  document.querySelector('#loading-screen')?.remove();
}

export function failLoading() {
  const screen=document.querySelector('#loading-screen');
  if(!screen)return;
  screen.querySelector('[role="status"]').textContent='Could not load the room. Please try again.';
  screen.querySelector('button').hidden=false;
  screen.classList.add('loading-failed');
}

window.addEventListener('error',failLoading);
window.addEventListener('unhandledrejection',failLoading);
document.querySelector('#loading-screen button')?.addEventListener('click',()=>location.reload());
