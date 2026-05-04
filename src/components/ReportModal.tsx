import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Download, ShieldCheck, X, Activity, ExternalLink, Code, Table } from 'lucide-react';
import { ForensicReport } from '../types';

interface ReportModalProps {
  report: ForensicReport | null;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ report, onClose }) => {
  if (!report) return null;

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `sentinel-report-${report.integrityHash}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleExportCSV = () => {
    const headers = ["Title", "Evidence", "Confidence", "Tags"];
    const rows = report.findings.map(f => [
      `"${f.title.replace(/"/g, '""')}"`,
      `"${f.evidence.replace(/"/g, '""')}"`,
      f.confidence.toString(),
      `"${f.tags.join(', ')}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", encodeURI(csvContent));
    downloadAnchorNode.setAttribute("download", `sentinel-findings-${report.integrityHash}.csv`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-terminal-bg border border-terminal-border rounded-lg shadow-2xl flex flex-col overflow-hidden data-grid"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-terminal-border flex justify-between items-center bg-terminal-border/20">
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-terminal-accent" />
              <div>
                <h2 className="text-sm font-bold tracking-widest uppercase">Verified Forensic Report</h2>
                <p className="text-[10px] text-terminal-text/40 font-mono uppercase tracking-tighter">Integrity Hash: {report.integrityHash}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleExportJSON}
                className="flex items-center gap-2 px-3 py-1.5 bg-terminal-border/30 hover:bg-terminal-border/50 text-[10px] uppercase font-bold rounded border border-terminal-border transition-colors text-terminal-accent"
              >
                <Code size={12} />
                JSON
              </button>
              <button 
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-3 py-1.5 bg-terminal-border/30 hover:bg-terminal-border/50 text-[10px] uppercase font-bold rounded border border-terminal-border transition-colors text-terminal-success"
              >
                <Table size={12} />
                CSV
              </button>
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 px-3 py-1.5 bg-terminal-border/30 hover:bg-terminal-border/50 text-[10px] uppercase font-bold rounded border border-terminal-border transition-colors"
              >
                <Download size={12} />
                PDF
              </button>
              <button onClick={onClose} className="text-terminal-text/40 hover:text-white transition-colors ml-2 border-l border-terminal-border pl-4">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            {/* Meta Stats */}
            <div className="grid grid-cols-4 gap-4">
              <StatBox label="Generated At" value={new Date(report.generatedAt).toLocaleString()} />
              <StatBox label="Verified Findings" value={report.totalFindings.toString()} />
              <StatBox 
                label="Confidence Score" 
                value={`${(report.averageConfidence * 100).toFixed(1)}%`} 
                trend={report.averageConfidence > 0.9 ? 'OPTIMAL' : 'VALIDATED'}
              />
              <StatBox label="Case Status" value="CLOSED / VERIFIED" />
            </div>

            {/* Content Sections */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-terminal-border pb-2">
                <ShieldCheck size={16} className="text-terminal-success" />
                <h3 className="text-xs font-bold uppercase tracking-widest">Executive Summary</h3>
              </div>
              <div className="space-y-4">
                {report.findings.map((finding, idx) => (
                  <div key={`finding-${idx}`} className="p-4 bg-terminal-border/10 border border-terminal-border rounded">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-terminal-accent">{finding.title}</span>
                      <span className="text-[10px] font-mono text-terminal-success">CF: {(finding.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <p className="text-xs text-terminal-text/70 font-mono leading-relaxed">{finding.evidence}</p>
                    <div className="mt-2 flex gap-2">
                      {finding.tags.map((tag, tagIdx) => (
                        <span key={`${tag}-${tagIdx}`} className="text-[8px] px-1.5 py-0.5 bg-terminal-accent/5 rounded border border-terminal-accent/20 uppercase font-bold text-terminal-accent/70">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-terminal-border pb-2">
                <Activity size={16} className="text-terminal-warning" />
                <h3 className="text-xs font-bold uppercase tracking-widest">Audit Trail (Execution Trace)</h3>
              </div>
              <div className="bg-black/40 p-4 rounded border border-terminal-border font-mono text-[10px] space-y-1">
                {report.trace.map((log, idx) => (
                  <div key={`trace-${log.id || idx}`} className="flex gap-4">
                    <span className="text-terminal-text/20 shrink-0">[{log.timestamp.split('T')[1].split('.')[0]}]</span>
                    <span className="text-terminal-accent shrink-0 uppercase w-20">{log.step}</span>
                    <span className="text-terminal-text/50">{log.message}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-terminal-border/10 border-t border-terminal-border flex justify-between items-center">
            <div className="flex items-center gap-2 text-[9px] text-terminal-text/30 font-mono">
              <ExternalLink size={10} />
              VERIFIED BY SENTINEL AUTONOMOUS PROTOCOL 7.1
            </div>
            <div className="text-[9px] text-terminal-text/30 font-mono">
              CONFIDENTIAL FORENSIC ARTIFACT - DO NOT DISTRIBUTE
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const StatBox = ({ label, value, trend }: { label: string, value: string, trend?: string }) => (
  <div className="p-3 bg-terminal-border/20 border border-terminal-border rounded">
    <div className="text-[9px] text-terminal-text/40 uppercase font-bold mb-1">{label}</div>
    <div className="text-sm font-mono text-terminal-text">{value}</div>
    {trend && <div className="text-[8px] text-terminal-success font-bold mt-1 tracking-widest uppercase">[{trend}]</div>}
  </div>
);
