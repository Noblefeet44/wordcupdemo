import './style.css'
import {
  supabase, SUPABASE_URL, DEMO_EVENTS,
  fetchAllEventsAdmin,
  createEvent, updateEvent, deleteEvent,
  upsertCategories, deleteCategories
} from './supabase.js'

// ─── Admin password (change this!) ────────────────────────────────────────────
const ADMIN_PASSWORD = 'wc2026admin'
const SESSION_KEY    = 'wc_admin_auth'

// ─── Default category template ────────────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  { category_name: 'VIP',        price: 500, is_available: true },
  { category_name: 'Category 1', price: 250, is_available: true },
  { category_name: 'Category 2', price: 150, is_available: true },
  { category_name: 'Category 3', price: 100, is_available: true },
  { category_name: 'Category 4', price:  60, is_available: true },
]

// ─── State ────────────────────────────────────────────────────────────────────
let allEvents   = []
let editingId   = null
let isDemo      = false

// ─── DOM Refs ─────────────────────────────────────────────────────────────────
const passwordGate  = document.getElementById('password-gate')
const adminShell    = document.getElementById('admin-shell')
const pwInput       = document.getElementById('pw-input')
const pwSubmit      = document.getElementById('pw-submit')
const pwError       = document.getElementById('pw-error')
const logoutBtn     = document.getElementById('logout-btn')
const adminAlert    = document.getElementById('admin-alert')

// Events tab
const eventFormTitle = document.getElementById('event-form-title')
const resetFormBtn   = document.getElementById('reset-form-btn')
const saveEventBtn   = document.getElementById('save-event-btn')
const editEventId    = document.getElementById('edit-event-id')
const eventsTbody    = document.getElementById('events-tbody')
const eventCount     = document.getElementById('event-count')

// Category tab
const catEventSelect = document.getElementById('cat-event-select')
const catEditor      = document.getElementById('cat-editor')
const catPlaceholder = document.getElementById('cat-placeholder')
const catGrid        = document.getElementById('cat-grid')
const saveCatsBtn    = document.getElementById('save-cats-btn')

// Form fields
const fTeam1      = document.getElementById('f-team1')
const fTeam2      = document.getElementById('f-team2')
const fMatchType  = document.getElementById('f-match-type')
const fDate       = document.getElementById('f-date')
const fTime       = document.getElementById('f-time')
const fCountry    = document.getElementById('f-country')
const fCity       = document.getElementById('f-city')
const fStadium    = document.getElementById('f-stadium')

// ─── Auth ─────────────────────────────────────────────────────────────────────
function checkAuth() {
  if (sessionStorage.getItem(SESSION_KEY) === '1') {
    showAdmin()
  }
}

pwInput.addEventListener('keydown', e => { if (e.key === 'Enter') attemptLogin() })
pwSubmit.addEventListener('click', attemptLogin)

function attemptLogin() {
  if (pwInput.value === ADMIN_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, '1')
    pwError.textContent = ''
    showAdmin()
  } else {
    pwError.textContent = '❌ Incorrect password. Please try again.'
    pwInput.value = ''
    pwInput.focus()
  }
}

logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem(SESSION_KEY)
  location.reload()
})

function showAdmin() {
  passwordGate.style.display = 'none'
  adminShell.style.display   = 'block'
  initAdmin()
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(t => {
      t.classList.remove('active')
      t.setAttribute('aria-selected', 'false')
    })
    document.querySelectorAll('.admin-tab-panel').forEach(p => p.classList.remove('active'))

    tab.classList.add('active')
    tab.setAttribute('aria-selected', 'true')
    document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active')
  })
})

// ─── Init ─────────────────────────────────────────────────────────────────────
async function initAdmin() {
  isDemo = !SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL'

  if (isDemo) {
    allEvents = DEMO_EVENTS
    showAlert('info', '⚠️ Running in demo mode — changes won\'t persist. Set up Supabase in the "Supabase Setup" tab.')
  } else {
    await loadEvents()
  }

  renderEventsTable()
  populateCatSelect()
  setupFormEvents()
  setupCatTab()
}

