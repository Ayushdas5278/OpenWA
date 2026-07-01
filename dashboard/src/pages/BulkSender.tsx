import { useState, useEffect } from 'react';
import { Loader2, Zap, Rocket, Users } from 'lucide-react';
import { messageApi } from '../services/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useRole } from '../hooks/useRole';
import { useSessionsQuery } from '../hooks/queries';
import { PageHeader } from '../components/PageHeader';
import './BulkSender.css';

interface BatchStatus {
  batchId: string;
  status: string;
  totalMessages: number;
  processedMessages?: number;
  successfulMessages?: number;
  failedMessages?: number;
}

const messageTypes = [
  { id: 'text', label: 'Text' },
  { id: 'image', label: 'Image' },
  { id: 'video', label: 'Video' },
  { id: 'audio', label: 'Audio' },
  { id: 'document', label: 'Document' },
] as const;

export function BulkSender() {
  useDocumentTitle('Bulk Blast / Broadcast');
  const { canWrite } = useRole();
  const { data: allSessions = [], isLoading: loadingSessions } = useSessionsQuery();
  const readySessions = allSessions.filter(s => s.status === 'ready');

  const [session, setSession] = useState('');
  const [numbersText, setNumbersText] = useState("919876543210\n918765432109");
  const [messageType, setMessageType] = useState<'text' | 'image' | 'video' | 'audio' | 'document'>('text');
  const [content, setContent] = useState('Hello! We have an exciting announcement for you.');
  const [mediaUrl, setMediaUrl] = useState('');
  const [delaySec, setDelaySec] = useState(3);
  const [randomize, setRandomize] = useState(true);

  const [isBlasting, setIsBlasting] = useState(false);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (readySessions.length > 0 && !session) {
      setSession(readySessions[0].id);
    }
  }, [readySessions, session]);

  // Parse phone numbers cleanly
  const parsedNumbers = numbersText
    .split(/[\n,;]+/)
    .map(n => n.replace(/[^0-9]/g, ''))
    .filter(n => n.length >= 7)
    .map(n => `${n}@c.us`);

  // Auto-poll batch status when active
  useEffect(() => {
    if (!activeBatchId || !session) return;

    const interval = setInterval(async () => {
      try {
        const status = await messageApi.getBatchStatus(session, activeBatchId);
        setBatchStatus(status);
        if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
          setIsBlasting(false);
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Failed to poll batch status:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeBatchId, session]);

  const handleBlast = async () => {
    if (!session || parsedNumbers.length === 0) return;
    setIsBlasting(true);
    setErrorMsg(null);
    setBatchStatus(null);

    const payloadMessages = parsedNumbers.map(chatId => {
      if (messageType === 'text') {
        return { chatId, type: 'text', content: { text: content } };
      } else if (messageType === 'image') {
        return { chatId, type: 'image', content: { image: { url: mediaUrl }, caption: content } };
      } else if (messageType === 'video') {
        return { chatId, type: 'video', content: { video: { url: mediaUrl }, caption: content } };
      } else if (messageType === 'audio') {
        return { chatId, type: 'audio', content: { audio: { url: mediaUrl } } };
      } else {
        return { chatId, type: 'document', content: { document: { url: mediaUrl }, caption: content } };
      }
    });

    try {
      const res = await messageApi.sendBulk(session, {
        messages: payloadMessages,
        options: {
          delayBetweenMessages: delaySec * 1000,
          randomizeDelay: randomize,
        },
      });

      setActiveBatchId(res.batchId);
      setBatchStatus({
        batchId: res.batchId,
        status: res.status || 'processing',
        totalMessages: res.totalMessages || parsedNumbers.length,
        processedMessages: 0,
        successfulMessages: 0,
        failedMessages: 0,
      });
    } catch (err) {
      setIsBlasting(false);
      setErrorMsg(err instanceof Error ? err.message : "Failed to start bulk blast.");
    }
  };

  if (loadingSessions) {
    return (
      <div className="bulk-sender" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  const processed = batchStatus?.processedMessages ?? 0;
  const total = batchStatus?.totalMessages ?? parsedNumbers.length;
  const progressPct = total > 0 ? Math.min(Math.round((processed / total) * 100), 100) : 0;

  return (
    <div className="bulk-sender">
      <PageHeader
        title="Bulk Blast / Broadcast 🚀"
        subtitle="Send high-converting campaigns and notifications to multiple numbers at once with intelligent anti-ban delays."
      />

      <div className="bulk-grid">
        {/* Left Column: Configuration Form */}
        <div className="bulk-card">
          <h2><Zap size={22} color="#25d366" /> Campaign Setup</h2>

          <div className="form-group">
            <label>1. Select WhatsApp Sender Bot</label>
            <select
              value={session}
              onChange={e => setSession(e.target.value)}
              disabled={readySessions.length === 0 || isBlasting}
            >
              {readySessions.length === 0 && <option value="">No Active Sessions Found</option>}
              {readySessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.phone || 'Ready'})
                </option>
              ))}
            </select>
            {readySessions.length === 0 && (
              <span className="hint" style={{ color: '#ef4444' }}>Please scan QR code in Sessions tab first.</span>
            )}
          </div>

          <div className="form-group">
            <label>
              <span>2. Recipient Numbers (One per line or comma separated)</span>
              <span className="badge-count">{parsedNumbers.length} Valid Numbers</span>
            </label>
            <textarea
              value={numbersText}
              onChange={e => setNumbersText(e.target.value)}
              placeholder="919876543210&#10;918765432109"
              disabled={isBlasting}
            />
            <span className="hint">Country code required without '+' symbol (e.g. 91 for India, 1 for USA).</span>
          </div>

          <div className="form-group">
            <label>3. Message Type</label>
            <div className="type-pills">
              {messageTypes.map(t => (
                <button
                  key={t.id}
                  type="button"
                  className={`type-pill ${messageType === t.id ? 'active' : ''}`}
                  onClick={() => setMessageType(t.id)}
                  disabled={isBlasting}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {messageType !== 'text' && (
            <div className="form-group">
              <label>Media URL ({messageType})</label>
              <input
                type="text"
                value={mediaUrl}
                onChange={e => setMediaUrl(e.target.value)}
                placeholder="https://example.com/media.mp4 or photo.jpg"
                disabled={isBlasting}
              />
            </div>
          )}

          {messageType !== 'audio' && (
            <div className="form-group">
              <label>{messageType === 'text' ? 'Message Text' : 'Caption (Optional)'}</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Write your broadcast message here..."
                disabled={isBlasting}
                style={{ minHeight: '90px' }}
              />
            </div>
          )}

          <div className="form-group">
            <label>4. Anti-Ban Delay ({delaySec} seconds)</label>
            <div className="slider-row">
              <input
                type="range"
                min="1"
                max="15"
                value={delaySec}
                onChange={e => setDelaySec(Number(e.target.value))}
                disabled={isBlasting}
              />
              <span className="slider-val">{delaySec}s</span>
            </div>
            <label className="checkbox-row" style={{ marginTop: '8px' }}>
              <input
                type="checkbox"
                checked={randomize}
                onChange={e => setRandomize(e.target.checked)}
                disabled={isBlasting}
              />
              <span>Randomize delay (+0 to 2 sec) to simulate human typing</span>
            </label>
          </div>

          {errorMsg && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              ❌ {errorMsg}
            </div>
          )}

          <button
            type="button"
            className="blast-btn"
            onClick={handleBlast}
            disabled={!canWrite || readySessions.length === 0 || parsedNumbers.length === 0 || isBlasting}
          >
            {isBlasting ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Blasting Campaign...
              </>
            ) : (
              <>
                <Rocket size={20} />
                Blast {parsedNumbers.length} Messages Now 🚀
              </>
            )}
          </button>
        </div>

        {/* Right Column: Live Status & Analytics */}
        <div className="bulk-card">
          <h2><Users size={22} color="#25d366" /> Live Blast Analytics</h2>

          {batchStatus ? (
            <div className="progress-card">
              <div className="progress-header">
                <div>
                  <span style={{ fontSize: '0.85rem', color: '#888' }}>BATCH ID</span>
                  <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{batchStatus.batchId.slice(0, 18)}...</div>
                </div>
                <span className={`status-badge ${batchStatus.status}`}>
                  {batchStatus.status}
                </span>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 600 }}>
                  <span>Progress</span>
                  <span>{progressPct}% ({processed}/{total})</span>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
                </div>
              </div>

              <div className="stats-grid">
                <div className="stat-box">
                  <div className="stat-val">{total}</div>
                  <div className="stat-lbl">Total Queued</div>
                </div>
                <div className="stat-box">
                  <div className="stat-val success">{batchStatus.successfulMessages ?? 0}</div>
                  <div className="stat-lbl">Delivered ✅</div>
                </div>
                <div className="stat-box">
                  <div className="stat-val failed">{batchStatus.failedMessages ?? 0}</div>
                  <div className="stat-lbl">Failed ❌</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <Rocket size={48} strokeWidth={1.2} style={{ opacity: 0.5 }} />
              <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>Ready for Launch</div>
              <p style={{ maxWidth: '240px', fontSize: '0.85rem' }}>
                Configure your recipient list and message on the left, then hit Blast to watch live analytics appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
