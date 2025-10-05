// mapa.js
const map = L.map('map').setView([-10, -75], 6);
// expose map to global so landing can call invalidateSize after reveal
window.appMap = map;

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// UI elements
const sidebar = document.getElementById('sidebar');
const sidebarContent = document.getElementById('sidebarContent');
const closeSidebarBtn = document.getElementById('closeSidebar');

// create a simple header controls area (insert dynamically)
const header = document.createElement('div');
header.className = 'header';
header.innerHTML = `
  <div>
    <div class="title">Plantas en Peligro de Extinción — Perú</div>
    <div class="subtitle">Explora registros geolocalizados — Filtra por departamento, provincia o ID</div>
    <div class="controls">
      <div class="search"><input id="searchInput" placeholder="Buscar por Departamento / Provincia / ID / UUID"></div>
      <button id="clearBtn" class="btn">Limpiar</button>
    </div>
  </div>
`;
document.body.appendChild(header);

// add stats and theme toggle
const stats = document.createElement('div');
stats.className = 'stats';
stats.innerHTML = `<div>Total: <strong id="totalCount">0</strong></div><div>Visibles: <strong id="visibleCount">0</strong></div>`;
header.appendChild(stats);
// theme toggle removed by user request

// colors and legend
const llaretaColor = '#6ab04c'; // green
const pataColor = '#e17055'; // warm orange
const defaultColor = '#2b7cff'; // blue (fallback)

const legend = document.createElement('div');
legend.className = 'legend';
legend.innerHTML = `
  <div><span class='dot' style='background:${llaretaColor}'></span> Llareta</div>
  <div style='margin-top:6px'><span class='dot' style='background:${pataColor}'></span> Pata de huanaco</div>
`;
document.body.appendChild(legend);

function openSidebar(item) {
  const img = item.image_url ? `<img class="photo" src="${item.image_url}" alt="Foto ${item.id}">` : '';
  // if license is empty, show the user name in its place per user request
  const licenseOrUser = (item.license && String(item.license).trim()) ? item.license : (item.user_name || 'Desconocido');
  const html = `
    ${img}
    <h3>${escapeHtml(item.scientific_name || ('ID: ' + (item.id || '')))}</h3>
    <div class="meta"><strong>Nombre común:</strong> ${escapeHtml(item.common_name || '')}</div>
    <div class="meta"><strong>ID:</strong> ${escapeHtml(item.id || '')}</div>
    <div class="meta"><strong>Usuario:</strong> ${escapeHtml(item.user_name || '')}</div>
    <div class="meta"><strong>Licencia / Autor:</strong> ${escapeHtml(licenseOrUser)}</div>
    <div class="meta"><strong>Departamento:</strong> ${escapeHtml(item.place_state_name || '')}</div>
    <div class="meta"><strong>Provincia:</strong> ${escapeHtml(item.place_county_name || '')}</div>
    <div class="meta"><strong>Lat / Lng:</strong> ${escapeHtml(item.latitude || '')} , ${escapeHtml(item.longitude || '')}</div>
    <div class="source">Fuente: iNaturalist (imagen externa)</div>
  `;
  sidebarContent.innerHTML = html;
  sidebar.classList.add('open');
  sidebar.setAttribute('aria-hidden', 'false');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebar.setAttribute('aria-hidden', 'true');
}
closeSidebarBtn.addEventListener('click', closeSidebar);
map.on('click', () => closeSidebar());

