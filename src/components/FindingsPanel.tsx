import React from 'react';
import { Shield, CheckCircle2, AlertCircle, Bookmark, Link as LinkIcon, Info } from 'lucide-react';
import { ForensicResult, Critique, AnalysisStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface FindingsPanelProps {
  findings: ForensicResult[];
  status: AnalysisStatus;
  critique: Critique | null;
}

export const FindingsPanel: React.FC<FindingsPanelProps> = ({ findings, status, critique }) => {
  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex-1 glass-panel overflow-hidden flex flex-col">
          <div className="bg-terminal-border/30 px-4 py-3 border-bottom border-terminal-border flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-terminal-success" />
              <h2 className="text-xs font-mono font-bold tracking-widest uppercase">Forensic Findings</h2>
            </div>
            <div className="text-[10px] font-mono text-terminal-text/50">
              COUNT: {findings.length}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence mode="popLayout">
              {findings.length === 0 && status === AnalysisStatus.IDLE && (
                <div className="h-full flex flex-col items-center justify-center text-terminal-text/30 gap-3 border-2 border-dashed border-terminal-border rounded-lg p-8">
                  <Info size={32} strokeWidth={1.5} />
                  <p className="text-sm font-mono text-center">Awaiting data input to begin autonomous loop.</p>
                </div>
              )}
              
              {findings.map((finding, idx) => (
                <motion.div
                  key={finding.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-terminal-border/10 border border-terminal-border p-4 rounded-md group hover:border-terminal-accent/50 transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <Bookmark size={14} className="text-terminal-accent" />
                      {finding.title}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-terminal-text/40">Confidence</span>
                      <div className="w-12 h-1.5 bg-terminal-border rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-terminal-success"
                          initial={{ width: 0 }}
                          animate={{ width: `${finding.confidence * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-xs text-terminal-text/70 mb-3 font-mono leading-relaxed">
                    {finding.evidence}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {finding.tags.map(tag => (
                      <span key={tag} className="text-[9px] px-2 py-0.5 bg-terminal-accent/10 text-terminal-accent border border-terminal-accent/20 rounded uppercase font-bold">
                        {tag}
                      </span>
                    ))}
                    <button className="ml-auto text-[9px] flex items-center gap-1 text-terminal-text/30 hover:text-terminal-accent transition-colors uppercase tracking-widest font-bold">
                      <LinkIcon size={10} />
                      Verify Artifact
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
      </div>

      {critique && (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`glass-panel border-l-4 ${critique.isSatisfactory ? 'border-l-terminal-success' : 'border-l-terminal-warning'} p-4 shrink-0 overflow-hidden relative`}
        >
            <div className="absolute top-2 right-2 opacity-10">
                {critique.isSatisfactory ? <CheckCircle2 size={48} /> : <AlertCircle size={48} />}
            </div>
            
            <h3 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                {critique.isSatisfactory ? (
                    <><CheckCircle2 size={14} className="text-terminal-success" /> Loop Integrity: High</>
                ) : (
                    <><AlertCircle size={14} className="text-terminal-warning" /> Critique Findings: Gaps Detected</>
                )}
            </h3>

            <div className="space-y-3 relative z-10">
                {critique.issues.length > 0 && (
                    <div className="space-y-1">
                        <span className="text-[9px] uppercase font-bold text-terminal-error/70">Structural Issues</span>
                        {critique.issues.map((issue, i) => (
                            <p key={i} className="text-[10px] text-terminal-text/60 pl-3 border-l border-terminal-error/30">• {issue}</p>
                        ))}
                    </div>
                )}
                
                {critique.gaps.length > 0 && (
                    <div className="space-y-1">
                        <span className="text-[9px] uppercase font-bold text-terminal-warning/70">Evidence Gaps</span>
                        {critique.gaps.map((gap, i) => (
                            <p key={i} className="text-[10px] text-terminal-text/60 pl-3 border-l border-terminal-warning/30">• {gap}</p>
                        ))}
                    </div>
                )}

                {critique.nextSteps && (
                     <div className="mt-2 pt-2 border-t border-terminal-border">
                        <span className="text-[9px] uppercase font-bold text-terminal-accent">Remediation Path</span>
                        <p className="text-[10px] font-mono italic text-terminal-accent/80 mt-1">{critique.nextSteps}</p>
                     </div>
                )}
            </div>
        </motion.div>
      )}
    </div>
  );
};
