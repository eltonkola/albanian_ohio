/**
 * Albanians in Ohio — Static Research Site
 * Main application script
 *
 * Loads data from data/processed/*.json and renders all
 * Chart.js charts + Leaflet maps.
 */

// ============================================================
// CONFIG
// ============================================================
const DATA_DIR = 'data/processed';
const RED = '#cc0000';
const DK  = '#1a1a2e';
const PALETTE = ['#cc0000','#1a1a2e','#e67e22','#2ecc71','#3498db',
                 '#9b59b6','#1abc9c','#e74c3c','#f39c12','#27ae60'];
const GREY = '#adb5bd';

// ============================================================
// DATA LOADER
// ============================================================
async function loadJSON(filename) {
  try {
    const r = await fetch(`${DATA_DIR}/${filename}`);
    if (!r.ok) throw new Error(`${r.status}`);
    return await r.json();
  } catch (e) {
    console.warn(`Could not load ${filename}:`, e.message);
    return null;
  }
}

// ============================================================
// HELPERS
// ============================================================
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function fmtNum(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString();
}

function makeChart(canvasId, config) {
  const el = document.getElementById(canvasId);
  if (!el) return null;
  return new Chart(el, config);
}

// ============================================================
// STAT BOXES
// ============================================================
function renderStats(pop, pumaData) {
  const row = $('#stats-row');
  if (!row || !pop) return;

  // Compute Columbus and Cleveland totals from PUMA data
  let clevelandTotal = 0;
  let columbusTotal = 0;
  if (pumaData && pumaData.ohio_albanian_by_puma) {
    const pumas = pumaData.ohio_albanian_by_puma;
    // Cuyahoga County PUMAs: 007xx (Cleveland metro)
    // Franklin County PUMAs: 034xx (Columbus metro)
    for (const [code, val] of Object.entries(pumas)) {
      if (code.startsWith('007')) clevelandTotal += val;
      if (code.startsWith('034')) columbusTotal += val;
    }
  }

  const items = [
    { num: fmtNum(pop.total_ohio_broad), label: 'Ethnic Albanians in Ohio (PUMS broad)' },
    { num: fmtNum(pop.total_ohio_ancestry_only), label: 'Self-reported Albanian ancestry (ACS)' },
    { num: columbusTotal > 0 ? fmtNum(columbusTotal) : '—', label: 'Columbus / Franklin Co. (PUMS broad)' },
    { num: clevelandTotal > 0 ? fmtNum(clevelandTotal) : '—', label: 'Cleveland / Cuyahoga Co. (PUMS broad)' },
  ];

  row.innerHTML = items.map(i => `
    <div class="stat-box">
      <div class="num">${i.num}</div>
      <div class="label">${i.label}</div>
    </div>
  `).join('');

  // Show sample banner if applicable
  if (pop.data_source && pop.data_source.includes('SAMPLE')) {
    const banner = $('#sample-banner');
    if (banner) banner.style.display = 'block';
  }
}

// ============================================================
// CHARTS
// ============================================================

// --- Population Trend ---
function chartPopTrend() {
  makeChart('chart-pop-trend', {
    type: 'line',
    data: {
      labels: ['1990','2000','2010','2015','2020','2023 (est.)'],
      datasets: [
        {
          label: 'U.S. Albanian Ancestry (ACS Self-Reported)',
          data: [47710, 113661, 193813, 196000, 197714, 224000],
          borderColor: RED, backgroundColor: 'rgba(204,0,0,0.08)',
          fill: true, tension: 0.3, pointRadius: 5,
        },
        {
          label: 'Ohio Albanian Ancestry (ACS Self-Reported)',
          data: [1200, 2500, 3500, 3800, 4038, 4200],
          borderColor: DK, backgroundColor: 'rgba(26,26,46,0.08)',
          fill: true, tension: 0.3, pointRadius: 5,
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: 'Albanian Ancestry Population Growth (Census / ACS)', font: { size: 14, weight: 600 }},
        tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + fmtNum(ctx.parsed.y) }},
      },
      scales: { y: { beginAtZero: true, ticks: { callback: v => fmtNum(v) }}}
    }
  });
}

