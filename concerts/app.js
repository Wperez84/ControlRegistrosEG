let allConcerts = [];
let cart = {};

const genreFilter = document.getElementById('genreFilter');
const cityFilter = document.getElementById('cityFilter');
const searchInput = document.getElementById('searchInput');
const concertsGrid = document.getElementById('concertsGrid');
const modal = document.getElementById('concertModal');
const closeBtn = document.querySelector('.close-btn');

async function loadConcerts() {
  try {
    const response = await fetch('data.json');
    const data = await response.json();
    allConcerts = data.concerts;
    populateFilters();
    displayConcerts(allConcerts);
  } catch (error) {
    console.error('Error loading concerts:', error);
    concertsGrid.innerHTML = '<div class="no-concerts">Error cargando conciertos. Por favor intenta de nuevo.</div>';
  }
}

function populateFilters() {
  const genres = new Set(allConcerts.map(c => c.genre));
  const cities = new Set(allConcerts.map(c => c.city));

  genres.forEach(genre => {
    const option = document.createElement('option');
    option.value = genre;
    option.textContent = genre;
    genreFilter.appendChild(option);
  });

  cities.forEach(city => {
    const option = document.createElement('option');
    option.value = city;
    option.textContent = city;
    cityFilter.appendChild(option);
  });
}

function filterConcerts() {
  const genre = genreFilter.value;
  const city = cityFilter.value;
  const searchTerm = searchInput.value.toLowerCase();

  const filtered = allConcerts.filter(concert => {
    const matchGenre = !genre || concert.genre === genre;
    const matchCity = !city || concert.city === city;
    const matchSearch = !searchTerm ||
                        concert.name.toLowerCase().includes(searchTerm) ||
                        concert.artist.toLowerCase().includes(searchTerm);
    return matchGenre && matchCity && matchSearch;
  });

  displayConcerts(filtered);
}

function displayConcerts(concerts) {
  if (concerts.length === 0) {
    concertsGrid.innerHTML = '<div class="no-concerts">No se encontraron conciertos que coincidan con tus filtros.</div>';
    return;
  }

  concertsGrid.innerHTML = concerts.map(concert => `
    <div class="concert-card" onclick="openModal(${concert.id})">
      <img src="${concert.image}" alt="${concert.name}" class="concert-image">
      <div class="concert-content">
        <span class="concert-genre">${concert.genre}</span>
        <h3 class="concert-title">${concert.name}</h3>
        <p class="concert-artist">🎤 ${concert.artist}</p>
        <div class="geo-indicator">${concert.city}, ${concert.country}</div>
        <p class="concert-venue">📍 ${concert.venue}</p>
        <p class="concert-date">📅 ${formatDate(concert.date)} - ${concert.time}</p>

        <div class="concert-info-row">
          <span class="ticket-price">$${concert.ticketPrice.toFixed(2)}</span>
          <span class="tickets-available">${concert.ticketsAvailable - concert.ticketsSold} disponibles</span>
        </div>

        <div class="tickets-bar">
          <div class="tickets-fill" style="width: ${(concert.ticketsSold / concert.ticketsAvailable) * 100}%"></div>
        </div>

        <button class="buy-btn">Comprar Entradas</button>
      </div>
    </div>
  `).join('');
}

function formatDate(dateStr) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateStr).toLocaleDateString('es-ES', options);
}

