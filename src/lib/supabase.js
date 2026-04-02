// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ulswzqzffxrpaqsxkujg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsc3d6cXpmZnhycGFxc3hrdWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNTk1MDQsImV4cCI6MjA5MDczNTUwNH0.5PI6W_qsFxi1uPPFJxU1aJo_Yn8Dd3iochjK4fw6N_U'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Auth Helpers ─────────────────────────────────────────────
export const auth = {
  async signUp(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    })
    return { data, error }
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  },

  async signOut() {
    return await supabase.auth.signOut()
  },

  async getUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// ── Tenant Helpers ────────────────────────────────────────────
export const tenants = {
  async getMyTenants() {
    const { data, error } = await supabase
      .from('tenant_members')
      .select(`
        role,
        tenant:tenants(*)
      `)
      .order('joined_at', { ascending: false })
    if (error) throw error
    return data.map(m => ({ ...m.tenant, myRole: m.role }))
  },

  async create(name, companyName, vorgangId, model, startDate) {
    const user = await auth.getUser()

    // Mandant anlegen
    const { data: tenant, error } = await supabase
      .from('tenants')
      .insert({ name, company_name: companyName, vorgang_id: vorgangId, model, start_date: startDate })
      .select()
      .single()
    if (error) throw error

    // Ersteller als Owner eintragen
    await supabase.from('tenant_members').insert({
      tenant_id: tenant.id,
      user_id: user.id,
      role: 'owner'
    })

    // Standard-Phasen anlegen
    await supabase.rpc('create_default_phases', { p_tenant_id: tenant.id })

    return tenant
  },

  async update(tenantId, updates) {
    const { data, error } = await supabase
      .from('tenants')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', tenantId)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

// ── Phase Helpers ─────────────────────────────────────────────
export const phases = {
  async getForTenant(tenantId) {
    const { data, error } = await supabase
      .from('phases')
      .select(`*, steps:phase_steps(*)`)
      .eq('tenant_id', tenantId)
      .order('sort_order')
    if (error) throw error
    return data.map(p => ({
      ...p,
      steps: (p.steps || []).sort((a, b) => a.sort_order - b.sort_order)
    }))
  },

  async toggleStep(stepId, done) {
    const user = await auth.getUser()
    const { error } = await supabase
      .from('phase_steps')
      .update({
        done,
        done_at: done ? new Date().toISOString() : null,
        done_by: done ? user.id : null
      })
      .eq('id', stepId)
    if (error) throw error
  },

  async updateStatus(phaseId, status) {
    const { error } = await supabase
      .from('phases')
      .update({ status })
      .eq('id', phaseId)
    if (error) throw error
  }
}

// ── Module Helpers ────────────────────────────────────────────
export const modules = {
  async getForTenant(tenantId) {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .order('sort_order')
    if (error) throw error
    return data
  },

  async create(tenantId, type, title, icon) {
    const { data, error } = await supabase
      .from('modules')
      .insert({ tenant_id: tenantId, module_type: type, title, icon, data: {} })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateData(moduleId, newData) {
    const { error } = await supabase
      .from('modules')
      .update({ data: newData, updated_at: new Date().toISOString() })
      .eq('id', moduleId)
    if (error) throw error
  },

  async remove(moduleId) {
    const { error } = await supabase
      .from('modules')
      .update({ active: false })
      .eq('id', moduleId)
    if (error) throw error
  }
}

// ── Document Helpers ──────────────────────────────────────────
export const documents = {
  async getForTenant(tenantId) {
    const { data, error } = await supabase
      .from('documents')
      .select('*, uploader:profiles(full_name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async create(tenantId, title, phaseLabel, docType) {
    const user = await auth.getUser()
    const { data, error } = await supabase
      .from('documents')
      .insert({ tenant_id: tenantId, title, phase_label: phaseLabel, doc_type: docType, uploaded_by: user.id })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async remove(docId) {
    const { error } = await supabase.from('documents').delete().eq('id', docId)
    if (error) throw error
  }
}

// ── Notes Helpers ─────────────────────────────────────────────
export const notes = {
  async getForTenant(tenantId) {
    const { data, error } = await supabase
      .from('notes')
      .select('*, author:profiles(full_name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async create(tenantId, text) {
    const user = await auth.getUser()
    const profile = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    const { data, error } = await supabase
      .from('notes')
      .insert({ tenant_id: tenantId, text, author_id: user.id, author_name: profile.data?.full_name || user.email })
      .select()
      .single()
    if (error) throw error
    return data
  }
}

// ── Member & Invitation Helpers ───────────────────────────────
export const members = {
  async getForTenant(tenantId) {
    const { data, error } = await supabase
      .from('tenant_members')
      .select('*, profile:profiles(full_name, email)')
      .eq('tenant_id', tenantId)
    if (error) throw error
    return data
  },

  async invite(tenantId, email, role = 'member') {
    const user = await auth.getUser()
    const { data, error } = await supabase
      .from('invitations')
      .insert({ tenant_id: tenantId, email, role, invited_by: user.id })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async acceptInvitation(token) {
    const user = await auth.getUser()

    // Einladung laden
    const { data: inv, error: invErr } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (invErr || !inv) throw new Error('Einladung ungültig oder abgelaufen')

    // Mitglied hinzufügen
    await supabase.from('tenant_members').insert({
      tenant_id: inv.tenant_id,
      user_id: user.id,
      role: inv.role,
      invited_by: inv.invited_by
    })

    // Einladung als akzeptiert markieren
    await supabase.from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', inv.id)

    return inv.tenant_id
  },

  async getInvitations(tenantId) {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async removeMember(tenantId, userId) {
    const { error } = await supabase
      .from('tenant_members')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
    if (error) throw error
  },

  async updateRole(tenantId, userId, role) {
    const { error } = await supabase
      .from('tenant_members')
      .update({ role })
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
    if (error) throw error
  }
}