function escapeHtml(s) {
  if (!s && s !== 0) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// markers store for filtering & hover
const markers = [];

// pulse overlay to highlight selected marker (DivIcon)
const pulseIcon = L.divIcon({
  className: 'pulse',
  html: `<div class="dot"></div>`,
  iconSize: [28,28],
  iconAnchor: [14,14]
});
let pulseMarker = null;
function showPulseAt(lat, lng){
  hidePulse();
  pulseMarker = L.marker([lat, lng], { icon: pulseIcon, interactive: false, zIndexOffset: 1000 }).addTo(map);
}
function hidePulse(){ if (pulseMarker) { map.removeLayer(pulseMarker); pulseMarker = null; } }

// helper to create custom icon (simple colored circle)
function createCircleMarker(lat, lng, opts){
  return L.circleMarker([lat, lng], {
    radius: 7,
    fillColor: '#2b7cff',
    color: '#021124',
    weight: 1,
    opacity: 1,
    fillOpacity: 0.95,
    ...opts
  });
}

// Parse CSV with PapaParse
Papa.parse('data.csv', {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function(results) {
    const data = results.data || [];
    if (!data.length) {
      alert('No hay registros en datos.csv o el archivo está vacío.');
      return;
    }

    data.forEach(row => {
      const lat = parseFloat(row.latitude);
      const lng = parseFloat(row.longitude);
      if (isNaN(lat) || isNaN(lng)) return; // ignore invalid

      // choose color by species/common name
      const speciesText = ((row.scientific_name || '') + ' ' + (row.common_name || '')).toLowerCase();
      let color = defaultColor;
      if (speciesText.indexOf('llareta') !== -1 || speciesText.indexOf('azorella') !== -1) {
        color = llaretaColor;
      } else if (speciesText.indexOf('pata') !== -1 || speciesText.indexOf('guanaco') !== -1) {
        color = pataColor;
      }
      const marker = createCircleMarker(lat, lng, { fillColor: color }).addTo(map);

      // popup content with small thumbnail
      const thumbHtml = row.image_url
        ? `<img class="popup-thumb" src="${escapeHtml(row.image_url)}" alt="thumb ${escapeHtml(row.id)}">`
        : '';
      const licenseOrUser = (row.license && String(row.license).trim()) ? row.license : (row.user_name || 'Desconocido');
      const popupHtml = `
        <strong>${escapeHtml(row.scientific_name || ('ID: ' + (row.id || '')))}</strong>
        <div style="font-size:12px;color:#445">${escapeHtml(row.common_name || '')}</div>
        <div style="font-size:12px;color:#667;margin-top:6px">${escapeHtml(row.place_county_name || '')}, ${escapeHtml(row.place_state_name || '')}</div>
        ${thumbHtml}
        <div style="font-size:11px;color:#7b8794;margin-top:6px">Licencia / Autor: ${escapeHtml(licenseOrUser)}</div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 260 });

      // interactions
      marker.on('click', () => {
        openSidebar(row);
        showPulseAt(lat, lng);
      });
      marker.on('mouseover', function(){ this.setStyle({ radius: 10 }); this.openPopup(); showPulseAt(lat, lng); });
      marker.on('mouseout', function(){ this.setStyle({ radius: 7 }); this.closePopup(); hidePulse(); });

      markers.push({ marker, row, lat, lng });
    });

    // fit map to markers bounds
    const group = L.featureGroup(markers.map(m => m.marker));
    if (group.getLayers().length) map.fitBounds(group.getBounds().pad(0.15));

    // set up search
    const input = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearBtn');
    const totalCountEl = document.getElementById('totalCount');
    const visibleCountEl = document.getElementById('visibleCount');
    totalCountEl.innerText = markers.length;
    function updateVisibleCount(){ visibleCountEl.innerText = markers.filter(m=>map.hasLayer(m.marker)).length; }

    function applyFilter(){
      const q = (input.value || '').trim().toLowerCase();
      let any = false;
      markers.forEach(({marker, row}) => {
        const haystack = [row.place_state_name, row.place_county_name, row.id, row.uuid, row.scientific_name].filter(Boolean).join(' ').toLowerCase();
        const show = !q || haystack.indexOf(q) !== -1;
        if (show) { marker.addTo(map); any = true; } else { map.removeLayer(marker); }
      });
      if (!any) {
        legend.innerHTML = `<div style="color:#b91c1c">No se encontraron registros</div>`;
      } else {
        legend.innerHTML = `<div><span class='dot' style='background:#2b7cff'></span> Registro(s): ${markers.filter(m=>map.hasLayer(m.marker)).length}</div>`;
      }
      updateVisibleCount();
    }
    input.addEventListener('input', applyFilter);
    clearBtn.addEventListener('click', () => { input.value=''; applyFilter(); });
    // initial counts
    updateVisibleCount();
  },
  error: function(err) {
    console.error('Error cargando CSV:', err);
    alert('No se pudo cargar datos.csv. Asegúrate de servir los archivos con un servidor HTTP (no abrir el archivo directamente).');
  }
});
