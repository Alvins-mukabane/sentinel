import React, { useState, useEffect } from 'react';
import { Shield, Play, RotateCcw, Activity, Settings, Lock } from 'lucide-react';
import { AnalysisStatus } from './types';
import { TraceConsole, LoopVisualizer } from './components/DashboardComponents';
import { FindingsPanel } from './components/FindingsPanel';
import { ReportModal } from './components/ReportModal';
import { ToolSettingsModal } from './components/ToolSettingsModal';
import { useAnalysisLoop } from './hooks/useAnalysisLoop';

export default function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('siem_token');
    if (token) setIsAuthenticated(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('siem_token', data.token);
        setIsAuthenticated(true);
      } else {
        setLoginError('Invalid password or unauthorized access.');
      }
    } catch(err) {
      setLoginError('Server connection error.');
    }
  };

  const {
    status,
    logs,
    findings,
    critique,
    report,
    setReport,
    runAnalysis,
    handleFeedback,
  } = useAnalysisLoop();

  if (!isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center bg-terminal-bg font-mono">
        <div className="w-full max-w-sm p-8 bg-terminal-border/10 border border-terminal-border rounded-lg shadow-xl backdrop-blur-sm">
          <div className="flex justify-center mb-6">
             <div className="p-4 bg-terminal-accent/10 rounded-full border border-terminal-accent/30 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                <Lock className="text-terminal-accent" size={32} />
             </div>
          </div>
          <h2 className="text-xl font-bold text-center text-white mb-2 tracking-widest">AIMA CLOUD SIEM</h2>
          <p className="text-xs text-center text-terminal-text/50 uppercase tracking-widest mb-8">Secure Authenticated Node</p>
          
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <input 
                 type="password" 
                 placeholder="Dashboard Password"
                 className="w-full bg-terminal-bg border border-terminal-border rounded p-3 text-sm focus:outline-none focus:border-terminal-accent transition-colors"
                 value={password}
                 onChange={e => setPassword(e.target.value)}
              />
            </div>
            {loginError && <p className="text-terminal-warning text-xs text-center">{loginError}</p>}
            <button 
              type="submit"
              className="w-full bg-terminal-accent text-white font-bold py-3 rounded text-sm uppercase tracking-widest hover:bg-terminal-accent/80 transition-all hover:shadow-[0_0_15px_rgba(59,130,246,0.5)]"
            >
              Authenticate
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col p-4 gap-4 bg-terminal-bg selection:bg-terminal-accent selection:text-white">
      {/* Header */}
      <header className="flex justify-between items-center px-4 py-2 border-b border-terminal-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-terminal-accent/10 rounded-lg border border-terminal-accent/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <Shield className="text-terminal-accent" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tighter flex items-center gap-2">
              AIMA CLOUD SIEM <span className="text-[10px] bg-terminal-accent/20 text-terminal-accent px-1.5 py-0.5 rounded tracking-widest">v2.0.0</span>
              <span className="text-[10px] bg-terminal-success/20 border border-terminal-success/30 text-terminal-success px-2 py-0.5 rounded font-mono uppercase tracking-widest ml-2 hidden sm:inline-block">Webhooks Active</span>
            </h1>
            <p className="text-[10px] font-mono text-terminal-text/50 uppercase tracking-widest">AI-Driven GitHub & Sentry Incident Response</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-6 px-4 py-2 bg-terminal-border/20 rounded-full border border-terminal-border">
            <div className="flex flex-col">
              <span className="text-[9px] text-terminal-text/40 uppercase font-bold tracking-tighter">System Load</span>
              <div className="flex items-center gap-1">
                <Activity size={10} className="text-terminal-success" />
                <span className="text-xs font-mono">0.42%</span>
              </div>
            </div>
            <div className="w-[1px] h-6 bg-terminal-border" />
            <div className="flex flex-col">
              <span className="text-[9px] text-terminal-text/40 uppercase font-bold tracking-tighter">AI Verification</span>
              <span className="text-xs font-mono text-terminal-accent">ACTIVE</span>
            </div>
          </div>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-full hover:bg-terminal-border/40 text-terminal-text/40 hover:text-terminal-accent transition-colors"
          >
             <Settings size={18} />
          </button>

          <button 
            onClick={runAnalysis}
            disabled={status !== AnalysisStatus.IDLE && status !== AnalysisStatus.COMPLETED && status !== AnalysisStatus.FAILED}
            className={`
              flex items-center gap-2 px-6 py-2.5 rounded-md font-bold text-xs uppercase tracking-widest transition-all
              ${status === AnalysisStatus.IDLE || status === AnalysisStatus.COMPLETED || status === AnalysisStatus.FAILED
                ? 'bg-terminal-accent text-white hover:bg-terminal-accent/80 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] cursor-pointer'
                : 'bg-terminal-border text-terminal-text/30 cursor-not-allowed'}
            `}
          >
            {status === AnalysisStatus.IDLE ? <Play size={14} /> : <RotateCcw size={14} />}
            {status === AnalysisStatus.IDLE ? 'Initialize Loop' : 'Restart Simulation'}
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 min-h-0 grid grid-cols-12 gap-4">
        {/* Left Col: Console & Loop Vis */}
        <div className="col-span-5 flex flex-col gap-4 min-h-0">
          <div className="shrink-0">
            <LoopVisualizer status={status} />
          </div>
          <div className="flex-1 min-h-0">
            <TraceConsole logs={logs} status={status} />
          </div>
        </div>

        {/* Right Col: Findings */}
        <div className="col-span-7 min-h-0">
          <FindingsPanel findings={findings} status={status} critique={critique} onFeedback={handleFeedback} />
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 h-8 flex items-center justify-between px-4 bg-terminal-border/10 border-t border-terminal-border">
          <div className="flex items-center gap-4 text-[10px] font-mono text-terminal-text/30 uppercase tracking-widest">
            <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-terminal-success" />
                SECURE NODE: AIS-732
            </div>
            <div>VERIFIER: GEMINI_3.1_PRO</div>
            <div>ENCRYPTION: AES-256-GCM</div>
          </div>
          <div className="text-[10px] font-mono text-terminal-text/30">
            © 2026 SENTINEL IR SYSTEMS | VERIFIABLE AUTONOMY
          </div>
      </footer>

      <ReportModal report={report} onClose={() => setReport(null)} />
      {isSettingsOpen && <ToolSettingsModal onClose={() => setIsSettingsOpen(false)} />}
    </div>
  );
}