// --- Birthplace ---
function chartBirthplace(data) {
  if (!data) return;
  const d = data.ohio_albanian_birthplace || {};
  // Use actual keys from JSON, sorted by value descending, but put US-born last
  const entries = Object.entries(d).sort((a, b) => {
    if (a[0].startsWith('US-born')) return 1;
    if (b[0].startsWith('US-born')) return -1;
    return b[1] - a[1];
  });
  const ordered = entries.map(e => e[0]);
  const vals = entries.map(e => e[1]);

  makeChart('chart-birthplace', {
    type: 'doughnut',
    data: {
      labels: ordered,
      datasets: [{ data: vals, backgroundColor: PALETTE }]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: 'Place of Birth — Ohio Ethnic Albanians', font: { size: 13 }},
        tooltip: { callbacks: { label: ctx => ctx.label + ': ' + fmtNum(ctx.parsed) }},
      }
    }
  });
}

// --- Citizenship ---
function chartCitizenship(data) {
  if (!data) return;
  const d = data.ohio_albanian_citizenship || {};
  makeChart('chart-citizenship', {
    type: 'doughnut',
    data: {
      labels: Object.keys(d),
      datasets: [{ data: Object.values(d), backgroundColor: ['#2ecc71','#3498db','#e67e22'] }]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: 'Citizenship Status', font: { size: 13 }},
        tooltip: { callbacks: { label: ctx => ctx.label + ': ' + fmtNum(ctx.parsed) }},
      }
    }
  });
}

// --- Age ---
function chartAge(data) {
  if (!data) return;
  const d = data.ohio_albanian_age || {};
  const order = ['0-4','5-17','18-24','25-34','35-44','45-54','55-64','65+'];
  const total = order.reduce((s, k) => s + (d[k] || 0), 0);
  const pcts = order.map(k => total ? ((d[k] || 0) / total * 100).toFixed(1) : 0);

  makeChart('chart-age', {
    type: 'bar',
    data: {
      labels: order,
      datasets: [
        { label: 'Ohio Albanians (%)', data: pcts, backgroundColor: RED },
        { label: 'U.S. Average (%)', data: [6, 16, 9, 14, 13, 13, 13, 17], backgroundColor: GREY },
      ]
    },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: 'Age Distribution', font: { size: 13 }}},
      scales: { y: { beginAtZero: true, ticks: { callback: v => v + '%' }}}
    }
  });
}

// --- Gender ---
function chartGender(data) {
  if (!data) return;
  const d = data.ohio_albanian_gender || {};
  makeChart('chart-gender', {
    type: 'doughnut',
    data: {
      labels: Object.keys(d),
      datasets: [{ data: Object.values(d), backgroundColor: ['#3498db', '#e74c3c'] }]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: 'Gender Split', font: { size: 13 }},
        tooltip: { callbacks: { label: ctx => ctx.label + ': ' + fmtNum(ctx.parsed) }},
      }
    }
  });
}

// --- Education ---
function chartEducation(data) {
  if (!data) return;
  const d = data.ohio_albanian_education || {};
  const order = ['Less than High School','High School / GED','Some College / Associate\'s',
                 'Bachelor\'s Degree','Master\'s, Professional, or Doctorate'];
  const total = order.reduce((s, k) => s + (d[k] || 0), 0);
  const pcts = order.map(k => total ? ((d[k] || 0) / total * 100).toFixed(1) : 0);

  makeChart('chart-edu', {
    type: 'bar',
    data: {
      labels: ['< HS', 'HS / GED', 'Some College', "Bachelor's", "Master's+"],
      datasets: [
        { label: 'Ohio Albanians (%)', data: pcts, backgroundColor: RED },
        { label: 'U.S. Average (%)', data: [11, 27, 20, 22, 13], backgroundColor: GREY },
      ]
    },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: 'Educational Attainment (Age 25+)', font: { size: 13 }}},
      scales: { y: { beginAtZero: true, ticks: { callback: v => v + '%' }}}
    }
  });
}

// --- Language (static — based on Harvard/ACS) ---
function chartLanguage() {
  makeChart('chart-lang', {
    type: 'doughnut',
    data: {
      labels: ['English Only', 'Albanian at Home (bilingual)', 'Albanian at Home (limited English)', 'Other'],
      datasets: [{ data: [38, 35, 20, 7], backgroundColor: ['#3498db', RED, '#e67e22', GREY] }]
    },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: 'Language Use — Albanian Households (est.)', font: { size: 13 }}}
    }
  });
}

