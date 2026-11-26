export function renderDigits(element, value) {
  const text = String(value);
  if (element.dataset.digits === text) return;
  element.dataset.digits = text;
  const label = document.createElement('span');
  label.className = 'sr-only';
  label.textContent = text;
  const svgNamespace = 'http://www.w3.org/2000/svg';
  const artwork = document.createElementNS(svgNamespace, 'svg');
  artwork.classList.add('display-digits');
  artwork.setAttribute('aria-hidden', 'true');
  let x = 0;
  for (const character of text) {
    if(character==='-'){
      const minus=document.createElementNS(svgNamespace,'path');
      minus.setAttribute('d',`M${x+10} 45h35v10h-35Z`);
      artwork.append(minus);x+=55;continue;
    }
    const colon = character === ':';
    const width = colon ? 25 : 61;
    const glyph = document.createElementNS(svgNamespace, 'use');
    glyph.setAttribute('href', `#${colon ? 'colon' : 'digit-' + character}`);
    glyph.setAttribute('x', x);
    glyph.setAttribute('width', width);
    glyph.setAttribute('height', 95);
    artwork.append(glyph);
    x += width;
  }
  artwork.setAttribute('viewBox', `0 0 ${x} 95`);
  artwork.setAttribute('width', x);
  artwork.setAttribute('height', 95);
  element.replaceChildren(label, artwork);
}

