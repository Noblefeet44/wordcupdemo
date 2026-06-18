// Supabase client initialization
// Replace these with your actual Supabase project credentials
import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
export const SUPABASE_SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY || ''

// Only create client when real credentials are present (avoids error in demo mode)
const isConfigured = SUPABASE_URL && SUPABASE_URL.startsWith('http')

// Public client — used for read-only queries on the frontend
export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

// Admin client — uses service role key to bypass RLS for admin writes
// Falls back to anon client if no service key is set (Supabase anon key must
// have INSERT/UPDATE/DELETE policies enabled in that case)
const adminKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY
export const supabaseAdmin = isConfigured
  ? createClient(SUPABASE_URL, adminKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : null

// ─── DEMO DATA (used as fallback when Supabase is not yet configured) ─────────
export const DEMO_EVENTS = [
  {
    id: 'demo-1',
    team1: 'Mexico',
    team2: 'Poland',
    match_type: 'World Cup - Group B',
    match_date: '2026-06-16',
    match_time: '15:00',
    country: 'US',
    stadium: 'SoFi Stadium',
    city: 'Los Angeles, CA',
    badges: ['hottest', 'best_value'],
    is_active: true,
    categories: [
      { category_name: 'VIP', price: 850, is_available: true },
      { category_name: 'Category 1', price: 420, is_available: true },
      { category_name: 'Category 2', price: 280, is_available: true },
      { category_name: 'Category 3', price: 160, is_available: true },
      { category_name: 'Category 4', price: 90, is_available: false },
    ],
  },
  {
    id: 'demo-2',
    team1: 'Brazil',
    team2: 'Croatia',
    match_type: 'World Cup - Group G',
    match_date: '2026-06-18',
    match_time: '21:00',
    country: 'US',
    stadium: 'MetLife Stadium',
    city: 'New York, NJ',
    badges: ['low_stock'],
    is_active: true,
    categories: [
      { category_name: 'VIP', price: 1200, is_available: true },
      { category_name: 'Category 1', price: 580, is_available: true },
      { category_name: 'Category 2', price: 340, is_available: false },
      { category_name: 'Category 3', price: 190, is_available: true },
      { category_name: 'Category 4', price: 110, is_available: true },
    ],
  },
  {
    id: 'demo-3',
    team1: 'England',
    team2: 'Senegal',
    match_type: 'World Cup - Group C',
    match_date: '2026-06-20',
    match_time: '18:00',
    country: 'Canada',
    stadium: 'BC Place',
    city: 'Vancouver, BC',
    badges: ['hottest'],
    is_active: true,
    categories: [
      { category_name: 'VIP', price: 950, is_available: true },
      { category_name: 'Category 1', price: 460, is_available: true },
      { category_name: 'Category 2', price: 295, is_available: true },
      { category_name: 'Category 3', price: 170, is_available: true },
      { category_name: 'Category 4', price: 95, is_available: true },
    ],
  },
  {
    id: 'demo-4',
    team1: 'France',
    team2: 'Argentina',
    match_type: 'World Cup - Final',
    match_date: '2026-07-19',
    match_time: '19:00',
    country: 'US',
    stadium: 'MetLife Stadium',
    city: 'New York, NJ',
    badges: ['hottest', 'low_stock'],
    is_active: true,
    categories: [
      { category_name: 'VIP', price: 3500, is_available: true },
      { category_name: 'Category 1', price: 1800, is_available: true },
      { category_name: 'Category 2', price: 980, is_available: false },
      { category_name: 'Category 3', price: 520, is_available: true },
      { category_name: 'Category 4', price: 290, is_available: false },
    ],
  },
  {
    id: 'demo-5',
    team1: 'Germany',
    team2: 'Japan',
    match_type: 'World Cup - Group E',
    match_date: '2026-06-22',
    match_time: '12:00',
    country: 'US',
    stadium: 'AT&T Stadium',
    city: 'Arlington, TX',
    badges: ['best_value'],
    is_active: true,
    categories: [
      { category_name: 'VIP', price: 780, is_available: true },
      { category_name: 'Category 1', price: 380, is_available: true },
      { category_name: 'Category 2', price: 240, is_available: true },
      { category_name: 'Category 3', price: 140, is_available: true },
      { category_name: 'Category 4', price: 80, is_available: true },
    ],
  },
  {
    id: 'demo-6',
    team1: 'Spain',
    team2: 'Morocco',
    match_type: 'World Cup - Round of 16',
    match_date: '2026-07-04',
    match_time: '20:00',
    country: 'Mexico',
    stadium: 'Estadio Azteca',
    city: 'Mexico City',
    badges: ['hottest', 'low_stock'],
    is_active: true,
    categories: [
      { category_name: 'VIP', price: 1100, is_available: true },
      { category_name: 'Category 1', price: 530, is_available: true },
      { category_name: 'Category 2', price: 310, is_available: true },
      { category_name: 'Category 3', price: 180, is_available: false },
      { category_name: 'Category 4', price: 100, is_available: true },
    ],
  },
]

// ─── Supabase DB helpers ───────────────────────────────────────────────────────
export async function fetchEvents() {
  if (!isConfigured) {
    return { data: DEMO_EVENTS, error: null, isDemo: true }
  }
  const { data, error } = await supabase
    .from('events')
    .select('*, ticket_categories(*)')
    .eq('is_active', true)
    .order('match_date', { ascending: true })
  return { data, error, isDemo: false }
}

export async function fetchAllEventsAdmin() {
  if (!isConfigured) return { data: [], error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase
    .from('events')
    .select('*, ticket_categories(*)')
    .order('match_date', { ascending: true })
  return { data, error }
}

export async function createEvent(eventData) {
  if (!isConfigured) return { data: null, error: { message: 'Supabase not configured' } }
  const { data, error } = await supabaseAdmin.from('events').insert([eventData]).select()
  return { data, error }
}

export async function updateEvent(id, eventData) {
  if (!isConfigured) return { data: null, error: { message: 'Supabase not configured' } }
  const { data, error } = await supabaseAdmin.from('events').update(eventData).eq('id', id).select()
  return { data, error }
}

export async function deleteEvent(id) {
  if (!isConfigured) return { error: { message: 'Supabase not configured' } }
  const { error } = await supabaseAdmin.from('events').delete().eq('id', id)
  return { error }
}

export async function upsertCategories(categories) {
  if (!isConfigured) return { data: null, error: { message: 'Supabase not configured' } }
  const { data, error } = await supabaseAdmin.from('ticket_categories').upsert(categories).select()
  return { data, error }
}

export async function deleteCategories(eventId) {
  if (!isConfigured) return { error: null }
  const { error } = await supabaseAdmin.from('ticket_categories').delete().eq('event_id', eventId)
  return { error }
}
