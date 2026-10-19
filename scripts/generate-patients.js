// Generates a FICTIONAL patient dataset around urban Ibagué, Colombia.
// No real people, addresses or health data are used.
import { writeFileSync } from 'node:fs';
import { createRng } from '../src/rng.js';

const rng = createRng(2026);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];

const firstNames = ['Ana', 'Luis', 'Carmen', 'Jorge', 'Rosa', 'Pedro', 'Lucía', 'Andrés', 'Marta', 'Diego',
  'Elena', 'Julián', 'Sofía', 'Camilo', 'Gloria', 'Hernán', 'Patricia', 'Óscar', 'Beatriz', 'Fabio'];
const lastNames = ['Gómez', 'Rodríguez', 'Martínez', 'López', 'Díaz', 'Torres', 'Ramírez', 'Vargas',
  'Rojas', 'Moreno', 'Castillo', 'Herrera', 'Medina', 'Suárez', 'Ortiz'];
const services = ['Nursing', 'Physiotherapy', 'Respiratory therapy', 'Medication delivery', 'General check-up'];
const priorities = ['high', 'medium', 'medium', 'low', 'low'];

// Urban area bounding box (approximate).
const BOX = { latMin: 4.418, latMax: 4.452, lngMin: -75.232, lngMax: -75.165 };

const patients = Array.from({ length: 45 }, (_, i) => ({
  id: `P-${String(i + 1).padStart(3, '0')}`,
  name: `${pick(firstNames)} ${pick(lastNames)}`,
  address: `Calle ${10 + Math.floor(rng() * 90)} # ${1 + Math.floor(rng() * 40)}-${10 + Math.floor(rng() * 89)} (fictional)`,
  service: pick(services),
  priority: pick(priorities),
  lat: +(BOX.latMin + rng() * (BOX.latMax - BOX.latMin)).toFixed(5),
  lng: +(BOX.lngMin + rng() * (BOX.lngMax - BOX.lngMin)).toFixed(5),
}));

const data = {
  note: 'Fictional demo data. Any resemblance to real persons is coincidental.',
  base: { name: 'Operations base (fictional)', lat: 4.4378, lng: -75.2006 },
  patients,
};

writeFileSync(new URL('../data/patients.json', import.meta.url), JSON.stringify(data, null, 2) + '\n');
console.log(`Wrote ${patients.length} fictional patients to data/patients.json`);
