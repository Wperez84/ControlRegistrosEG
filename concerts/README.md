# 🎵 Conciertos en El Salvador - Sitio Web

Un sitio web completo para descubrir, buscar y comprar entradas para conciertos en El Salvador.

## ✨ Características

### 🎯 Funcionalidades Principales

1. **Listado de Conciertos**
   - Visualización de todos los conciertos disponibles en formato de tarjetas
   - Información detallada de cada evento
   - Imágenes representativas del género musical

2. **Filtrado Avanzado**
   - Filtro por género musical (Rock, Salsa, Hip Hop, Pop, etc.)
   - Filtro por ciudad (San Salvador, Santa Ana, etc.)
   - Búsqueda por nombre del artista o concierto
   - Filtros combinables para búsquedas precisas

3. **Geolocalización**
   - Mapa interactivo de Google Maps integrado
   - Ubicación exacta del evento
   - Coordenadas GPS de cada ubicación
   - Información del venue (lugar del concierto)

4. **Sistema de Ticketera**
   - Compra de entradas online
   - Selección de cantidad de entradas
   - Cálculo automático de total
   - Validación de datos del comprador
   - Confirmación de compra por email

5. **Información de Precios**
   - Precio por entrada claramente visible
   - Visualización de disponibilidad
   - Barra de ocupación del lugar
   - Total dinámico según cantidad

6. **Detalles del Evento**
   - Nombre del artista/banda
   - Fecha y hora
   - Lugar del evento
   - Descripción del evento
   - Ocupación actual del lugar
   - Entradas disponibles

## 📁 Estructura del Proyecto

```
concerts/
├── index.html          # Página principal
├── styles.css          # Estilos y diseño responsivo
├── app.js              # Lógica de la aplicación
├── data.json           # Base de datos de conciertos
├── README.md           # Este archivo
```

## 🛠️ Tecnologías Utilizadas

- **HTML5** - Estructura semántica
- **CSS3** - Diseño responsivo y gradientes modernos
- **JavaScript (Vanilla)** - Lógica sin dependencias externas
- **Google Maps Embed API** - Geolocalización interactiva
- **JSON** - Almacenamiento de datos

## 🚀 Cómo Usar

1. **Abrir el sitio**
   - Descarga todos los archivos en una carpeta
   - Abre `index.html` en tu navegador web
   - O copia los archivos a un servidor web

2. **Buscar Conciertos**
   - Usa el buscador para encontrar artistas específicos
   - Filtra por género musical con el dropdown
   - Selecciona una ciudad para ver eventos locales

3. **Comprar Entradas**
   - Haz click en cualquier concierto para ver detalles
   - Se abrirá un modal con información completa
   - Ve el mapa del lugar en tiempo real
   - Completa el formulario con tus datos
   - Selecciona la cantidad de entradas
   - Procede al pago

## 📊 Géneros Musicales Disponibles

- 🎸 Acústico
- 🎵 Rock
- 💃 Salsa
- 🎤 Reggaetón
- 🎼 Clásica
- 🎙️ Hip Hop
- 🎶 Pop
- 🎹 Blues
- 🎧 Electrónica
- 🪕 Folklórica

## 🌍 Ciudades Cubiertas

- San Salvador (Capital)
- Santa Ana
- San Miguel
- (Expandible a más ciudades)

## 📝 Estructura de Datos

Cada concierto contiene:
```json
{
  "id": 1,
  "name": "Nombre del Concierto",
  "artist": "Artista/Banda",
  "genre": "Género Musical",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "venue": "Nombre del Lugar",
  "city": "Ciudad",
  "country": "El Salvador",
  "latitude": 13.6929,
  "longitude": -89.2182,
  "description": "Descripción",
  "ticketPrice": 35.00,
  "ticketsAvailable": 500,
  "ticketsSold": 145
}
```

## 🎨 Diseño

- **Color Primario**: #FF6B35 (Naranja)
- **Color Secundario**: #004E89 (Azul Marino)
- **Color Acento**: #F77F00 (Oro)
- **Responsive**: Diseño mobile-first que se adapta a todos los dispositivos

## ✅ Características de la Ticketera

- ✓ Validación de email
- ✓ Nombre del comprador requerido
- ✓ Control de cantidad de entradas
- ✓ Verificación de disponibilidad
- ✓ Confirmación de compra
- ✓ Generación de número de referencia

## 🔒 Seguridad

- Validación de datos en el cliente
- Formato de email válido
- Campos requeridos obligatorios
- Límite de entradas según disponibilidad

## 📱 Responsividad

- Optimizado para móviles
- Tablets
- Computadoras de escritorio
- Pantallas grandes

## 🎯 Futuras Mejoras

- Integración con pasarela de pago real (Stripe, PayPal)
- Sistema de autenticación de usuarios
- Historial de compras
- Notificaciones de nuevos eventos
- Calificaciones y comentarios
- Sistema de reembolso
- Compra de entradas regaladas

## 📞 Contacto

Para consultas o sugerencias sobre eventos musicales, contacta directamente con los organizadores.

## 📄 Licencia

Este proyecto está disponible para uso personal y comercial.

---

**Disfruta la música en vivo de manera segura y cómoda** 🎵
