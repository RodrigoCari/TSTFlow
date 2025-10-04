// mapa.js
const map = L.map('map').setView([-10, -75], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

const sidebar = document.getElementById('sidebar');
const sidebarContent = document.getElementById('sidebarContent');
const closeSidebarBtn = document.getElementById('closeSidebar');

function openSidebar(item) {
  // item es un objeto con claves del CSV: id, uuid, image_url, latitude, longitude, place_county_name, place_state_name
  const img = item.image_url ? `<img class="photo" src="${item.image_url}" alt="Foto ${item.id}">` : '';
  const html = `
    ${img}
    <h3>ID: ${escapeHtml(item.id || '')}</h3>
    <div class="meta"><strong>UUID:</strong> ${escapeHtml(item.uuid || '')}</div>
    <div class="meta"><strong>Departamento:</strong> ${escapeHtml(item.place_state_name || '')}</div>
    <div class="meta"><strong>Provincia:</strong> ${escapeHtml(item.place_county_name || '')}</div>
    <div class="meta"><strong>Lat / Lng:</strong> ${escapeHtml(item.latitude || '')} , ${escapeHtml(item.longitude || '')}</div>
    <div style="margin-top:10px;font-size:13px;color:#555;">
      Fuente: iNaturalist (imagen externa)
    </div>
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
// also close when clicking map (optional)
map.on('click', () => closeSidebar());

// simple HTML escape to avoid insetting untrusted markup
function escapeHtml(s) {
  if (!s && s !== 0) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Parse CSV with PapaParse (download: true to fetch local CSV)
Papa.parse('datos.csv', {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function(results) {
    const data = results.data;
    data.forEach(row => {
      const lat = parseFloat(row.latitude);
      const lng = parseFloat(row.longitude);
      if (isNaN(lat) || isNaN(lng)) return; // ignore invalid
      // create marker (circleMarker)
      const marker = L.circleMarker([lat, lng], {
        radius: 6,
        fillColor: '#2b7cff',
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.9
      }).addTo(map);

      // popup content with small thumbnail
      const thumbHtml = row.image_url
        ? `<img class="popup-thumb" src="${escapeHtml(row.image_url)}" alt="thumb ${escapeHtml(row.id)}">`
        : '';
      const popupHtml = `<strong>ID: ${escapeHtml(row.id)}</strong><br>${escapeHtml(row.place_county_name || '')}, ${escapeHtml(row.place_state_name || '')}${thumbHtml}`;

      marker.bindPopup(popupHtml, { maxWidth: 220 });

      // open sidebar with more info when marker clicked
      marker.on('click', () => {
        openSidebar(row);
      });
    });
  },
  error: function(err) {
    console.error('Error cargando CSV:', err);
    alert('No se pudo cargar datos.csv. Asegúrate de servir los archivos con un servidor HTTP (no abrir el archivo directamente).');
  }
});
