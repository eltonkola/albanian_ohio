/**
 * Albanians in Columbus — Static Research Site
 * Columbus metro page script
 *
 * Loads data from data/processed/columbus_*.json and renders
 * Chart.js charts + Leaflet map for the Columbus metro area.
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
function renderStats(pop) {
  const row = $('#stats-row');
  if (!row || !pop) return;

  const items = [
    { num: fmtNum(pop.total_columbus_broad), label: 'Broad Estimate (Columbus Metro PUMS)' },
    { num: fmtNum(pop.total_columbus_core), label: 'Franklin County Core (PUMS)' },
    { num: fmtNum(pop.total_columbus_ancestry_only), label: 'Albanian Ancestry Only (PUMS)' },
    { num: fmtNum(pop.unweighted_records), label: 'Unweighted PUMS Records' },
  ];

  row.innerHTML = items.map(i => `
    <div class="stat-box">
      <div class="num">${i.num}</div>
      <div class="label">${i.label}</div>
    </div>
  `).join('');
}

// ============================================================
// CHARTS
// ============================================================

// --- Birthplace ---
function chartBirthplace(data) {
  if (!data) return;
  const d = data.columbus_albanian_birthplace || {};
  const entries = Object.entries(d).sort((a, b) => {
    if (a[0].startsWith('US-born')) return 1;
    if (b[0].startsWith('US-born')) return -1;
    return b[1] - a[1];
  });

  makeChart('chart-birthplace', {
    type: 'doughnut',
    data: {
      labels: entries.map(e => e[0]),
      datasets: [{ data: entries.map(e => e[1]), backgroundColor: PALETTE }]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: 'Place of Birth — Columbus Metro Ethnic Albanians', font: { size: 13 }},
        tooltip: { callbacks: { label: ctx => ctx.label + ': ' + fmtNum(ctx.parsed) }},
      }
    }
  });
}

// --- Citizenship ---
function chartCitizenship(data) {
  if (!data) return;
  const d = data.columbus_albanian_citizenship || {};
  makeChart('chart-citizenship', {
    type: 'doughnut',
    data: {
      labels: Object.keys(d),
      datasets: [{ data: Object.values(d), backgroundColor: ['#2ecc71','#3498db','#e67e22'] }]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: 'Citizenship Status — Columbus Metro', font: { size: 13 }},
        tooltip: { callbacks: { label: ctx => ctx.label + ': ' + fmtNum(ctx.parsed) }},
      }
    }
  });
}

// --- Age ---
function chartAge(data) {
  if (!data) return;
  const d = data.columbus_albanian_age || {};
  const order = ['0-4','5-17','18-24','25-34','35-44','45-54','55-64','65+'];
  const total = order.reduce((s, k) => s + (d[k] || 0), 0);
  const pcts = order.map(k => total ? ((d[k] || 0) / total * 100).toFixed(1) : 0);

  makeChart('chart-age', {
    type: 'bar',
    data: {
      labels: order,
      datasets: [
        { label: 'Columbus Albanians (%)', data: pcts, backgroundColor: RED },
        { label: 'Ohio Avg (%)', data: [6, 16, 9, 14, 13, 13, 13, 17], backgroundColor: GREY },
      ]
    },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: 'Age Distribution — Columbus Metro', font: { size: 13 }}},
      scales: { y: { beginAtZero: true, ticks: { callback: v => v + '%' }}}
    }
  });
}

// --- Gender ---
function chartGender(data) {
  if (!data) return;
  const d = data.columbus_albanian_gender || {};
  makeChart('chart-gender', {
    type: 'doughnut',
    data: {
      labels: Object.keys(d),
      datasets: [{ data: Object.values(d), backgroundColor: ['#3498db', '#e74c3c'] }]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: 'Gender Split — Columbus Metro', font: { size: 13 }},
        tooltip: { callbacks: { label: ctx => ctx.label + ': ' + fmtNum(ctx.parsed) }},
      }
    }
  });
}

// --- Education ---
function chartEducation(data) {
  if (!data) return;
  const d = data.columbus_albanian_education || {};
  const order = ['Less than High School','High School / GED','Some College / Associate\'s',
                 'Bachelor\'s Degree','Master\'s, Professional, or Doctorate'];
  const total = order.reduce((s, k) => s + (d[k] || 0), 0);
  const pcts = order.map(k => total ? ((d[k] || 0) / total * 100).toFixed(1) : 0);

  makeChart('chart-edu', {
    type: 'bar',
    data: {
      labels: ['< HS', 'HS / GED', 'Some College', "Bachelor's", "Master's+"],
      datasets: [
        { label: 'Columbus Albanians (%)', data: pcts, backgroundColor: RED },
        { label: 'U.S. Average (%)', data: [11, 27, 20, 22, 13], backgroundColor: GREY },
      ]
    },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: 'Educational Attainment (Age 25+) — Columbus Metro', font: { size: 13 }}},
      scales: { y: { beginAtZero: true, ticks: { callback: v => v + '%' }}}
    }
  });
}

// --- Occupation ---
function chartOccupation(data) {
  if (!data) return;
  const d = data.columbus_albanian_occupation || {};
  const labels = Object.keys(d);
  const total = Object.values(d).reduce((s, v) => s + v, 0);
  const pcts = Object.values(d).map(v => total ? (v / total * 100).toFixed(1) : 0);

  makeChart('chart-occ', {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'Columbus Albanians (%)', data: pcts, backgroundColor: RED },
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { title: { display: true, text: 'Occupation Distribution — Columbus Metro', font: { size: 13 }}},
      scales: { x: { beginAtZero: true, ticks: { callback: v => v + '%' }}}
    }
  });
}

// --- Income ---
function chartIncome(data) {
  if (!data) return;
  const d = data.columbus_albanian_income || {};
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
        { label: 'Columbus Albanians (%)', data: pcts, backgroundColor: RED },
        { label: 'U.S. Average (%)', data: [16, 18, 17, 14, 16, 19], backgroundColor: GREY },
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: 'Income Distribution — Columbus Metro' + (subtitle ? ' — ' + subtitle : ''), font: { size: 13 }},
      },
      scales: { y: { beginAtZero: true, ticks: { callback: v => v + '%' }}}
    }
  });
}

// --- Year of Entry ---
function chartYOE(data) {
  if (!data) return;
  const d = data.columbus_albanian_year_of_entry || {};
  const order = ['Before 1980','1980-1989','1990-1999','2000-2009','2010-2019','2020+'];
  const vals = order.map(k => d[k] || 0);

  makeChart('chart-yoe', {
    type: 'bar',
    data: {
      labels: order,
      datasets: [{ label: 'Foreign-Born Albanian Arrivals', data: vals, backgroundColor: PALETTE }]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: 'Year of Entry — Foreign-Born Ethnic Albanians in Columbus Metro', font: { size: 14, weight: 600 }},
        tooltip: { callbacks: { label: ctx => fmtNum(ctx.parsed.y) + ' people' }},
      },
      scales: { y: { beginAtZero: true, ticks: { callback: v => fmtNum(v) }}}
    }
  });
}

// --- PUMA Geography ---
function chartPUMA(data) {
  if (!data) return;
  const pumas = data.columbus_albanian_by_puma || {};
  const labels_map = data.puma_labels || {};
  const entries = Object.entries(pumas)
    .map(([k, v]) => ({ code: k, label: labels_map[k] || `PUMA ${k}`, val: v }))
    .sort((a, b) => b.val - a.val);

  makeChart('chart-puma', {
    type: 'bar',
    data: {
      labels: entries.map(e => e.label),
      datasets: [{ label: 'Estimated Population', data: entries.map(e => e.val), backgroundColor: PALETTE }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        title: { display: true, text: 'Albanian Population by PUMA — Columbus Metro', font: { size: 14, weight: 600 }},
        tooltip: { callbacks: { label: ctx => fmtNum(ctx.parsed.x) }},
      },
      scales: { x: { beginAtZero: true, ticks: { callback: v => fmtNum(v) }}}
    }
  });
}

// --- Columbus concentration areas (from community institutions data) ---
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


// ============================================================
// MAP
// ============================================================
function initMap(community) {
  if (!community) return;

  const mapC = L.map('map-columbus').setView([40.05, -82.98], 11);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 18
  }).addTo(mapC);

  // Markers for institutions
  const iconMap = {
    restaurant: { bg: '#e67e22', symbol: 'R' },
    cultural_org: { bg: RED, symbol: '★' },
    education: { bg: '#2ecc71', symbol: 'E' },
    religious: { bg: '#9b59b6', symbol: '✦' },
    cultural: { bg: RED, symbol: '★' },
    community: { bg: '#3498db', symbol: 'C' },
  };

  (community.columbus_institutions || []).forEach(inst => {
    if (!inst.lat || !inst.lng) return;
    const cfg = iconMap[inst.type] || { bg: GREY, symbol: '•' };
    const icon = L.divIcon({
      html: `<div style="background:${cfg.bg};color:#fff;border-radius:50%;width:26px;height:26px;
             display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;
             border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.3);">${cfg.symbol}</div>`,
      iconSize: [26, 26], iconAnchor: [13, 13]
    });
    L.marker([inst.lat, inst.lng], { icon })
      .addTo(mapC)
      .bindPopup(`<strong>${inst.name}</strong><br><span style="font-size:.85rem;">${inst.description || ''}</span>
        ${inst.address ? '<br><em style="font-size:.8rem;">' + inst.address + '</em>' : ''}`);
  });

  // Concentration circles
  (community.concentration_areas?.columbus || []).forEach(a => {
    if (!a.lat || !a.lng) return;
    const radius = 1500 + (a.intensity || 50) * 20;
    L.circle([a.lat, a.lng], {
      radius, color: RED, fillColor: RED,
      fillOpacity: (a.intensity || 50) / 250,
      weight: 1, opacity: 0.5,
    }).addTo(mapC).bindPopup(`<strong>${a.name}</strong><br>Relative concentration: ${a.intensity}/100`);
  });

  // Legend
  const legend = L.control({ position: 'bottomright' });
  legend.onAdd = function () {
    const div = L.DomUtil.create('div');
    div.style.cssText = 'background:#fff;padding:10px 14px;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,.15);font-size:.8rem;line-height:1.9;';
    div.innerHTML = `
      <strong>Legend</strong><br>
      <span style="color:${RED}">★</span> Cultural / Organization<br>
      <span style="color:#e67e22;font-weight:bold;">R</span> Restaurant<br>
      <span style="color:#9b59b6">✦</span> Religious<br>
      <span style="display:inline-block;width:10px;height:10px;background:rgba(204,0,0,0.25);border:1px solid ${RED};border-radius:50%;vertical-align:middle;"></span> Concentration area
    `;
    return div;
  };
  legend.addTo(mapC);
}


// ============================================================
// INSTITUTIONS LIST
// ============================================================
function renderInstitutions(community) {
  if (!community) return;
  const el = $('#institutions-list');
  if (!el) return;

  const items = (community.columbus_institutions || []).map(inst => `
    <div style="margin:10px 0;padding:10px;background:#f9f9fc;border-radius:8px;border-left:3px solid ${RED};">
      <strong>${inst.name}</strong> <span style="font-size:.8rem;color:var(--muted);">(${inst.type})</span><br>
      <span style="font-size:.88rem;">${inst.description || ''}</span>
      ${inst.address ? '<br><em style="font-size:.82rem;color:var(--muted);">' + inst.address + '</em>' : ''}
    </div>
  `).join('');

  el.innerHTML = items || '<p style="color:var(--muted);">No institution data available.</p>';
}


// ============================================================
// SCROLL SPY
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
  const [pop, age, edu, gender, income, cit, yoe, puma, birth, occ, community] = await Promise.all([
    loadJSON('columbus_population_summary.json'),
    loadJSON('columbus_age_distribution.json'),
    loadJSON('columbus_education.json'),
    loadJSON('columbus_gender.json'),
    loadJSON('columbus_income.json'),
    loadJSON('columbus_citizenship.json'),
    loadJSON('columbus_year_of_entry.json'),
    loadJSON('columbus_puma_geography.json'),
    loadJSON('columbus_birthplace.json'),
    loadJSON('columbus_occupation.json'),
    loadJSON('albanian_community_institutions.json'),
  ]);

  renderStats(pop);
  chartBirthplace(birth);
  chartCitizenship(cit);
  chartAge(age);
  chartGender(gender);
  chartEducation(edu);
  chartOccupation(occ);
  chartIncome(income);
  chartYOE(yoe);
  chartPUMA(puma);
  chartColumbusAreas(community);
  initMap(community);
  renderInstitutions(community);
  initScrollSpy();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
