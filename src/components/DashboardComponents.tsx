import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Shield, Cpu, BadgeCheck, AlertTriangle, RefreshCw, ChevronRight, ChevronDown } from 'lucide-react';
import { AnalysisStatus, TraceLog } from '../types';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ConsoleProps {
  logs: TraceLog[];
  status: AnalysisStatus;
}
  
const LogDetails = ({ details }: { details: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isJson = details.trim().startsWith('{') || details.trim().startsWith('[');
  
  if (!isJson && details.length < 150) {
    return (
      <div className="ml-4 pl-4 border-l border-terminal-border text-terminal-text/40 break-words max-w-full text-xs">
        {details}
      </div>
    );
  }

  return (
    <div className="ml-4 mt-2 max-w-full">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-[10px] text-terminal-accent hover:text-terminal-accent/80 mb-1"
      >
        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {isOpen ? "Collapse Details" : "Expand Details"}
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border border-terminal-border rounded mt-1 bg-[#1E1E1E]"
          >
            <SyntaxHighlighter 
              language={isJson ? "json" : "markdown"} 
              style={vscDarkPlus} 
              customStyle={{ margin: 0, padding: '0.75rem', fontSize: '10px' }}
            >
              {details}
            </SyntaxHighlighter>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const TraceConsole: React.FC<ConsoleProps> = ({ logs, status }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full glass-panel overflow-hidden">
      <div className="bg-terminal-border/30 px-4 py-2 border-bottom border-terminal-border flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-terminal-accent" />
          <span className="text-xs font-mono font-bold tracking-widest uppercase">System Trace Console</span>
        </div>
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${status !== AnalysisStatus.IDLE ? 'bg-terminal-success animate-pulse' : 'bg-terminal-border'}`} />
            <span className="text-[10px] font-mono text-terminal-text/50 uppercase">{status}</span>
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-3 data-grid"
      >
        <AnimatePresence mode="popLayout">
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-3 group"
            >
              <span className="text-terminal-text/30 shrink-0 select-none">[{log.timestamp.split('T')[1].split('.')[0]}]</span>
              <div className="flex flex-col gap-1 w-full max-w-full overflow-hidden">
                <div className="flex items-center gap-2">
                  <span className={`
                    ${log.type === 'success' ? 'text-terminal-success' : ''}
                    ${log.type === 'error' ? 'text-terminal-error' : ''}
                    ${log.type === 'warning' ? 'text-terminal-warning' : ''}
                    ${log.type === 'info' ? 'text-terminal-accent' : ''}
                    font-bold shrink-0
                  `}>
                    {log.step}:
                  </span>
                  <span className="group-hover:text-white transition-colors truncate">{log.message}</span>
                </div>
                {log.details && typeof log.details === 'string' && (
                  <LogDetails details={log.details} />
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {status !== AnalysisStatus.IDLE && status !== AnalysisStatus.COMPLETED && (
          <div className="flex gap-2 items-center text-terminal-accent">
            <ChevronRight size={14} className="animate-pulse" />
            <motion.span 
              animate={{ opacity: [1, 0, 1] }} 
              transition={{ repeat: Infinity, duration: 1 }}
              className="inline-block w-2 bg-terminal-accent h-4 ml-1" 
            />
          </div>
        )}
      </div>
    </div>
  );
};

interface LoopStageProps {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  active: boolean;
  completed: boolean;
}

const LoopStage: React.FC<LoopStageProps> = ({ icon, label, sublabel, active, completed }) => (
  <div className={`relative flex flex-col items-center gap-2 transition-all duration-500 ${active ? 'scale-110' : completed ? 'opacity-100' : 'opacity-40'}`}>
    <div className={`
      w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-500
      ${active ? 'border-terminal-accent bg-terminal-accent/10 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 
        completed ? 'border-terminal-success bg-terminal-success/10' : 'border-terminal-border'}
    `}>
      {React.cloneElement(icon as React.ReactElement, { 
        className: `transition-colors duration-500 ${active ? 'text-terminal-accent' : completed ? 'text-terminal-success' : 'text-terminal-text'}` 
      })}
    </div>
    <div className="text-center">
      <div className={`text-[10px] font-bold uppercase tracking-widest ${active ? 'text-terminal-accent' : completed ? 'text-terminal-success' : 'text-terminal-text/60'}`}>
        {label}
      </div>
      <div className="text-[9px] text-terminal-text/40 uppercase mt-0.5">{sublabel}</div>
    </div>
    {active && (
        <motion.div 
            layoutId="active-ring"
            className="absolute -inset-2 border border-terminal-accent/30 rounded-full"
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 2 }}
        />
    )}
  </div>
);

export const LoopVisualizer: React.FC<{ status: AnalysisStatus }> = ({ status }) => {
  return (
    <div className="glass-panel p-6 overflow-hidden relative">
      <div className="scanline" />
      <div className="flex justify-between items-center max-w-2xl mx-auto relative z-10">
        <LoopStage 
          icon={<Terminal size={20} />} 
          label="Collection" 
          sublabel="Raw Artifacts"
          active={status === AnalysisStatus.COLLECTING}
          completed={status !== AnalysisStatus.IDLE && status !== AnalysisStatus.COLLECTING}
        />
        <div className="h-[2px] flex-1 bg-terminal-border mx-4 relative overflow-hidden">
            {status !== AnalysisStatus.IDLE && (
                <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-terminal-accent to-transparent"
                />
            )}
        </div>
        <LoopStage 
          icon={<Cpu size={20} />} 
          label="Analyze" 
          sublabel="Pattern Map"
          active={status === AnalysisStatus.ANALYZING}
          completed={[AnalysisStatus.CRITIQUING, AnalysisStatus.CORRECTING, AnalysisStatus.COMPLETED].includes(status)}
        />
        <div className="h-[2px] flex-1 bg-terminal-border mx-4 relative overflow-hidden">
             {status !== AnalysisStatus.IDLE && ![AnalysisStatus.COLLECTING, AnalysisStatus.ANALYZING].includes(status) && (
                <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-terminal-accent to-transparent"
                />
            )}
        </div>
        <LoopStage 
          icon={<AlertTriangle size={20} />} 
          label="Critique" 
          sublabel="Self-Check"
          active={status === AnalysisStatus.CRITIQUING}
          completed={[AnalysisStatus.CORRECTING, AnalysisStatus.COMPLETED].includes(status)}
        />
        <div className="h-[2px] flex-1 bg-terminal-border mx-4 relative overflow-hidden">
             {status !== AnalysisStatus.IDLE && ![AnalysisStatus.COLLECTING, AnalysisStatus.ANALYZING, AnalysisStatus.CRITIQUING].includes(status) && (
                <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-terminal-accent to-transparent"
                />
            )}
        </div>
        <LoopStage 
          icon={<RefreshCw size={20} />} 
          label="Correct" 
          sublabel="Gap Closing"
          active={status === AnalysisStatus.CORRECTING}
          completed={status === AnalysisStatus.COMPLETED}
        />
        <div className="h-[2px] flex-1 bg-terminal-border mx-4 relative overflow-hidden">
             {status === AnalysisStatus.COMPLETED && (
                <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-terminal-accent to-transparent"
                />
            )}
        </div>
        <LoopStage 
          icon={<BadgeCheck size={20} />} 
          label="Verified" 
          sublabel="Final Case"
          active={status === AnalysisStatus.COMPLETED}
          completed={false}
        />
      </div>
    </div>
  );
};