// --- Occupation ---
function chartOccupation(data) {
  if (!data) return;
  const d = data.ohio_albanian_occupation || {};
  const labels = Object.keys(d);
  const total = Object.values(d).reduce((s, v) => s + v, 0);
  const pcts = Object.values(d).map(v => total ? (v / total * 100).toFixed(1) : 0);

  makeChart('chart-occ', {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'Albanian Americans (%)', data: pcts, backgroundColor: RED },
        { label: 'U.S. Average (%)', data: [7, 8, 11, 14, 22, 10, 6, 18], backgroundColor: GREY },
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { title: { display: true, text: 'Industry Distribution (1st Generation)', font: { size: 13 }}},
      scales: { x: { beginAtZero: true, ticks: { callback: v => v + '%' }}}
    }
  });
}

// --- Income ---
function chartIncome(data) {
  if (!data) return;
  const d = data.ohio_albanian_income || {};
  const order = ['< $25K','$25K-$50K','$50K-$75K','$75K-$100K','$100K-$150K','$150K+'];
  const total = order.reduce((s, k) => s + (d[k] || 0), 0);
  const pcts = order.map(k => total ? ((d[k] || 0) / total * 100).toFixed(1) : 0);

  const subtitle = data.median_income_approx
    ? `Median ≈ $${fmtNum(data.median_income_approx)}`
    : '';

  makeChart('chart-income', {
    type: 'bar',
    data: {
      labels: order,
      datasets: [
        { label: 'Ohio Albanians (%)', data: pcts, backgroundColor: RED },
        { label: 'U.S. Average (%)', data: [16, 18, 17, 14, 16, 19], backgroundColor: GREY },
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: 'Household Income Distribution' + (subtitle ? ' — ' + subtitle : ''), font: { size: 13 }},
      },
      scales: { y: { beginAtZero: true, ticks: { callback: v => v + '%' }}}
    }
  });
}

// --- Year of Entry ---
function chartYOE(data) {
  if (!data) return;
  const d = data.ohio_albanian_year_of_entry || {};
  const order = ['Before 1980','1980-1989','1990-1999','2000-2009','2010-2019','2020+'];
  const vals = order.map(k => d[k] || 0);

  makeChart('chart-yoe', {
    type: 'bar',
    data: {
      labels: order,
      datasets: [{ label: 'Foreign-Born Albanian Arrivals (est.)', data: vals, backgroundColor: PALETTE }]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: 'Year of Entry — Foreign-Born Ethnic Albanians in Ohio', font: { size: 14, weight: 600 }},
        tooltip: { callbacks: { label: ctx => fmtNum(ctx.parsed.y) + ' people' }},
      },
      scales: { y: { beginAtZero: true, ticks: { callback: v => fmtNum(v) }}}
    }
  });
}

// --- PUMA Geography ---
function chartPUMA(data) {
  if (!data) return;
  const pumas = data.ohio_albanian_by_puma || {};
  const labels_map = data.puma_labels || {};
  const entries = Object.entries(pumas)
    .map(([k, v]) => ({ code: k, label: labels_map[k] || `PUMA ${k}`, val: v }))
    .sort((a, b) => b.val - a.val);

  makeChart('chart-puma', {
    type: 'bar',
    data: {
      labels: entries.map(e => e.label),
      datasets: [{ label: 'Estimated Population', data: entries.map(e => e.val), backgroundColor: PALETTE.concat(PALETTE) }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        title: { display: true, text: 'Albanian Population by PUMA Area', font: { size: 14, weight: 600 }},
        tooltip: { callbacks: { label: ctx => fmtNum(ctx.parsed.x) }},
      },
      scales: { x: { beginAtZero: true, ticks: { callback: v => fmtNum(v) }}}
    }
  });
}

// --- Columbus areas ---
function chartColumbusAreas(community) {
  if (!community || !community.concentration_areas) return;
  const areas = community.concentration_areas.columbus || [];
  makeChart('chart-columbus-areas', {
    type: 'bar',
    data: {
      labels: areas.map(a => a.name),
      datasets: [{ label: 'Concentration Index (0-100)', data: areas.map(a => a.intensity),
        backgroundColor: areas.map((_, i) => PALETTE[i % PALETTE.length]) }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        title: { display: true, text: 'Columbus Metro — Relative Albanian Concentration', font: { size: 13 }},
      },
      scales: { x: { beginAtZero: true, max: 100 }}
    }
  });
}

