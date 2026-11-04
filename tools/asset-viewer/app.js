import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { manifest, layout, models } from 'viewer:catalog';
import { parseGlb } from '../../src/assets/load-assets.js';
import { presets } from '../../experiments/illustrated-rendering/presets.js';
import { prepareModel, setModelStyle, createColliderLayer, frameCamera, modelMetadata, selectionInstances, disposeLayer } from './core.js';
import { createStage } from './stage.js';

const $ = id => document.getElementById(id);
const viewport = $('viewport');
const state = { asset: 'desk-scene', mode: 'art', preset: 'warm-illustrated' };
const params = new URLSearchParams(location.search);
for (const key of Object.keys(state)) {
  const value = params.get(key);
  const valid = key === 'asset' ? value === 'desk-scene' || manifest.assets.some(a => a.id === value)
    : key === 'mode' ? ['art', 'inspection'].includes(value) : Object.hasOwn(presets, value);
  if (valid) state[key] = value;
}
$('asset').replaceChildren(new Option('Desk scene · desk + mug', 'desk-scene'),
  ...manifest.assets.map(a => new Option(a.id.replaceAll('-', ' '), a.id)));
for (const [key, value] of Object.entries(state)) $(key).value = value;

try {
  const renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.NeutralToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.VSMShadowMap;
  viewport.append(renderer.domElement);
  const scene = new T.Scene();
  const camera = new T.OrthographicCamera(-1, 1, 1, -1, 0.001, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false; controls.minZoom = 0.1; controls.maxZoom = 20;
  const hemisphere = new T.HemisphereLight('#ffffff', '#b8b4ba', 2);
  const sun = new T.DirectionalLight('#ffffff', 2);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.radius = 4; sun.shadow.blurSamples = 8; sun.shadow.bias = -0.00015;
  scene.add(hemisphere, sun, sun.target);
  const modelGroup = new T.Group(), helperGroup = new T.Group(), groundGroup = new T.Group();
  const artStage = createStage();
  scene.add(modelGroup, helperGroup, groundGroup, artStage.group);
  const sources = new Map(await Promise.all(manifest.assets.map(async entry => [entry.id,
    await parseGlb(models[entry.id].slice().buffer)])));
  let records = [], metadata = [], box = new T.Box3(), fitBounds = new T.Box3(), warning = '';
  let resetting = false;

  function render() {
    if (resetting) return;
    renderer.render(scene, camera);
    const offset = camera.position.clone().sub(controls.target);
    const elevation = T.MathUtils.radToDeg(Math.asin(T.MathUtils.clamp(offset.y / offset.length(), -1, 1)));
    $('camera-label').textContent = `ORTHOGRAPHIC · ${elevation.toFixed(0)}° · ${camera.zoom.toFixed(2)}×`;
  }

  function resetCamera() {
    resetting = true;
    controls.target.copy(frameCamera(camera, fitBounds, viewport.clientWidth / viewport.clientHeight,
      state.mode === 'art' ? 70 : 32, state.asset === 'mug' ? 30 : 150));
    controls.update(); resetting = false; render();
  }

  function resize() {
    const width = viewport.clientWidth, height = viewport.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    // Preserve the current orbit, target and zoom during responsive layout changes.
    const halfHeight = fitBounds.getSize(new T.Vector3()).length() / 2 * 1.12 / Math.min(width / height, 1);
    Object.assign(camera, { left: -halfHeight * width / height, right: halfHeight * width / height,
      top: halfHeight, bottom: -halfHeight });
    camera.updateProjectionMatrix(); render();
  }

  function updateUrl() {
    try {
      const url = new URL(location.href);
      for (const [key, value] of Object.entries(state)) url.searchParams.set(key, value);
      history.replaceState(null, '', url);
    } catch { /* Browser may prohibit history changes for offline documents. */ }
  }

  function addText(parent, tag, value, className) {
    const element = document.createElement(tag); element.textContent = value;
    if (className) element.className = className;
    parent.append(element); return element;
  }

  function showMetadata() {
    $('metadata').replaceChildren();
    for (const { entry, data, instance } of metadata) {
      const card = addText($('metadata'), 'article', '', 'asset-metadata');
      const title = addText(card, 'h3', entry.id.replaceAll('-', ' '));
      addText(title, 'span', entry.approvedSha256 ? 'HASH VERIFIED' : 'MANIFEST ASSET');
      const measurements = addText(card, 'div', '', 'measurements');
      ['WIDTH', 'HEIGHT', 'DEPTH'].forEach((name, i) => {
        const item = addText(measurements, 'div', ''); addText(item, 'small', name);
        const value = addText(item, 'strong', data.dimensions[i].toFixed(4)); addText(value, 'i', ' m');
      });
      const info = addText(card, 'div', '', 'asset-info');
      for (const text of [`${data.triangles.toLocaleString()} triangles`, `${data.materials} materials`,
        `Front ${data.front}`, `${entry.colliders.filter(c => c.type !== 'none').length} colliders`,
        `Pivot: ${entry.pivot.type}`, `Body: ${entry.physics.bodyType}`]) addText(info, 'span', text);
      const details = addText(card, 'details', ''); addText(details, 'summary', 'Source, transforms & handoff metadata');
      addText(details, 'pre', JSON.stringify({ path: entry.path, measuredDimensionsMeters: data.dimensions,
        manifestDimensionsMeters: entry.dimensionsMeters, dimensionsMatch: data.boundsMatch,
        vertices: data.vertices, visualScale: entry.visualScale, pivot: entry.pivot,
        visualFront: data.front, approvedSha256: data.approvedSha256, physics: entry.physics,
        render: entry.render, colliders: entry.colliders, interactionSurfaces: entry.interactionSurfaces,
        sceneTransform: instance.transform }, null, 2));
    }
  }

  function updateLayers() {
    disposeLayer(helperGroup);
    const warnings = [];
    for (const record of records) {
      if ($('bounds').checked) {
        const helper = new T.Box3Helper(new T.Box3().setFromObject(record.object), '#6d99cb');
        helper.material.depthTest = false; helper.material.toneMapped = false; helper.renderOrder = 21;
        helperGroup.add(helper);
      }
      if ($('colliders').checked) {
        const layer = createColliderLayer(record.entry, record.instance.transform);
        helperGroup.add(layer.group); warnings.push(...layer.warnings);
      }
    }
    const label = state.mode === 'art' ? presets[state.preset].name : 'Original GLB materials';
    $('status').textContent = `${records.length} asset${records.length === 1 ? '' : 's'} · ${label} · native scale preserved.${warning}${warnings.length ? ` ${warnings.join(' ')}` : ''}`;
    render();
  }

  function updateStyle(reset = false) {
    const p = presets[state.preset], art = state.mode === 'art';
    const background = art ? p.background : '#eeeae4';
    scene.background = new T.Color(background); document.querySelector('.viewport-card').style.background = background;
    hemisphere.color.set(art ? p.sky : '#ffffff'); hemisphere.groundColor.set(art ? p.bounce : '#b8b4ba');
    hemisphere.intensity = art ? p.ambient : 2;
    sun.color.set(art ? p.sun : '#ffffff'); sun.intensity = art ? p.key : 2;
    renderer.toneMappingExposure = art ? p.exposure : 1;
    for (const record of records) setModelStyle(record, { mode: state.mode, preset: state.preset, wireframe: $('wireframe').checked });
    for (const { mesh, colorRole } of artStage.decorations) mesh.material.color.set(p[colorRole]);
    artStage.group.visible = art && state.asset === 'desk-scene';
    groundGroup.visible = !artStage.group.visible;
    fitBounds.copy(box);
    if (artStage.group.visible) fitBounds.union(new T.Box3().setFromObject(artStage.group));
    $('preset-field').hidden = !art; $('inspection-note').hidden = art;
    $('mode-label').textContent = art ? 'ART PREVIEW' : 'MODEL INSPECTION';
    $('preset-description').textContent = p.description;
    $('palette').replaceChildren(...p.palette.map(color => { const swatch = document.createElement('span'); swatch.style.background = color; return swatch; }));
    updateUrl();
    if (reset) resetCamera();
    updateLayers();
  }

  function selectAsset() {
    for (const record of records) {
      setModelStyle(record, { mode: 'inspection' });
      for (const { original } of record.meshes) for (const m of Array.isArray(original) ? original : [original]) m.dispose();
    }
    modelGroup.clear(); disposeLayer(groundGroup);
    metadata = []; records = []; warning = '';
    for (const instance of selectionInstances(state.asset, manifest, layout)) {
      const entry = manifest.assets.find(a => a.id === instance.assetId);
      const record = prepareModel(sources.get(entry.id), entry);
      const data = modelMetadata(record, entry);
      if (!data.boundsMatch) warning += ` ${entry.id}: measured bounds differ from manifest.`;
      metadata.push({ entry, data, instance });
      record.object.position.fromArray(instance.transform.position);
      record.object.quaternion.fromArray(instance.transform.rotation);
      record.object.scale.multiply(new T.Vector3().fromArray(instance.transform.scale));
      Object.assign(record, { entry, instance }); records.push(record); modelGroup.add(record.object);
    }
    box.setFromObject(modelGroup);
    const size = box.getSize(new T.Vector3()), scale = Math.max(size.x, size.y, size.z);
    const center = box.getCenter(new T.Vector3());
    const ground = new T.Mesh(new T.PlaneGeometry(scale * 3, scale * 3), new T.MeshLambertMaterial({ color: '#e5ded3' }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(center.x, box.min.y - scale * .004, center.z); ground.receiveShadow = true;
    const grid = new T.GridHelper(scale * 2.5, 10, '#c4b9ac', '#d6ccbf'); grid.position.copy(ground.position); grid.position.y += scale * .001;
    groundGroup.add(ground, grid);
    sun.position.copy(center).add(new T.Vector3(-2.5, 5, -1.6).multiplyScalar(scale));
    sun.target.position.copy(center);
    const shadowSpan = scale * 1.7;
    Object.assign(sun.shadow.camera, { left: -shadowSpan, right: shadowSpan, top: shadowSpan, bottom: -shadowSpan,
      near: Math.max(scale * .01, .001), far: scale * 15 });
    sun.shadow.normalBias = scale * .003; sun.shadow.camera.updateProjectionMatrix();
    $('selection-label').textContent = state.asset === 'desk-scene' ? 'THE AFTERNOON DESK' : state.asset.replaceAll('-', ' ').toUpperCase();
    showMetadata(); updateStyle(true); resize();
  }

  controls.addEventListener('change', render);
  for (const key of ['asset', 'mode', 'preset']) $(key).addEventListener('change', () => {
    state[key] = $(key).value;
    if (key === 'asset') selectAsset(); else updateStyle(key === 'mode');
  });
  for (const id of ['wireframe', 'bounds', 'colliders']) $(id).addEventListener('change', () => updateStyle());
  $('reset').addEventListener('click', resetCamera);
  for (const [id, factor] of [['zoom-in', 1.25], ['zoom-out', .8]]) $(id).addEventListener('click', () => {
    camera.zoom = T.MathUtils.clamp(camera.zoom * factor, controls.minZoom, controls.maxZoom);
    camera.updateProjectionMatrix(); render();
  });
  $('save-image').addEventListener('click', () => {
    render(); renderer.domElement.toBlob(blob => {
      if (!blob) return;
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
      link.download = `pixel-paws-${state.asset}-${state.mode}-${state.preset}.png`; link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    });
  });
  selectAsset(); new ResizeObserver(resize).observe(viewport);
  $('loading').remove(); $('save-image').disabled = false;
  document.documentElement.dataset.viewerReady = 'true';
} catch (error) {
  $('loading').textContent = `Viewer failed: ${error.message}`;
  $('status').textContent = `Viewer failed: ${error.message}`;
  console.error(error);
}