function openModal(concertId) {
  const concert = allConcerts.find(c => c.id === concertId);
  if (!concert) return;

  const modalContent = document.querySelector('.modal-content');
  const ticketsRemaining = concert.ticketsAvailable - concert.ticketsSold;
  const occupancyPercent = ((concert.ticketsSold / concert.ticketsAvailable) * 100).toFixed(1);

  modalContent.innerHTML = `
    <button class="close-btn" onclick="closeModal()">&times;</button>

    <div class="modal-header">
      <h2 class="modal-title">${concert.name}</h2>
      <span class="concert-genre">${concert.genre}</span>
    </div>

    <div class="modal-section">
      <div class="modal-info">
        <div class="info-item">
          <div class="info-label">Artista</div>
          <div class="info-value">🎤 ${concert.artist}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Fecha</div>
          <div class="info-value">📅 ${formatDate(concert.date)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Hora</div>
          <div class="info-value">🕐 ${concert.time}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Lugar</div>
          <div class="info-value">📍 ${concert.venue}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Ciudad</div>
          <div class="info-value">🏙️ ${concert.city}</div>
        </div>
        <div class="info-item">
          <div class="info-label">País</div>
          <div class="info-value">🌍 ${concert.country}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Precio por Entrada</div>
          <div class="info-value" style="color: var(--primary-color); font-weight: bold;">$${concert.ticketPrice.toFixed(2)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Disponibilidad</div>
          <div class="info-value">${ticketsRemaining} de ${concert.ticketsAvailable}</div>
        </div>
      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Ocupación del Lugar</div>
      <div class="tickets-bar" style="height: 10px; margin-bottom: 0.5rem;">
        <div class="tickets-fill" style="width: ${occupancyPercent}%"></div>
      </div>
      <p style="font-size: 0.9rem; color: #666;">${concert.ticketsSold} entradas vendidas (${occupancyPercent}%)</p>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">📍 Ubicación Geográfica</div>
      <div class="map-container">
        <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3875.2453!2d${concert.longitude}!3d${concert.latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8f62e5c8d7c0c0c1:0x0!2z${encodeURIComponent(concert.venue)}!5e0!3m2!1ses!2ssv!4v1234567890" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Descripción</div>
      <p>${concert.description}</p>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Comprar Entradas</div>
      <div class="ticket-form" id="ticketForm">
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" placeholder="tu@email.com" required>
        </div>

        <div class="form-group">
          <label for="name">Nombre Completo</label>
          <input type="text" id="name" placeholder="Tu nombre" required>
        </div>

        <div class="form-group">
          <label for="quantity">Cantidad de Entradas</label>
          <div class="quantity-input">
            <button class="quantity-btn" onclick="decreaseQuantity()">-</button>
            <input type="number" id="quantity" value="1" min="1" max="${ticketsRemaining}" readonly>
            <button class="quantity-btn" onclick="increaseQuantity(${ticketsRemaining})">+</button>
          </div>
        </div>

        <div class="form-group">
          <label for="phone">Teléfono (opcional)</label>
          <input type="tel" id="phone" placeholder="Tu teléfono">
        </div>

        <div class="total-price">
          Total: $<span id="totalPrice">${concert.ticketPrice.toFixed(2)}</span>
        </div>

        <button class="submit-btn" onclick="buyTickets(${concertId})">Proceder al Pago</button>
      </div>
    </div>

    <p style="text-align: center; color: #999; font-size: 0.9rem; margin-top: 2rem;">
      💳 Sistema de pago seguro | 🔒 Tus datos están protegidos
    </p>
  `;

  modal.style.display = 'block';

  // Update total price on quantity change
  const quantityInput = document.getElementById('quantity');
  quantityInput.addEventListener('change', () => {
    updateTotalPrice(concert.ticketPrice);
  });
}

function decreaseQuantity() {
  const quantityInput = document.getElementById('quantity');
  if (quantityInput.value > 1) {
    quantityInput.value = parseInt(quantityInput.value) - 1;
    const concert = allConcerts.find(c => c.id === parseInt(document.querySelector('.modal-title').textContent.split(' ')[0]));
    updateTotalPrice(concert.ticketPrice);
  }
}

function increaseQuantity(max) {
  const quantityInput = document.getElementById('quantity');
  if (quantityInput.value < max) {
    quantityInput.value = parseInt(quantityInput.value) + 1;
    const concert = allConcerts.find(c => c.id === parseInt(document.querySelector('.modal-title').textContent.split(' ')[0]));
    updateTotalPrice(concert.ticketPrice);
  }
}

function updateTotalPrice(price) {
  const quantity = parseInt(document.getElementById('quantity').value);
  const total = (price * quantity).toFixed(2);
  document.getElementById('totalPrice').textContent = total;
}

function buyTickets(concertId) {
  const email = document.getElementById('email').value;
  const name = document.getElementById('name').value;
  const quantity = parseInt(document.getElementById('quantity').value);
  const phone = document.getElementById('phone').value;

  if (!email || !name || quantity < 1) {
    alert('Por favor completa todos los campos requeridos.');
    return;
  }

  const concert = allConcerts.find(c => c.id === concertId);
  const total = (concert.ticketPrice * quantity).toFixed(2);

  const confirmMessage = `
Confirmación de Compra:
- Concierto: ${concert.name}
- Cantidad: ${quantity} entrada${quantity > 1 ? 's' : ''}
- Total: $${total}
- Email: ${email}
- Nombre: ${name}
${phone ? `- Teléfono: ${phone}` : ''}

¿Deseas proceder con la compra?
  `;

  if (confirm(confirmMessage)) {
    // Simulate payment processing
    const ticketForm = document.getElementById('ticketForm');
    const successMsg = document.createElement('div');
    successMsg.className = 'success-message';
    successMsg.innerHTML = `
      ✓ ¡Compra exitosa!<br>
      Tus entradas han sido enviadas a ${email}<br>
      Referencia: #${Math.random().toString(36).substr(2, 9).toUpperCase()}<br>
      Guarda el email de confirmación para el acceso.
    `;
    ticketForm.replaceWith(successMsg);

    // Update concert sold tickets
    concert.ticketsSold += quantity;

    setTimeout(() => {
      closeModal();
      displayConcerts(allConcerts);
    }, 3000);
  }
}

function closeModal() {
  modal.style.display = 'none';
}

// Event Listeners
genreFilter.addEventListener('change', filterConcerts);
cityFilter.addEventListener('change', filterConcerts);
searchInput.addEventListener('input', filterConcerts);
closeBtn.addEventListener('click', closeModal);

window.addEventListener('click', (event) => {
  if (event.target === modal) {
    closeModal();
  }
});

// Load concerts on page load
document.addEventListener('DOMContentLoaded', loadConcerts);