// ─── Load events ──────────────────────────────────────────────────────────────
async function loadEvents() {
  const { data, error } = await fetchAllEventsAdmin()
  if (error) {
    showAlert('error', `Failed to load events: ${error.message}`)
    return
  }
  allEvents = data || []
}

// ─── Events Table ─────────────────────────────────────────────────────────────
function renderEventsTable() {
  eventCount.textContent = `${allEvents.length} event${allEvents.length !== 1 ? 's' : ''}`

  if (!allEvents.length) {
    eventsTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--c-text-muted);padding:32px">No events yet. Add your first event above.</td></tr>'
    return
  }

  eventsTbody.innerHTML = allEvents.map(ev => {
    const title    = `${ev.team1} vs ${ev.team2}`
    const dateStr  = ev.match_date ? new Date(ev.match_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
    const badgeStr = (ev.badges || []).map(b => ({
      hottest: '🔥', best_value: '💚', low_stock: '🚨'
    }[b] || b)).join(' ')
    const statusDot = ev.is_active
      ? '<span style="color:var(--c-green);font-weight:600;">● Active</span>'
      : '<span style="color:var(--c-text-faint);">● Hidden</span>'

    return `
      <tr data-id="${ev.id}">
        <td><strong>${title}</strong><br><span style="color:var(--c-text-muted);font-size:0.78rem">${ev.match_type || ''}</span></td>
        <td>${dateStr}</td>
        <td>${ev.stadium || '—'}<br><span style="color:var(--c-text-muted);font-size:0.78rem">${ev.city || ev.country || ''}</span></td>
        <td>${badgeStr || '—'}</td>
        <td>${statusDot}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-outline btn-sm edit-btn" data-id="${ev.id}" title="Edit event">✏️ Edit</button>
            <button class="btn btn-sm delete-btn" data-id="${ev.id}" title="Delete event" style="color:var(--c-red);border:1.5px solid rgba(255,61,87,0.3);border-radius:var(--radius-md)">🗑</button>
          </div>
        </td>
      </tr>
    `
  }).join('')

  eventsTbody.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => startEdit(btn.dataset.id))
  })
  eventsTbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => confirmDelete(btn.dataset.id))
  })
}

// ─── Form ─────────────────────────────────────────────────────────────────────
function setupFormEvents() {
  saveEventBtn.addEventListener('click', handleSaveEvent)
  resetFormBtn.addEventListener('click', resetForm)
}

function resetForm() {
  editingId = null
  editEventId.value = ''
  eventFormTitle.textContent = '➕ Add New Event'
  resetFormBtn.style.display = 'none'
  saveEventBtn.textContent = 'Save Event'

  fTeam1.value = fTeam2.value = fMatchType.value = fDate.value = ''
  fTime.value = fCity.value = fStadium.value = ''
  fCountry.value = 'US'
  document.querySelectorAll('input[name="badge"]').forEach(cb => cb.checked = false)
}

