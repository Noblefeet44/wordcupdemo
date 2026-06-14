import './style.css'
import { fetchEvents } from './supabase.js'

// ─── Constants ────────────────────────────────────────────────────────────────
const WA_NUMBER = '2347045636039'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const COUNTRY_FLAGS = {
  US: '🇺🇸', USA: '🇺🇸', Canada: '🇨🇦', CA: '🇨🇦',
  Mexico: '🇲🇽', MX: '🇲🇽', UK: '🇬🇧', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Germany: '🇩🇪', France: '🇫🇷', Spain: '🇪🇸', Italy: '🇮🇹',
  Brazil: '🇧🇷', Argentina: '🇦🇷', Portugal: '🇵🇹',
  Morocco: '🇲🇦', Senegal: '🇸🇳', Japan: '🇯🇵',
  Croatia: '🇭🇷', Poland: '🇵🇱',
}

const BADGE_CONFIG = {
  hottest:    { label: '🔥 Hottest event',        cls: 'badge-hottest' },
  best_value: { label: '💚 Best value',            cls: 'badge-best_value' },
  low_stock:  { label: '🚨 Only 2% of tickets left', cls: 'badge-low_stock' },
}

// ─── State ────────────────────────────────────────────────────────────────────
let allEvents = []
let activeEvent = null
let quantities = {}

// ─── DOM Refs ─────────────────────────────────────────────────────────────────
const eventsList    = document.getElementById('events-list')
const loadingState  = document.getElementById('loading-state')
const noResults     = document.getElementById('no-results')
const demoBanner    = document.getElementById('demo-banner')
const searchInput   = document.getElementById('match-search')
const modalOverlay  = document.getElementById('modal-overlay')
const modalClose    = document.getElementById('modal-close')
const modalHeader   = document.getElementById('modal-header')
const modalBody     = document.getElementById('modal-body')
const totalPriceEl  = document.getElementById('total-price')
const checkoutBtn   = document.getElementById('checkout-btn')
const checkoutHint  = document.querySelector('.checkout-hint')
const menuToggle    = document.getElementById('menu-toggle')
const mobileNav     = document.getElementById('mobile-nav')
const siteHeader    = document.getElementById('site-header')

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  setupHeader()
  setupFAQ()
  setupMobileMenu()
  setupSearch()
  setupModal()

  try {
    const { data, error, isDemo } = await fetchEvents()
    if (error) throw error
    if (isDemo) demoBanner.style.display = 'flex'
    allEvents = data || []
    renderEvents(allEvents)
  } catch (err) {
    console.error('Failed to load events:', err)
    renderError()
  }
}

// ─── Render Events ────────────────────────────────────────────────────────────
function renderEvents(events) {
  loadingState.remove()

  if (!events.length) {
    noResults.style.display = 'block'
    return
  }

  noResults.style.display = 'none'

  // Remove old cards
  eventsList.querySelectorAll('.event-card').forEach(c => c.remove())

  events.forEach(ev => {
    const card = buildEventCard(ev)
    eventsList.appendChild(card)
  })
}

function buildEventCard(ev) {
  const date  = new Date(ev.match_date + 'T00:00:00')
  const month = MONTHS[date.getMonth()]
  const day   = date.getDate()
  const wday  = DAYS[date.getDay()]

  const flag   = COUNTRY_FLAGS[ev.country] || '🌍'
  const title  = `${ev.team1} vs ${ev.team2} — ${ev.match_type || ''}`
  const time12 = formatTime(ev.match_time)
  const cats   = ev.categories || ev.ticket_categories || []
  const minPrice = cats.filter(c => c.is_available).map(c => c.price).sort((a,b)=>a-b)[0]

  const badgesHtml = (ev.badges || []).map(b => {
    const cfg = BADGE_CONFIG[b]
    return cfg ? `<span class="badge ${cfg.cls}">${cfg.label}</span>` : ''
  }).join('')

  const card = document.createElement('article')
  card.className = 'event-card'
  card.setAttribute('role', 'listitem')
  card.setAttribute('tabindex', '0')
  card.setAttribute('aria-label', `${title} — ${month} ${day}`)
  card.dataset.eventId = ev.id
  card.innerHTML = `
    <div class="event-date" aria-hidden="true">
      <span class="month">${month}</span>
      <span class="day">${day}</span>
      <span class="weekday">${wday}</span>
    </div>
    <div class="event-details">
      <div class="event-title">${title}</div>
      <div class="event-meta">
        <span>${time12}</span>
        <span class="dot">·</span>
        <span class="event-flag">${flag}</span>
        <span>${ev.city || ev.country}</span>
        <span class="dot">·</span>
        <span>${ev.stadium}</span>
        ${minPrice ? `<span class="dot">·</span><span style="color:var(--c-green);font-weight:600;">From $${minPrice}</span>` : ''}
      </div>
      ${badgesHtml ? `<div class="event-badges">${badgesHtml}</div>` : ''}
    </div>
    <div class="event-cta">
      <button class="btn-see-tickets" data-event-id="${ev.id}" aria-label="See tickets for ${title}">
        See tickets
      </button>
    </div>
  `

  const seeBtn = card.querySelector('.btn-see-tickets')
  seeBtn.addEventListener('click', e => { e.stopPropagation(); openModal(ev) })
  card.addEventListener('click', () => openModal(ev))
  card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(ev) } })

  return card
}

