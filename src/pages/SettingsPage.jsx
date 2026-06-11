import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import SharedKeysPanel from '../components/SharedKeysPanel'

export default function SettingsPage() {
  const { profile, fetchChildren } = useAuth()
  const [activeTab, setActiveTab] = useState('account')
  const [parentChildren, setParentChildren] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [addingChild, setAddingChild] = useState(false)
  const [childKey, setChildKey] = useState('')
  const isStudent = profile?.role === 'student'
  const isParent = profile?.role === 'parent'

  const loadParentData = useCallback(async () => {
    if (!isParent || !profile?.id) return
    setLoading(true)
    const { data: childrenData } = await supabase.from('parent_student_connections').select('*, student:student_id(id, full_name, grade_id, grades(name))').eq('parent_id', profile.id).order('created_at')
    if (childrenData) setParentChildren(childrenData.map(c => c.student))
    setLoading(false)
  }, [isParent, profile?.id])

  useEffect(() => {
    if (isParent) loadParentData()
    else setLoading(false)
  }, [isParent, loadParentData])

  async function handleAddChild(e) {
    e.preventDefault(); setError(''); setAddingChild(true)
    const { data: keyData, error: keyError } = await supabase.from('shared_keys').select('*, student:student_id(id, full_name, grade_id, grades(name))').eq('key', childKey).gt('expires_at', new Date().toISOString()).is('used_by', null).single()
    if (keyError || !keyData) { setError('Invalid or expired shared key.'); setAddingChild(false); return }
    const { error: connError } = await supabase.from('parent_student_connections').insert({ parent_id: profile.id, student_id: keyData.student_id })
    if (connError) { setError('Failed to add child: ' + connError.message); setAddingChild(false); return }
    await supabase.from('shared_keys').update({ used_by: profile.id, used_at: new Date().toISOString() }).eq('id', keyData.id)
    setSuccess('Child added successfully!'); setChildKey(''); setTimeout(() => setSuccess(''), 3000); loadParentData(); fetchChildren(profile.id); setAddingChild(false)
  }

  async function handleRemoveChild(studentId) {
    if (!confirm('Remove this child from your account?')) return
    const { error } = await supabase.from('parent_student_connections').delete().eq('parent_id', profile.id).eq('student_id', studentId)
    if (error) setError('Failed to remove child: ' + error.message)
    else { setSuccess('Child removed.'); setTimeout(() => setSuccess(''), 3000); loadParentData(); fetchChildren(profile.id) }
  }

  return <div><h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>Settings</h2><p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>Manage your account settings and preferences.</p>{error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}{success && <div style={{ background: 'var(--green-light)', color: 'var(--green-text)', borderRadius: 8, padding: '8px 14px', fontSize: 13, marginBottom: 16 }}>{success}</div>}
    <div style={styles.tabBar}><button style={{ ...styles.tab, borderBottomColor: activeTab === 'account' ? 'var(--blue)' : 'transparent', color: activeTab === 'account' ? 'var(--blue)' : 'var(--text2)' }} onClick={() => setActiveTab('account')}>Account</button>{isParent && <button style={{ ...styles.tab, borderBottomColor: activeTab === 'children' ? 'var(--blue)' : 'transparent', color: activeTab === 'children' ? 'var(--blue)' : 'var(--text2)' }} onClick={() => setActiveTab('children')}>My Children</button>}{isStudent && <button style={{ ...styles.tab, borderBottomColor: activeTab === 'keys' ? 'var(--blue)' : 'transparent', color: activeTab === 'keys' ? 'var(--blue)' : 'var(--text2)' }} onClick={() => setActiveTab('keys')}>Parent Invitation Keys</button>}</div>
    {activeTab === 'account' && <div className="card" style={{ marginTop: 16 }}><h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Account Information</h3><div style={styles.infoRow}><span style={styles.label}>Full Name</span><span style={styles.value}>{profile?.full_name}</span></div><div style={styles.infoRow}><span style={styles.label}>Role</span><span style={styles.value}>{profile?.role?.charAt(0).toUpperCase() + profile?.role?.slice(1)}</span></div>{profile?.grades && <div style={styles.infoRow}><span style={styles.label}>Grade</span><span style={styles.value}>{profile.grades.name}</span></div>}</div>}
    {activeTab === 'children' && isParent && <div style={{ marginTop: 16 }}><div className="card" style={{ marginBottom: 16 }}><h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Add a child</h3><p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>Ask your child to generate a shared key in their account settings, then paste it here.</p><form onSubmit={handleAddChild} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><input type="text" placeholder="Paste shared key here (e.g., ABC123XY)" value={childKey} onChange={e => setChildKey(e.target.value.toUpperCase())} required style={styles.input} /><button type="submit" disabled={addingChild} className="btn btn-primary" style={{ minWidth: 120, justifyContent: 'center' }}>{addingChild ? <><span className="spinner" /> Adding…</> : <>Add child</>}</button></form></div><div className="card"><h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Your children</h3>{loading ? <div style={{ textAlign: 'center', padding: 20 }}><div className="spinner" /></div> : parentChildren.length === 0 ? <div className="empty-state" style={{ padding: '20px 0', textAlign: 'center' }}><p style={{ color: 'var(--text2)', fontSize: 13 }}>No children linked yet. Add one using a shared key above!</p></div> : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{parentChildren.map(child => <div key={child.id} style={styles.childCard}><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{child.full_name}</div><div style={{ fontSize: 12, color: 'var(--text2)' }}>{child.grades?.name}</div></div><button onClick={() => handleRemoveChild(child.id)} style={styles.removeButton}>Remove</button></div>)}</div>}</div></div>}
    {activeTab === 'keys' && isStudent && <div style={{ marginTop: 16 }}><SharedKeysPanel /></div>}
  </div>
}

const styles = { tabBar: { display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 16 }, tab: { padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 500, borderBottom: '2px solid transparent', transition: 'all 0.2s' }, infoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }, label: { color: 'var(--text2)', fontWeight: 500 }, value: { color: 'var(--text)', fontWeight: 500 }, input: { flex: 1, minWidth: 150, padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border2)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }, childCard: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, removeButton: { padding: '6px 12px', borderRadius: 6, border: '1px solid var(--red-light)', background: 'var(--red-light)', color: 'var(--red-text)', cursor: 'pointer', fontSize: 12, fontWeight: 500 } }
