import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePostHog } from 'posthog-js/react';

interface ClientPortalData {
  client_id?: string;
  client_name?: string;
  status?: string;
  total_spent?: number;
  total_projects?: number;
  active_retainer?: { plan_tier?: string; status?: string; current_period_start?: string; current_period_end?: string; };
  recent_activities?: { type: string; timestamp: string | number; details: Record<string, unknown>; }[];
  magic_link?: string;
  expires_at?: string;
}

export default function ClientPortal() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const posthog = usePostHog();
  
  const [data, setData] = useState<ClientPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!clientId) {
      setError('Invalid Portal Link');
      setLoading(false);
      return;
    }

    const fetchPortal = async () => {
      try {
        const res = await fetch(`http://localhost:9000/clients/${clientId}/portal`);
        if (!res.ok) throw new Error('Portal access denied or client not found');
        const json = await res.json();
        setData(json);
        posthog?.capture('client_portal_viewed', { 
          clientId: json.client_id, 
          clientName: json.client_name 
        });
      } catch (err: unknown) {
        setError((err as Error).message || 'Failed to authenticate secure session');
      } finally {
        setLoading(false);
      }
    };

    fetchPortal();
  }, [clientId, posthog]);

  if (loading) {
    return (
      <div className="client-portal-wrapper loading">
        <div className="loader-ring"></div>
        <p className="loading-text">AUTHENTICATING SECURE SESSION...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="client-portal-wrapper error">
        <div className="error-box">
          <h2>ACCESS DENIED</h2>
          <p>{error}</p>
          <button className="portal-btn" onClick={() => navigate('/welcome')}>Return Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="client-portal-wrapper">
      <header className="portal-header box-glass">
        <div className="portal-brand">
          <span className="accent">WHOLE TROUT</span> MEDIA
        </div>
        <div className="portal-user">
          <span className="user-label">SECURE PORTAL</span>
          <span className="user-name">{data.client_name}</span>
        </div>
      </header>

      <main className="portal-main">
        <div className="portal-grid">
          <section className="portal-section box-glass fade-in-up">
            <h3 className="section-title">Overview</h3>
            <div className="metric-row">
              <div className="metric-box">
                <span className="metric-val">{data.total_projects || 0}</span>
                <span className="metric-lbl">Active Projects</span>
              </div>
              <div className="metric-box">
                <span className="metric-val">${(data.total_spent || 0).toLocaleString()}</span>
                <span className="metric-lbl">Lifetime Value</span>
              </div>
              <div className="metric-box">
                <span className="metric-val status-active">{data.status || 'Active'}</span>
                <span className="metric-lbl">Account Status</span>
              </div>
            </div>
          </section>

          {data.active_retainer && (
            <section className="portal-section box-glass fade-in-up delay-1">
              <h3 className="section-title">Active Retainer</h3>
              <div className="retainer-info">
                <div className="ret-row">
                  <span>Plan Tier</span>
                  <strong>{data.active_retainer.plan_tier || 'Standard'}</strong>
                </div>
                <div className="ret-row">
                  <span>Status</span>
                  <strong className="status-active">{data.active_retainer.status || 'Active'}</strong>
                </div>
                <div className="ret-row">
                  <span>Period</span>
                  <strong>{data.active_retainer.current_period_start} to {data.active_retainer.current_period_end}</strong>
                </div>
              </div>
            </section>
          )}

          <section className="portal-section box-glass fade-in-up delay-1">
            <h3 className="section-title">Zero-Day Services</h3>
            <div className="service-info" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p className="dim-text" style={{ fontSize: '14px', lineHeight: '1.5', color: 'rgba(255,255,255,0.7)' }}>
                Your sovereign intelligence network is currently active. Access the live provisioning dashboard to monitor agent topography and view the LEX master service agreement.
              </p>
              <button 
                className="portal-btn" 
                style={{ marginTop: 'auto', alignSelf: 'flex-start', background: 'transparent', border: '1px solid #06b6d4', color: '#06b6d4' }}
                onClick={() => navigate(`/clients/${clientId}`)}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(6, 182, 212, 0.1)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                Launch Delivery Dashboard →
              </button>
            </div>
          </section>

          <section className="portal-section box-glass fade-in-up delay-2 span-2">
            <h3 className="section-title">Recent Activity</h3>
            {(!data.recent_activities || data.recent_activities.length === 0) ? (
              <p className="dim-text">No recent activity found on this account.</p>
            ) : (
              <ul className="activity-list">
                {data.recent_activities.map((act, i) => (
                  <li key={i} className="activity-item">
                    <span className="act-date">{new Date(act.timestamp).toLocaleDateString()}</span>
                    <span className="act-badge">{act.type}</span>
                    <span className="act-details">{JSON.stringify(act.details)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
      
      <style>{`
        .client-portal-wrapper {
          min-height: 100vh;
          background: #050508;
          color: #f5f0e8;
          font-family: 'Inter', -apple-system, sans-serif;
          padding: 40px;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .client-portal-wrapper.loading, .client-portal-wrapper.error {
          align-items: center;
          justify-content: center;
        }

        .box-glass {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          backdrop-filter: blur(12px);
          border-radius: 16px;
          padding: 32px;
        }

        .portal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 40px;
        }

        .portal-brand {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        .accent {
          color: #b87333;
        }

        .portal-user {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }

        .user-label {
          font-size: 10px;
          letter-spacing: 2px;
          color: #b87333;
          font-weight: 700;
        }

        .user-name {
          font-size: 16px;
          font-weight: 600;
        }

        .portal-main {
          flex: 1;
        }

        .portal-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .span-2 {
          grid-column: 1 / -1;
        }

        .section-title {
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 3px;
          color: rgba(255,255,255,0.4);
          margin-bottom: 24px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          padding-bottom: 12px;
        }

        .metric-row {
          display: flex;
          gap: 32px;
        }

        .metric-box {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .metric-val {
          font-size: 48px;
          font-weight: 800;
          line-height: 1;
        }

        .metric-lbl {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: rgba(255,255,255,0.5);
        }

        .status-active {
          color: #28a745;
        }

        .ret-row {
          display: flex;
          justify-content: space-between;
          padding: 16px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          font-size: 14px;
        }

        .ret-row:last-child {
          border-bottom: none;
        }

        .activity-list {
          list-style: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .activity-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: rgba(0,0,0,0.2);
          border-radius: 8px;
        }

        .act-date {
          font-size: 12px;
          color: rgba(255,255,255,0.5);
          min-width: 90px;
        }

        .act-badge {
          font-size: 11px;
          padding: 4px 10px;
          background: rgba(184,115,51,0.2);
          color: #b87333;
          border-radius: 100px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 700;
        }

        .act-details {
          font-size: 14px;
          color: rgba(255,255,255,0.8);
        }

        .loader-ring {
          width: 48px;
          height: 48px;
          border: 3px solid rgba(184,115,51,0.2);
          border-top-color: #b87333;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 24px;
        }

        .loading-text {
          font-size: 12px;
          letter-spacing: 4px;
          color: #b87333;
          font-weight: 700;
        }

        .error-box {
          text-align: center;
          max-width: 400px;
        }
        
        .error-box h2 {
          color: #dc3545;
          margin-bottom: 16px;
          letter-spacing: 2px;
        }

        .portal-btn {
          margin-top: 24px;
          padding: 12px 24px;
          background: #b87333;
          color: #fff;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
          letter-spacing: 1px;
          transition: background 0.2s;
        }

        .portal-btn:hover {
          background: #a06028;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .fade-in-up {
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