function renderError() {
  loadingState.innerHTML = `
    <span style="font-size:2rem">⚠️</span>
    <p>Could not load matches. Please try again later.</p>
  `
}

// ─── Time helper ──────────────────────────────────────────────────────────────
function formatTime(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12  = h % 12 || 12
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal(ev) {
  activeEvent = ev
  quantities  = {}

  const date  = new Date(ev.match_date + 'T00:00:00')
  const dateStr = `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
  const flag  = COUNTRY_FLAGS[ev.country] || '🌍'

  modalHeader.innerHTML = `
    <div class="modal-match-title">${ev.team1} vs ${ev.team2}</div>
    <div class="modal-match-meta">
      <span>${ev.match_type || ''}</span>
      <span class="dot">·</span>
      <span>${dateStr}</span>
      <span class="dot">·</span>
      <span>${flag} ${ev.city || ev.country}</span>
      <span class="dot">·</span>
      <span>${ev.stadium}</span>
    </div>
  `

  const cats = ev.categories || ev.ticket_categories || []
  modalBody.innerHTML = ''

  if (!cats.length) {
    modalBody.innerHTML = '<p class="text-muted" style="text-align:center;padding:32px 0">No ticket categories available yet.</p>'
  } else {
    cats.forEach((cat, idx) => {
      quantities[idx] = 0
      const row = buildCategoryRow(cat, idx)
      modalBody.appendChild(row)
    })
  }

  updateTotal()
  modalOverlay.setAttribute('aria-hidden', 'false')
  modalOverlay.classList.add('open')
  document.body.style.overflow = 'hidden'
  modalClose.focus()
}

function closeModal() {
  modalOverlay.classList.remove('open')
  modalOverlay.setAttribute('aria-hidden', 'true')
  document.body.style.overflow = ''
  activeEvent = null
  quantities  = {}
}

function buildCategoryRow(cat, idx) {
  const isVIP    = cat.category_name === 'VIP'
  const avail    = cat.is_available
  const row      = document.createElement('div')
  row.className  = `category-row${avail ? '' : ' unavailable'}`
  row.dataset.idx = idx

  row.innerHTML = `
    <div class="cat-info">
      <div class="cat-name">
        ${isVIP ? '<span class="cat-vip-crown">👑</span>' : ''}
        ${cat.category_name}
      </div>
      <div class="cat-price">$${Number(cat.price).toLocaleString()}</div>
      <div class="cat-avail ${avail ? '' : 'sold-out'}">
        ${avail ? 'Available' : 'Sold out'}
      </div>
    </div>
    ${avail ? `
    <div class="qty-selector" aria-label="Quantity selector for ${cat.category_name}">
      <button class="qty-btn qty-dec" aria-label="Decrease quantity" data-idx="${idx}">−</button>
      <span class="qty-val" id="qty-val-${idx}" aria-live="polite">0</span>
      <button class="qty-btn qty-inc" aria-label="Increase quantity" data-idx="${idx}">+</button>
    </div>
    ` : '<span class="text-red" style="font-size:0.8rem;font-weight:600;">Sold Out</span>'}
  `

  if (avail) {
    row.querySelector('.qty-dec').addEventListener('click', e => { e.stopPropagation(); changeQty(idx, -1, cat.price) })
    row.querySelector('.qty-inc').addEventListener('click', e => { e.stopPropagation(); changeQty(idx, +1, cat.price) })
  }

  return row
}

function changeQty(idx, delta, price) {
  quantities[idx] = Math.max(0, (quantities[idx] || 0) + delta)
  const el = document.getElementById(`qty-val-${idx}`)
  if (el) {
    el.textContent = quantities[idx]
    el.closest('.category-row').style.borderColor =
      quantities[idx] > 0 ? 'var(--c-green)' : ''
  }
  updateTotal()
}

function updateTotal() {
  const cats = activeEvent ? (activeEvent.categories || activeEvent.ticket_categories || []) : []
  let total  = 0
  let count  = 0

  cats.forEach((cat, idx) => {
    const q = quantities[idx] || 0
    total += q * cat.price
    count += q
  })

  totalPriceEl.textContent = `$${total.toLocaleString()}`
  checkoutBtn.disabled = count === 0

  if (count > 0) {
    checkoutHint.textContent = `${count} ticket${count > 1 ? 's' : ''} selected — click to book via WhatsApp`
    checkoutHint.style.color = 'var(--c-green)'
  } else {
    checkoutHint.textContent = 'Select at least one ticket to continue'
    checkoutHint.style.color = ''
  }
}

// ─── WhatsApp Checkout ────────────────────────────────────────────────────────
function buildWhatsAppMessage() {
  if (!activeEvent) return ''
  const ev   = activeEvent
  const cats = ev.categories || ev.ticket_categories || []

  const date    = new Date(ev.match_date + 'T00:00:00')
  const dateStr = `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
  const time12  = formatTime(ev.match_time)
  const matchName = `${ev.team1} vs ${ev.team2} — ${ev.match_type || ''}`

  let ticketLines = ''
  let total = 0

  cats.forEach((cat, idx) => {
    const q = quantities[idx] || 0
    if (q > 0) {
      const subtotal = q * cat.price
      total += subtotal
      ticketLines += `\n  • ${cat.category_name} × ${q} = $${subtotal.toLocaleString()}`
    }
  })

  const msg = `Hello! I want to book tickets for the following match:

🏟️ *${matchName}*
📅 Date: ${dateStr}
⏰ Time: ${time12}
📍 Venue: ${ev.stadium}, ${ev.city || ev.country}

🎟️ Tickets:${ticketLines}

💰 *Total Price: $${total.toLocaleString()}*

Please send me payment details to complete my booking. Thank you!`

  return msg
}

checkoutBtn.addEventListener('click', () => {
  const msg = buildWhatsAppMessage()
  const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`
  window.open(url, '_blank', 'noopener,noreferrer')
})

// ─── Search ───────────────────────────────────────────────────────────────────
function setupSearch() {
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase()
    if (!q) { renderEvents(allEvents); return }
    const filtered = allEvents.filter(ev =>
      `${ev.team1} ${ev.team2} ${ev.stadium} ${ev.city} ${ev.match_type}`.toLowerCase().includes(q)
    )
    renderEvents(filtered)
    if (!filtered.length) noResults.style.display = 'block'
  })
}

// ─── Modal Events ─────────────────────────────────────────────────────────────
function setupModal() {
  modalClose.addEventListener('click', closeModal)
  modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal() })
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal() })
}

// ─── Header scroll ────────────────────────────────────────────────────────────
function setupHeader() {
  window.addEventListener('scroll', () => {
    siteHeader.classList.toggle('scrolled', window.scrollY > 20)
  }, { passive: true })
}

// ─── Mobile Menu ──────────────────────────────────────────────────────────────
function setupMobileMenu() {
  menuToggle.addEventListener('click', () => {
    const isOpen = mobileNav.classList.toggle('open')
    menuToggle.classList.toggle('open', isOpen)
    menuToggle.setAttribute('aria-expanded', isOpen)
    mobileNav.setAttribute('aria-hidden', !isOpen)
  })

  mobileNav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      mobileNav.classList.remove('open')
      menuToggle.classList.remove('open')
      menuToggle.setAttribute('aria-expanded', 'false')
      mobileNav.setAttribute('aria-hidden', 'true')
    })
  })
}

// ─── FAQ Accordion ────────────────────────────────────────────────────────────
function setupFAQ() {
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const isOpen = btn.getAttribute('aria-expanded') === 'true'
      // Close all
      document.querySelectorAll('.faq-question').forEach(b => {
        b.setAttribute('aria-expanded', 'false')
        b.nextElementSibling.classList.remove('open')
      })
      // Open clicked (toggle)
      if (!isOpen) {
        btn.setAttribute('aria-expanded', 'true')
        btn.nextElementSibling.classList.add('open')
      }
    })
  })
}

// ─── Kick off ─────────────────────────────────────────────────────────────────
init()