function startEdit(id) {
  const ev = allEvents.find(e => e.id === id)
  if (!ev) return

  editingId = id
  editEventId.value = id
  eventFormTitle.textContent = '✏️ Editing Event'
  resetFormBtn.style.display = 'inline-flex'
  saveEventBtn.textContent = 'Update Event'

  fTeam1.value     = ev.team1 || ''
  fTeam2.value     = ev.team2 || ''
  fMatchType.value = ev.match_type || ''
  fDate.value      = ev.match_date || ''
  fTime.value      = ev.match_time ? ev.match_time.substring(0, 5) : ''
  fCountry.value   = ev.country || 'US'
  fCity.value      = ev.city || ''
  fStadium.value   = ev.stadium || ''

  document.querySelectorAll('input[name="badge"]').forEach(cb => {
    cb.checked = (ev.badges || []).includes(cb.value)
  })

  // Scroll to form
  document.querySelector('.admin-card').scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function handleSaveEvent() {
  if (!fTeam1.value.trim() || !fTeam2.value.trim() || !fDate.value || !fStadium.value.trim()) {
    showAlert('error', 'Please fill in all required fields: Team 1, Team 2, Date, and Stadium.')
    return
  }

  const badges = Array.from(document.querySelectorAll('input[name="badge"]:checked')).map(cb => cb.value)
  const payload = {
    team1:      fTeam1.value.trim(),
    team2:      fTeam2.value.trim(),
    match_type: fMatchType.value.trim(),
    match_date: fDate.value,
    match_time: fTime.value || null,
    country:    fCountry.value,
    city:       fCity.value.trim(),
    stadium:    fStadium.value.trim(),
    badges,
    is_active:  true,
  }

  if (isDemo) {
    // Demo mode — just update local state
    if (editingId) {
      const idx = allEvents.findIndex(e => e.id === editingId)
      if (idx !== -1) allEvents[idx] = { ...allEvents[idx], ...payload }
      showAlert('success', '✅ Event updated (demo mode — not saved to database).')
    } else {
      const newEv = { ...payload, id: `demo-${Date.now()}`, categories: [...DEFAULT_CATEGORIES] }
      allEvents.push(newEv)
      showAlert('success', '✅ Event added (demo mode — not saved to database).')
    }
    renderEventsTable()
    populateCatSelect()
    resetForm()
    return
  }

  saveEventBtn.disabled = true
  saveEventBtn.textContent = 'Saving…'

  try {
    if (editingId) {
      const { error } = await updateEvent(editingId, payload)
      if (error) throw error
      // If creating a new event, also seed default categories
      showAlert('success', '✅ Event updated successfully.')
    } else {
      const { data, error } = await createEvent(payload)
      if (error) throw error
      // Seed default categories for new event
      if (data && data[0]) {
        const catPayload = DEFAULT_CATEGORIES.map(c => ({ ...c, event_id: data[0].id }))
        await upsertCategories(catPayload)
      }
      showAlert('success', '✅ Event created with default ticket categories.')
    }
    await loadEvents()
    renderEventsTable()
    populateCatSelect()
    resetForm()
  } catch (err) {
    showAlert('error', `❌ Error: ${err.message}`)
  } finally {
    saveEventBtn.disabled = false
    saveEventBtn.textContent = editingId ? 'Update Event' : 'Save Event'
  }
}

async function confirmDelete(id) {
  const ev = allEvents.find(e => e.id === id)
  if (!ev) return
  if (!confirm(`Delete "${ev.team1} vs ${ev.team2}"? This cannot be undone.`)) return

  if (isDemo) {
    allEvents = allEvents.filter(e => e.id !== id)
    renderEventsTable()
    populateCatSelect()
    showAlert('success', '✅ Event removed (demo mode).')
    return
  }

  const { error } = await deleteEvent(id)
  if (error) { showAlert('error', `❌ ${error.message}`); return }
  showAlert('success', '✅ Event deleted.')
  await loadEvents()
  renderEventsTable()
  populateCatSelect()
}

// ─── Category Tab ─────────────────────────────────────────────────────────────
function populateCatSelect() {
  catEventSelect.innerHTML = '<option value="">— Choose an event —</option>'
  allEvents.forEach(ev => {
    const opt = document.createElement('option')
    opt.value = ev.id
    opt.textContent = `${ev.team1} vs ${ev.team2} — ${ev.match_date || ''}`
    catEventSelect.appendChild(opt)
  })
}

function setupCatTab() {
  catEventSelect.addEventListener('change', () => {
    const id = catEventSelect.value
    if (!id) {
      catEditor.style.display    = 'none'
      catPlaceholder.style.display = 'block'
      return
    }
    const ev = allEvents.find(e => e.id === id)
    if (!ev) return
    renderCatEditor(ev)
    catEditor.style.display    = 'block'
    catPlaceholder.style.display = 'none'
  })

  saveCatsBtn.addEventListener('click', handleSaveCats)
}

function renderCatEditor(ev) {
  const cats = ev.categories || ev.ticket_categories || DEFAULT_CATEGORIES.map(c => ({ ...c }))
  catGrid.innerHTML = ''

  // Header row
  const header = document.createElement('div')
  header.className = 'cat-edit-row'
  header.style.background = 'var(--c-surface)'
  header.innerHTML = `
    <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--c-text-muted)">Category</div>
    <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--c-text-muted)">Price (USD)</div>
    <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--c-text-muted)">Available</div>
    <div></div>
  `
  catGrid.appendChild(header)

  const catNames = ['VIP', 'Category 1', 'Category 2', 'Category 3', 'Category 4']

  catNames.forEach(name => {
    const existing = cats.find(c => c.category_name === name) || { category_name: name, price: 0, is_available: true }
    const row = document.createElement('div')
    row.className = 'cat-edit-row'
    row.dataset.catName = name
    row.innerHTML = `
      <div class="cat-edit-label">${name === 'VIP' ? '👑 ' : ''}${name}</div>
      <div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="color:var(--c-text-muted);font-weight:600">$</span>
          <input class="form-input cat-price-input" type="number" min="0" step="1"
            value="${existing.price || 0}"
            style="max-width:120px"
            aria-label="${name} price"
          />
        </div>
      </div>
      <div>
        <label class="toggle-switch">
          <input type="checkbox" class="cat-avail-toggle" ${existing.is_available ? 'checked' : ''} aria-label="${name} availability" />
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div style="font-size:0.78rem;color:var(--c-text-muted)" id="avail-label-${name.replace(' ','-')}">
        ${existing.is_available ? 'On sale' : 'Sold out'}
      </div>
    `

    const toggle = row.querySelector('.cat-avail-toggle')
    const label  = row.querySelector(`[id^="avail-label-"]`)
    toggle.addEventListener('change', () => {
      label.textContent = toggle.checked ? 'On sale' : 'Sold out'
    })

    catGrid.appendChild(row)
  })
}

async function handleSaveCats() {
  const eventId = catEventSelect.value
  if (!eventId) return

  const ev = allEvents.find(e => e.id === eventId)
  if (!ev) return

  const rows = catGrid.querySelectorAll('[data-cat-name]')
  const cats = Array.from(rows).map(row => ({
    event_id:      eventId,
    category_name: row.dataset.catName,
    price:         parseFloat(row.querySelector('.cat-price-input').value) || 0,
    is_available:  row.querySelector('.cat-avail-toggle').checked,
  }))

  if (isDemo) {
    // Update in-memory
    const evIdx = allEvents.findIndex(e => e.id === eventId)
    if (evIdx !== -1) {
      allEvents[evIdx].categories = cats
      allEvents[evIdx].ticket_categories = cats
    }
    showAlert('success', '✅ Pricing updated (demo mode — not saved to database).')
    return
  }

  saveCatsBtn.disabled = true
  saveCatsBtn.textContent = 'Saving…'

  try {
    // Delete old and insert fresh
    await deleteCategories(eventId)
    const { error } = await upsertCategories(cats)
    if (error) throw error
    showAlert('success', '✅ Ticket categories and pricing saved.')
    await loadEvents()
  } catch (err) {
    showAlert('error', `❌ Error: ${err.message}`)
  } finally {
    saveCatsBtn.disabled = false
    saveCatsBtn.textContent = 'Save Pricing'
  }
}

// ─── Alert ────────────────────────────────────────────────────────────────────
function showAlert(type, message) {
  adminAlert.style.display = 'flex'
  adminAlert.className = `alert alert-${type === 'info' ? 'success' : type}`
  adminAlert.innerHTML = message
  if (type !== 'info') {
    setTimeout(() => { adminAlert.style.display = 'none' }, 5000)
  }
  adminAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
checkAuth()