// --- State comparison ---
function chartStates(data) {
  if (!data) return;
  const states = (data.albanian_by_state || []).sort((a, b) => b.ancestry_count - a.ancestry_count);

  makeChart('chart-states', {
    type: 'bar',
    data: {
      labels: states.map(s => s.state),
      datasets: [
        { label: 'ACS Ancestry (self-reported)', data: states.map(s => s.ancestry_count), backgroundColor: RED },
        { label: 'Broad Estimate (incl. Kosovo/etc.)', data: states.map(s => s.broad_estimate), backgroundColor: 'rgba(204,0,0,0.25)', borderColor: RED, borderWidth: 1 },
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: 'Albanian Population by State — ACS vs. Broad Estimate', font: { size: 14, weight: 600 }},
        tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + fmtNum(ctx.parsed.y) }},
      },
      scales: { y: { beginAtZero: true, ticks: { callback: v => fmtNum(v) }}}
    }
  });

  // Fill state table
  const tbody = $('#state-table-body');
  if (tbody) {
    tbody.innerHTML = states.map(s => {
      const ratio = (s.broad_estimate / s.ancestry_count).toFixed(1);
      const highlight = s.state === 'Ohio' ? ' style="background:#fce4ec;font-weight:600;"' : '';
      return `<tr${highlight}><td>${s.state}</td><td>${fmtNum(s.ancestry_count)}</td><td>${fmtNum(s.broad_estimate)}</td><td>${ratio}x</td></tr>`;
    }).join('');
  }
}


// ============================================================
// MAPS
// ============================================================
let maps = {};

function initMaps(community) {
  if (!community) return;

  // --- Columbus Map ---
  const mapC = L.map('map-columbus').setView([40.05, -82.98], 11);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 18
  }).addTo(mapC);

  addMarkers(mapC, community.columbus_institutions || []);
  addConcentrations(mapC, (community.concentration_areas || {}).columbus || []);
  addLegend(mapC);
  maps.columbus = mapC;

  // --- Cleveland Map ---
  const mapCL = L.map('map-cleveland').setView([41.48, -81.80], 12);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OSM &copy; CARTO', maxZoom: 18
  }).addTo(mapCL);

  addMarkers(mapCL, community.cleveland_institutions || []);
  addConcentrations(mapCL, (community.concentration_areas || {}).cleveland || []);
  addLegend(mapCL);
  maps.cleveland = mapCL;

  // --- Ohio overview map ---
  const mapOH = L.map('map-ohio').setView([40.2, -82.5], 7);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OSM &copy; CARTO', maxZoom: 18
  }).addTo(mapOH);

  // Big circles for Columbus and Cleveland
  L.circle([40.00, -82.99], { radius: 30000, color: RED, fillColor: RED, fillOpacity: 0.25, weight: 2 })
    .addTo(mapOH).bindPopup('<strong>Columbus Metro</strong><br>Est. 5,000-8,000 ethnic Albanians');
  L.circle([41.48, -81.80], { radius: 35000, color: RED, fillColor: RED, fillOpacity: 0.35, weight: 2 })
    .addTo(mapOH).bindPopup('<strong>Greater Cleveland</strong><br>Est. 8,000-20,000 ethnic Albanians');
  // Smaller circles for other communities
  L.circle([39.10, -84.51], { radius: 15000, color: RED, fillColor: RED, fillOpacity: 0.1, weight: 1 })
    .addTo(mapOH).bindPopup('<strong>Cincinnati Area</strong><br>Small Albanian community');
  L.circle([41.08, -81.52], { radius: 12000, color: RED, fillColor: RED, fillOpacity: 0.1, weight: 1 })
    .addTo(mapOH).bindPopup('<strong>Akron Area</strong><br>Small Albanian community');

  addLegend(mapOH);
  maps.ohio = mapOH;
}

