// scripts/main.js
import { getWeatherForCities } from './api.js';
import { sleep, clamp } from './utils.js';

const MIN_CITIES = 3;
const MAX_CITIES = 8;

const cityFields = document.getElementById('cityFields');
const addBtn = document.getElementById('addCityBtn');
const cityForm = document.getElementById('cityForm');
const emptyState = document.getElementById('emptyState');
const weatherResult = document.getElementById('weatherResult');
const deltaBtn = document.getElementById('toggleDeltaBtn');

let deltaMode = false;
let lastData = [];
let sortBy = 'temperature';
let sortDir = 'desc';

function makeCityField(value = '') {
    const wrap = document.createElement('div');
    wrap.className = 'city-input-wrap';
    const input = document.createElement('input');
    input.className = 'city-input';
    input.type = 'text';
    input.placeholder = 'Enter city...';
    input.value = value;
    input.required = true;
    input.setAttribute('aria-label', 'City');

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.title = 'Remove city';
    removeBtn.className = 'remove-btn';
    removeBtn.onclick = () => {
        wrap.remove();
        checkState();
    };

    wrap.appendChild(input);
    wrap.appendChild(removeBtn);
    return wrap;
}

function ensureMinFields() {
    while (cityFields.children.length < MIN_CITIES) {
        cityFields.appendChild(makeCityField());
    }
}
function getCityValues() {
    return Array.from(cityFields.querySelectorAll('input.city-input'))
        .map(input => input.value.trim()).filter(Boolean);
}
function checkState() {
    if (getCityValues().length < MIN_CITIES) {
        emptyState.hidden = false;
        weatherResult.innerHTML = '';
    } else {
        emptyState.hidden = true;
    }
}
addBtn.onclick = () => {
    if (cityFields.children.length < MAX_CITIES)
        cityFields.appendChild(makeCityField());
};
cityFields.addEventListener('input', checkState);

cityForm.onsubmit = async (e) => {
    e.preventDefault();
    const cities = getCityValues();
    if (cities.length < MIN_CITIES) {
        checkState();
        return;
    }
    renderLoader();
    try {
        let data = await getWeatherForCities(cities, null);
        lastData = data;
        renderWeatherTable(data);
    } catch (e) {
        renderError('Failed to load weather data… Try again.');
    }
};

function renderLoader() {
    weatherResult.innerHTML = '<div class="loader" role="status" aria-label="Loading"></div>';
}
function renderError(msg) {
    weatherResult.innerHTML = `<section class="state centered">❌ ${msg}</section>`;
}
function renderWeatherTable(citiesData) {
    if (!citiesData.length) return renderError('No data to display');
    if (citiesData.some(d => d.error)) {
        weatherResult.innerHTML = `<section class="state centered">
            ${citiesData.map(d => d.error ? `<div>⚠️ ${d.city}: ${d.error}</div>` : '').join('')}
        </section>`;
        return;
    }
    // Prepare table head/rows
    let metrics = [
        { key: 'temperature', label: 'Temp (°C)' },
        { key: 'windspeed', label: 'Wind (km/h)' },
        { key: 'weathercode', label: 'Code' },
        { key: 'trend', label: 'Temp Trend', spark: true }
    ];
    let ths = '<th></th>' + citiesData.map(d => `<th>${d.city}</th>`).join('');
    let rows = '';
    for (let m of metrics) {
        rows += `<tr><th>${m.label}</th>";
        let baseVal = deltaMode&&m.key!=='trend'?parseFloat(citiesData[0].weather[m.key]):null;
        for (let d of citiesData) {
            let val = d.weather[m.key];
            let cell = '';
            if (m.spark) {
                cell = `<td class="sparkline-cell">${renderSparkline(d.weather.trend)}</td>`;
            } else if (deltaMode && baseVal!==null && !isNaN(val)) {
                let diff = +(val-baseVal).toFixed(2);
                let pre = diff===0?'':(diff>0?'+':'');
                cell = `<td class="delta-cell">${pre}${diff}</td>`;
            } else {
                cell = `<td>${val}</td>`;
            }
            rows += cell;
        }
        rows += '</tr>';
    }
    // Sort UI
    weatherResult.innerHTML = `
    <table class="weather-table">
      <thead><tr>${ths}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderSparkline(trendArr) {
    if (!trendArr || !trendArr.length) return '';
    // Normalize for SVG height (16-42px)
    const min = Math.min(...trendArr), max = Math.max(...trendArr), N = trendArr.length;
    const H = 22, top = 5, bot = H-3;
    const points = trendArr.map((v,i) => {
        let y = bot - (bot-top) * (v-min) / ((max-min)||1);
        let x = 4 + (H*1.55)*(i/(N-1));
        return [x,y];
    });
    const path = points.map((p,i) => i===0?`M${p[0]},${p[1]}`:`L${p[0]},${p[1]}`).join(' ');
    return `<svg width="72" height="26"><path d="${path}" stroke="#764ba2" stroke-width="2" fill="none"/></svg>`;
}

deltaBtn.onclick = () => {
  deltaMode = !deltaMode;
  deltaBtn.setAttribute('aria-pressed', deltaMode ? 'true' : 'false');
  deltaBtn.classList.toggle('active', deltaMode);
  if (lastData.length) renderWeatherTable(lastData);
};

// On load, add 3 fields and trigger state check
ensureMinFields();
checkState();
