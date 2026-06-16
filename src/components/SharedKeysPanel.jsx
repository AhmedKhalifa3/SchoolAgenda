import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function SharedKeysPanel() {
  const { profile, generateSharedKey } = useAuth()
  const [sharedKeys, setSharedKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [generatingKey, setGeneratingKey] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isStudent = profile?.role === 'student'

  const fetchSharedKeys = useCallback(async () => {
    if (!isStudent || !profile?.id) return
    
    setLoading(true)
    const { data, error: err } = await supabase
      .from('shared_keys')
      .select('*')
      .eq('student_id', profile.id)
      .order('created_at', { ascending: false })

    if (!err && data) {
      setSharedKeys(data)
    }
    setLoading(false)
  }, [isStudent, profile?.id])

  useEffect(() => {
    fetchSharedKeys()
  }, [fetchSharedKeys])

  async function handleGenerateKey() {
    setError('')
    setGeneratingKey(true)
    const { key, error: err } = await generateSharedKey(profile.id, 30)
    
    if (err || !key) {
      setError(err?.message || 'Failed to generate key')
    } else {
      setSuccess(`Key generated! It expires in 30 minutes.`)
      setTimeout(() => setSuccess(''), 3000)
      fetchSharedKeys()
    }
    setGeneratingKey(false)
  }

  function isKeyExpired(expiresAt) {
    return new Date(expiresAt) < new Date()
  }

  function isKeyUsed(usedBy) {
    return !!usedBy
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleString()
  }

  function getTimeRemaining(expiresAt) {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diffMs = expiry - now
    
    if (diffMs <= 0) return 'Expired'
    
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Expires in seconds'
    if (diffMins === 1) return 'Expires in 1 minute'
    return `Expires in ${diffMins} minutes`
  }

  if (!isStudent) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <p style={{ color: 'var(--text2)' }}>Only students can manage shared keys.</p>
      </div>
    )
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>Shared keys for parents</h2>
      <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
        Generate temporary keys for parents to use when signing up. Keys expire after 30 minutes.
      </p>

      {error && <div className="error-msg">{error}</div>}
      {success && <div style={{ background: 'var(--green-light)', color: 'var(--green-text)', borderRadius: 8, padding: '8px 14px', fontSize: 13, marginBottom: 12 }}>{success}</div>}

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Generate new key</h3>
            <p style={{ fontSize: 12, color: 'var(--text2)' }}>Creates a new temporary key valid for 30 minutes</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleGenerateKey}
            disabled={generatingKey}
            style={{ minWidth: 140, justifyContent: 'center' }}
          >
            {generatingKey ? (
              <><span className="spinner" /> Generating…</>
            ) : (
              <><i className="ti ti-plus" aria-hidden="true" /> New key</>
            )}
          </button>
        </div>

        {sharedKeys.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px 0', textAlign: 'center' }}>
            <p style={{ color: 'var(--text2)', fontSize: 13 }}>No shared keys generated yet. Create one to invite a parent!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sharedKeys.map(sk => {
              const expired = isKeyExpired(sk.expires_at)
              const used = isKeyUsed(sk.used_by)
              
              return (
                <div key={sk.id} style={styles.keyCard}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <code style={styles.keyCode}>{sk.key}</code>
                      <span style={{
                        fontSize: 11,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: used ? 'var(--blue-light)' : expired ? 'var(--red-light)' : 'var(--green-light)',
                        color: used ? 'var(--blue-text)' : expired ? 'var(--red-text)' : 'var(--green-text)',
                      }}>
                        {used ? 'Used' : expired ? 'Expired' : 'Active'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text2)' }}>
                      <div>
                        <span style={{ color: 'var(--text3)' }}>Created:</span> {formatDate(sk.created_at)}
                      </div>
                      <div>
                        <span style={{ color: 'var(--text3)' }}>Expires:</span> {formatDate(sk.expires_at)}
                      </div>
                      {!expired && !used && (
                        <div style={{ color: 'var(--green-text)', fontWeight: 500 }}>
                          {getTimeRemaining(sk.expires_at)}
                        </div>
                      )}
                      {used && (
                        <div style={{ color: 'var(--text3)' }}>
                          Used at: {formatDate(sk.used_at)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  keyCard: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: 12,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  },
  keyCode: {
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    padding: '4px 8px',
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text)',
  },
}
