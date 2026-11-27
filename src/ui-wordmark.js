// Use the same outlined Nishiki-teki lettering as the score and tutorial titles.
export function setWordmark(element, text) {
  const image = document.createElement('img');
  image.className = 'ui-wordmark';
  image.alt = text.toUpperCase();
  image.src = `assets/ui/ui-setting-${text.toLowerCase().replaceAll(' ', '-')}.svg`;
  element.replaceChildren(image);
}
