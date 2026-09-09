import React, { useState } from 'react';
import { Modal } from './Modal';
import { Search, ShieldAlert, ShieldCheck, Database, Loader2 } from 'lucide-react';
import { operationApi } from '../services/api';
import { useToast } from '../context/ToastContext';

export const IOCLookupModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const toast = useToast();

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const data = await operationApi.searchIOC(query.trim());
      setResult(data);
      setRecentSearches((prev) => [
        { query: query.trim(), match: data.is_match, time: new Date().toLocaleTimeString() },
        ...prev.slice(0, 4)
      ]);

      if (data.is_match) {
        toast.success(`Authoritative Threat Match Found for "${query.trim()}"`);
      } else {
        toast.info(`No authoritative record found for "${query.trim()}" in current scenario.`);
      }
    } catch (err) {
      toast.error(err.message || 'IOC search failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Database size={20} color="var(--cyan-primary)" />
          <span>Authoritative IOC Intelligence Lookup</span>
        </div>
      }
      maxWidth="620px"
    >
      <div>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <input
            type="text"
            className="form-input"
            placeholder="IP, domain, hash or IOC (e.g. 185.220.101.44)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !query.trim()}
            style={{ whiteSpace: 'nowrap' }}
          >
            {loading ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
            <span>Lookup</span>
          </button>
        </form>

        {/* Result Box */}
        {result && (
          <div style={{
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            background: result.is_match ? 'rgba(244, 63, 94, 0.08)' : 'rgba(0, 0, 0, 0.3)',
            border: '1px solid',
            borderColor: result.is_match ? 'rgba(244, 63, 94, 0.4)' : 'var(--border-subtle)',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {result.is_match ? (
                  <ShieldAlert size={20} color="var(--rose-danger)" />
                ) : (
                  <ShieldCheck size={20} color="var(--text-dim)" />
                )}
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: result.is_match ? '#fb7185' : 'var(--text-muted)'
                }}>
                  {result.status}
                </span>
              </div>
              <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Query: {result.query}
              </span>
            </div>

            {result.details && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Reputation: </span>
                  <span style={{ color: '#fb7185', fontWeight: 600 }}>{result.details.reputation}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Confidence: </span>
                  <span style={{ color: 'var(--cyan-primary)', fontWeight: 600 }}>{result.details.confidence}</span>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Category: </span>
                  <span style={{ color: '#fff' }}>{result.details.category}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>
              Recent Searches in Session
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {recentSearches.map((s, idx) => (
                <div
                  key={idx}
                  onClick={() => { setQuery(s.query); }}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.45rem 0.75rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  <span className="mono" style={{ color: 'var(--text-cyan)' }}>{s.query}</span>
                  <span style={{ color: s.match ? '#fb7185' : 'var(--text-dim)', fontSize: '0.75rem' }}>
                    {s.match ? 'MATCH' : 'NO MATCH'} • {s.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
