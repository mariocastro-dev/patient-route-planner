import { planRoutes } from './planner.js';

const COLORS = ['#0369a1', '#c2410c', '#15803d', '#7c3aed', '#be185d', '#a16207'];
const $ = (id) => document.getElementById(id);
const fmt = (n) => n.toFixed(1);

// Data comes from a JSON file but is still treated as untrusted when rendered.
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const map = L.map('map', { zoomControl: true });
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

const layer = L.layerGroup().addTo(map);
const routeLayers = new Map(); // caregiver -> Leaflet layers, for highlighting

function stopIcon(n, color) {
  return L.divIcon({
    className: '',
    html: `<div class="stop-label" style="--route-color:${color}">${n}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function render(data) {
  const caregivers = Number($('caregivers').value);
  const showBaseline = $('baseline').checked;
  const { base, patients } = data;
  const plan = planRoutes(base, patients, caregivers);

  layer.clearLayers();
  routeLayers.clear();

  L.marker([base.lat, base.lng], {
    icon: L.divIcon({ className: '', html: `<div class="base-label">⌂ Base</div>`, iconSize: [52, 22], iconAnchor: [26, 11] }),
    zIndexOffset: 1000,
  }).bindPopup(`<strong>${escapeHtml(base.name)}</strong>`).addTo(layer);

  plan.routes.forEach((r, idx) => {
    const color = COLORS[idx % COLORS.length];
    const group = L.featureGroup().addTo(layer);
    const path = [base, ...r.stops, base].map((p) => [p.lat, p.lng]);

    if (showBaseline) {
      // Same patients, visited in list order — what you'd get without optimization.
      const naive = [base, ...r.stops.slice().sort((a, b) => a.id.localeCompare(b.id)), base];
      L.polyline(naive.map((p) => [p.lat, p.lng]), { color, weight: 2, opacity: 0.45, dashArray: '4 6' }).addTo(group);
    }
    L.polyline(path, { color, weight: 4, opacity: 0.9 }).addTo(group);

    r.stops.forEach((p, i) => {
      L.marker([p.lat, p.lng], { icon: stopIcon(i + 1, color) })
        .bindPopup(
          `<strong>${escapeHtml(p.name)}</strong><br>${escapeHtml(p.service)} · priority ${escapeHtml(p.priority)}` +
          `<br><small>${escapeHtml(p.address)}</small><br><small>Staff ${r.caregiver}, stop ${i + 1}</small>`
        )
        .addTo(group);
    });
    routeLayers.set(r.caregiver, group);
  });

  // Stats
  $('statPatients').textContent = patients.length;
  $('statTotal').textContent = fmt(plan.totalKm);
  $('statBaseline').textContent = fmt(plan.baselineKm);
  $('statSavings').textContent = `${Math.round(plan.savingsPct)}%`;

  // Route list
  $('routes').innerHTML = plan.routes
    .map((r, idx) => {
      const color = COLORS[idx % COLORS.length];
      const stops = r.stops
        .map(
          (p) => `<li>${escapeHtml(p.name)} <span class="svc">· ${escapeHtml(p.service)}</span>` +
            (p.priority === 'high' ? ` <span class="prio-high">HIGH</span>` : '') + `</li>`
        )
        .join('');
      return `<li><details class="route" style="--route-color:${color}" data-caregiver="${r.caregiver}">
        <summary><span class="dot"></span><span class="route-name">Staff ${r.caregiver}</span>
        <span class="route-meta">${r.stops.length} visits · ${fmt(r.distanceKm)} km</span></summary>
        <ol class="stops">${stops}</ol></details></li>`;
    })
    .join('');

  document.querySelectorAll('.route').forEach((el) => {
    el.addEventListener('toggle', () => {
      const group = routeLayers.get(Number(el.dataset.caregiver));
      if (el.open && group) map.fitBounds(group.getBounds(), { padding: [40, 40] });
    });
  });

  map.fitBounds(L.latLngBounds([[base.lat, base.lng], ...patients.map((p) => [p.lat, p.lng])]), { padding: [30, 30] });
}

async function main() {
  const res = await fetch('data/patients.json');
  const data = await res.json();
  const slider = $('caregivers');
  slider.addEventListener('input', () => {
    $('caregiversValue').textContent = slider.value;
    render(data);
  });
  $('baseline').addEventListener('change', () => render(data));
  render(data);
}

main().catch((err) => {
  console.error(err);
  $('routes').innerHTML = `<li>Could not load data. Serve the folder over HTTP (e.g. <code>npm start</code>).</li>`;
});
