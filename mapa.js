const map = L.map('map').setView([-10, -75], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

const estadoColor = {
  "Critically Endangered": "red",
  "Endangered": "orange",
  "Vulnerable": "yellow"
};

fetch('datos.json')
  .then(response => response.json())
  .then(data => {
    data.forEach(planta => {
      const color = estadoColor[planta.estado] || "gray";
      const marker = L.circleMarker([planta.lat, planta.lng], {
        radius: 6,
        fillColor: color,
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(map);
      marker.bindPopup(`<strong>${planta.nombre}</strong><br>Estado: ${planta.estado}`);
    });
  })
  .catch(err => console.error(err));
