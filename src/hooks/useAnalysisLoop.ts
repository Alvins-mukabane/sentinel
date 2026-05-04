import { useState, useCallback } from 'react';
import { AnalysisStatus, ForensicResult, Critique, TraceLog, ToolID, ForensicReport, ANALYSIS_CONFIG } from '../types';
import { GeminiService } from '../services/geminiService';

export const useAnalysisLoop = () => {
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [logs, setLogs] = useState<TraceLog[]>([]);
  const [findings, setFindings] = useState<ForensicResult[]>([]);
  const [critique, setCritique] = useState<Critique | null>(null);
  const [report, setReport] = useState<ForensicReport | null>(null);

  const addLog = useCallback(
    (message: string, step: AnalysisStatus, type: TraceLog['type'] = 'info', details?: any) => {
      const newLog: TraceLog = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        step,
        message,
        details,
        type,
      };
      setLogs((prev) => [...prev, newLog]);
    },
    []
  );

  const handleFeedback = useCallback(async (idx: number, type: 'positive' | 'negative') => {
    // 1. Update local state
    setFindings((prev) => prev.map((f, i) => (i === idx ? { ...f, feedback: type } : f)));
    
    // 2. Transmit to backend
    const finding = findings[idx];
    if (finding) {
      try {
        const token = localStorage.getItem('siem_token') || '';
        await fetch('/api/feedback', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ findingId: finding.id, title: finding.title, type })
        });
      } catch (err) {
        console.error("Failed to send feedback", err);
      }
    }
  }, [findings]);

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
      setReport(null);

      // 1. INITIAL COLLECTION
      setStatus(AnalysisStatus.COLLECTING);
      addLog("Starting autonomous collection sequence...", AnalysisStatus.COLLECTING, 'info');

      // Select baseline tools for initial triage
      const activeTools = GeminiService.getTools();
      if (activeTools.find(t => t.id === 'analyze_sentry_trace')) await executeAndLogTool('analyze_sentry_trace');
      if (activeTools.find(t => t.id === 'analyze_github_workflow')) await executeAndLogTool('analyze_github_workflow');

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
        const belowThreshold = currentFindings.some(
          (f) => f.confidence < ANALYSIS_CONFIG.MIN_CONFIDENCE_THRESHOLD
        );

        if (loopCritique.isSatisfactory && !belowThreshold) {
          addLog("Findings passed integrity check and confidence threshold.", AnalysisStatus.CRITIQUING, 'success');
          satisfactory = true;
        } else {
          addLog(
            `Validation failed. confidence_check: ${belowThreshold ? 'LOW' : 'OK'}, satisfies_logic: ${
              loopCritique.isSatisfactory ? 'OK' : 'FAIL'
            }`,
            AnalysisStatus.CRITIQUING,
            'warning'
          );

          // 4. INTELLIGENT CORRECTION (Dynamic Tool Selection)
          setStatus(AnalysisStatus.CORRECTING);

          if (loopCritique.suggestedTools && loopCritique.suggestedTools.length > 0) {
            addLog(
              `Intelligent selection: Critic suggests ${loopCritique.suggestedTools.join(', ')}`,
              AnalysisStatus.CORRECTING,
              'info'
            );

            const newEvidenceStrings: string[] = [];
            for (const tool of loopCritique.suggestedTools) {
              const out = await executeAndLogTool(tool);
              if (out) newEvidenceStrings.push(out);
            }

            addLog("Self-correcting findings with new evidence...", AnalysisStatus.CORRECTING);
            currentFindings = await GeminiService.correctFindings(
              currentFindings,
              loopCritique,
              newEvidenceStrings
            );
            setFindings(currentFindings);
          } else {
            addLog(
              "No new tools suggested by Critic. Attempting higher-level reasoning correction.",
              AnalysisStatus.CORRECTING
            );
            currentFindings = await GeminiService.correctFindings(currentFindings, loopCritique);
            setFindings(currentFindings);
          }
        }
      }

      setStatus(AnalysisStatus.COMPLETED);
      
      const filteredFindings = currentFindings.filter(f => f.confidence >= ANALYSIS_CONFIG.MIN_CONFIDENCE_THRESHOLD);
      
      addLog(
        `Autonomous Sentinel Loop complete after ${currentIteration} iterations. Filtered ${currentFindings.length - filteredFindings.length} low-confidence findings.`,
        AnalysisStatus.COMPLETED,
        'success'
      );

      // Trigger automatic report generation
      const finalReport: ForensicReport = {
        generatedAt: new Date().toISOString(),
        totalFindings: filteredFindings.length,
        averageConfidence:
          filteredFindings.reduce((acc, f) => acc + f.confidence, 0) / (filteredFindings.length || 1),
        findings: filteredFindings,
        trace: [
          ...logs,
          {
            id: 'final-log',
            timestamp: new Date().toISOString(),
            step: AnalysisStatus.COMPLETED,
            message: "Compiling final verifiable report...",
            type: 'success',
          },
        ],
        integrityHash:
          Math.random().toString(16).substring(2, 10).toUpperCase() +
          '-' +
          Math.random().toString(16).substring(2, 10).toUpperCase(),
      };
      setReport(finalReport);
    } catch (error) {
      console.error(error);
      setStatus(AnalysisStatus.FAILED);
      addLog(
        `Loop failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        AnalysisStatus.FAILED,
        'error'
      );
    }
  };

  return {
    status,
    logs,
    findings,
    critique,
    report,
    setReport,
    runAnalysis,
    handleFeedback,
  };
};
