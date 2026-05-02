import React, { useState, useCallback } from 'react';
import { Shield, Play, RotateCcw, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { AnalysisStatus, ForensicResult, Critique, TraceLog, ANALYSIS_CONFIG, ToolID, ForensicReport } from './types';
import { GeminiService } from './services/geminiService';
import { TraceConsole, LoopVisualizer } from './components/DashboardComponents';
import { FindingsPanel } from './components/FindingsPanel';
import { ReportModal } from './components/ReportModal';

export default function App() {
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [logs, setLogs] = useState<TraceLog[]>([]);
  const [findings, setFindings] = useState<ForensicResult[]>([]);
  const [critique, setCritique] = useState<Critique | null>(null);
  const [report, setReport] = useState<ForensicReport | null>(null);

  const addLog = useCallback((message: string, step: AnalysisStatus, type: TraceLog['type'] = 'info', details?: any) => {
    const newLog: TraceLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      step,
      message,
      details,
      type
    };
    setLogs(prev => [...prev, newLog]);
  }, []);

  const runAnalysis = async () => {
    const toolsRun: ToolID[] = [];
    const evidence: Record<string, string> = {};

    const executeAndLogTool = async (tool: ToolID) => {
      if (toolsRun.includes(tool)) return;
      
      addLog(`Executing forensic tool: ${tool}...`, AnalysisStatus.COLLECTING);
      const output = await GeminiService.executeTool(tool);
      evidence[tool] = output;
      toolsRun.push(tool);
      addLog(`Metadata extracted from ${tool}.`, AnalysisStatus.COLLECTING, 'success', output);
      return output;
    };

    try {
      setFindings([]);
      setCritique(null);
      setLogs([]);
      
      // 1. INITIAL COLLECTION
      setStatus(AnalysisStatus.COLLECTING);
      addLog("Starting autonomous collection sequence...", AnalysisStatus.COLLECTING, 'info');
      
      // Select baseline tools for initial triage
      await executeAndLogTool('process_list');
      await executeAndLogTool('network_conns');
      
      let currentFindings: ForensicResult[] = [];
      let currentIteration = 0;
      let satisfactory = false;

      while (currentIteration < ANALYSIS_CONFIG.MAX_LOOP_ITERATIONS && !satisfactory) {
        currentIteration++;
        addLog(`Loop Iteration ${currentIteration}: Synchronizing Analysis Engine`, status);

        // 2. ANALYSIS
        setStatus(AnalysisStatus.ANALYZING);
        addLog("Analyzing current evidence cluster...", AnalysisStatus.ANALYZING);
        currentFindings = await GeminiService.analyzeEvidence(Object.values(evidence));
        setFindings(currentFindings);
        addLog(`Generated ${currentFindings.length} findings for evaluation.`, AnalysisStatus.ANALYZING, 'success');

        // 3. CRITIQUE
        setStatus(AnalysisStatus.CRITIQUING);
        addLog("Running formal validation against findings...", AnalysisStatus.CRITIQUING);
        const loopCritique = await GeminiService.critiqueFindings(currentFindings, toolsRun);
        setCritique(loopCritique);

        // Validation Rules Check
        const avgConfidence = currentFindings.reduce((acc, f) => acc + f.confidence, 0) / (currentFindings.length || 1);
        const belowThreshold = currentFindings.some(f => f.confidence < ANALYSIS_CONFIG.MIN_CONFIDENCE_THRESHOLD);

        if (loopCritique.isSatisfactory && !belowThreshold) {
          addLog("Findings passed integrity check and confidence threshold.", AnalysisStatus.CRITIQUING, 'success');
          satisfactory = true;
        } else {
          addLog(`Validation failed. confidence_check: ${belowThreshold ? 'LOW' : 'OK'}, satisfies_logic: ${loopCritique.isSatisfactory ? 'OK' : 'FAIL'}`, AnalysisStatus.CRITIQUING, 'warning');
          
          // 4. INTELLIGENT CORRECTION (Dynamic Tool Selection)
          setStatus(AnalysisStatus.CORRECTING);
          
          if (loopCritique.suggestedTools.length > 0) {
            addLog(`Intelligent selection: Critic suggests ${loopCritique.suggestedTools.join(', ')}`, AnalysisStatus.CORRECTING, 'info');
            
            const newEvidenceStrings: string[] = [];
            for (const tool of loopCritique.suggestedTools) {
              const out = await executeAndLogTool(tool);
              if (out) newEvidenceStrings.push(out);
            }

            addLog("Self-correcting findings with new evidence...", AnalysisStatus.CORRECTING);
            currentFindings = await GeminiService.correctFindings(currentFindings, loopCritique, newEvidenceStrings);
            setFindings(currentFindings);
          } else {
            addLog("No new tools suggested by Critic. Attempting higher-level reasoning correction.", AnalysisStatus.CORRECTING);
            currentFindings = await GeminiService.correctFindings(currentFindings, loopCritique);
            setFindings(currentFindings);
          }
        }
      }

      setStatus(AnalysisStatus.COMPLETED);
      addLog(`Autonomous Sentinel Loop complete after ${currentIteration} iterations.`, AnalysisStatus.COMPLETED, 'success');

      // Trigger automatic report generation
      const finalReport: ForensicReport = {
        generatedAt: new Date().toISOString(),
        totalFindings: currentFindings.length,
        averageConfidence: currentFindings.reduce((acc, f) => acc + f.confidence, 0) / (currentFindings.length || 1),
        findings: currentFindings,
        trace: [...logs, {
           id: 'final-log',
           timestamp: new Date().toISOString(),
           step: AnalysisStatus.COMPLETED,
           message: "Compiling final verifiable report...",
           type: 'success'
        }],
        integrityHash: Math.random().toString(16).substring(2, 10).toUpperCase() + '-' + Math.random().toString(16).substring(2, 10).toUpperCase()
      };
      setReport(finalReport);

    } catch (error) {
      console.error(error);
      setStatus(AnalysisStatus.FAILED);
      addLog(`Loop failed: ${error instanceof Error ? error.message : 'Unknown error'}`, AnalysisStatus.FAILED, 'error');
    }
  };

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
              SENTINEL LOOP <span className="text-[10px] bg-terminal-accent/20 text-terminal-accent px-1.5 py-0.5 rounded tracking-widest">v1.2.0</span>
            </h1>
            <p className="text-[10px] font-mono text-terminal-text/50 uppercase tracking-widest">Autonomous Incident Response Agent</p>
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
          <FindingsPanel findings={findings} status={status} critique={critique} />
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
    </div>
  );
}