function addMarkers(map, institutions) {
  const iconMap = {
    restaurant: { bg: '#e67e22', symbol: 'R' },
    cultural_org: { bg: RED, symbol: '★' },
    education: { bg: '#2ecc71', symbol: 'E' },
    religious: { bg: '#9b59b6', symbol: '✦' },
    cultural: { bg: RED, symbol: '★' },
    community: { bg: '#3498db', symbol: 'C' },
  };

  institutions.forEach(inst => {
    if (!inst.lat || !inst.lng) return;
    const cfg = iconMap[inst.type] || { bg: GREY, symbol: '•' };
    const icon = L.divIcon({
      html: `<div style="background:${cfg.bg};color:#fff;border-radius:50%;width:26px;height:26px;
             display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;
             border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.3);">${cfg.symbol}</div>`,
      iconSize: [26, 26], iconAnchor: [13, 13]
    });
    L.marker([inst.lat, inst.lng], { icon })
      .addTo(map)
      .bindPopup(`<strong>${inst.name}</strong><br><span style="font-size:.85rem;">${inst.description || ''}</span>
        ${inst.address ? '<br><em style="font-size:.8rem;">' + inst.address + '</em>' : ''}`);
  });
}

function addConcentrations(map, areas) {
  areas.forEach(a => {
    if (!a.lat || !a.lng) return;
    const radius = 1500 + (a.intensity || 50) * 20;
    L.circle([a.lat, a.lng], {
      radius: radius,
      color: RED,
      fillColor: RED,
      fillOpacity: (a.intensity || 50) / 250,
      weight: 1,
      opacity: 0.5,
    }).addTo(map).bindPopup(`<strong>${a.name}</strong><br>Relative concentration: ${a.intensity}/100`);
  });
}

function addLegend(map) {
  const legend = L.control({ position: 'bottomright' });
  legend.onAdd = function () {
    const div = L.DomUtil.create('div');
    div.style.cssText = 'background:#fff;padding:10px 14px;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,.15);font-size:.8rem;line-height:1.9;';
    div.innerHTML = `
      <strong>Legend</strong><br>
      <span style="color:${RED}">★</span> Cultural / Organization<br>
      <span style="color:#e67e22;font-weight:bold;">R</span> Restaurant<br>
      <span style="color:#2ecc71;font-weight:bold;">E</span> Education<br>
      <span style="color:#9b59b6">✦</span> Religious<br>
      <span style="display:inline-block;width:10px;height:10px;background:rgba(204,0,0,0.25);border:1px solid ${RED};border-radius:50%;vertical-align:middle;"></span> Concentration area
    `;
    return div;
  };
  legend.addTo(map);
}

// Map toggle
window.showMap = function(which) {
  ['columbus', 'cleveland', 'ohio'].forEach(id => {
    const el = document.getElementById('map-' + id);
    if (el) el.style.display = id === which ? 'block' : 'none';
  });
  $$('.map-controls button').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.toLowerCase().includes(which));
  });
  // Invalidate size so tiles render properly
  setTimeout(() => { if (maps[which]) maps[which].invalidateSize(); }, 100);
};

// ============================================================
// SCROLL SPY for nav
// ============================================================
function initScrollSpy() {
  const sections = $$('section[id]');
  const navLinks = $$('.nav a[href^="#"]');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(l => l.classList.remove('active'));
        const link = document.querySelector(`.nav a[href="#${entry.target.id}"]`);
        if (link) link.classList.add('active');
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px' });

  sections.forEach(s => observer.observe(s));
}

// ============================================================
// BOOT
// ============================================================
async function init() {
  // Load all data in parallel
  const [pop, age, edu, gender, income, cit, yoe, puma, birth, occ, states, community] = await Promise.all([
    loadJSON('albanian_population_summary.json'),
    loadJSON('albanian_age_distribution.json'),
    loadJSON('albanian_education.json'),
    loadJSON('albanian_gender.json'),
    loadJSON('albanian_income.json'),
    loadJSON('albanian_citizenship.json'),
    loadJSON('albanian_year_of_entry.json'),
    loadJSON('albanian_puma_geography.json'),
    loadJSON('albanian_birthplace.json'),
    loadJSON('albanian_occupation.json'),
    loadJSON('albanian_state_comparison.json'),
    loadJSON('albanian_community_institutions.json'),
  ]);

  // Render everything
  renderStats(pop, puma);
  chartPopTrend();
  chartBirthplace(birth);
  chartCitizenship(cit);
  chartAge(age);
  chartGender(gender);
  chartEducation(edu);
  chartLanguage();
  chartOccupation(occ);
  chartIncome(income);
  chartYOE(yoe);
  chartPUMA(puma);
  chartColumbusAreas(community);
  chartStates(states);
  initMaps(community);
  initScrollSpy();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
