import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Plus, Save, X, TerminalSquare } from 'lucide-react';
import { CustomTool } from '../types';
import { GeminiService } from '../services/geminiService';

interface ToolSettingsModalProps {
  onClose: () => void;
}

export const ToolSettingsModal: React.FC<ToolSettingsModalProps> = ({ onClose }) => {
  const [tools, setTools] = useState<CustomTool[]>(GeminiService.getTools());
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newTool, setNewTool] = useState<CustomTool>({
    id: '',
    name: '',
    description: '',
    mockOutput: ''
  });

  const handleAddTool = () => {
    if (newTool.id && newTool.name && newTool.mockOutput) {
      GeminiService.addTool(newTool);
      setTools(GeminiService.getTools());
      setNewTool({ id: '', name: '', description: '', mockOutput: '' });
      setEditingId(null);
    }
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
          className="relative w-full max-w-2xl max-h-[90vh] bg-terminal-bg border border-terminal-border rounded-lg shadow-2xl flex flex-col overflow-hidden data-grid"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-terminal-border flex justify-between items-center bg-terminal-border/20">
            <div className="flex items-center gap-3">
              <Settings size={20} className="text-terminal-accent" />
              <div>
                <h2 className="text-sm font-bold tracking-widest uppercase">Tool Configuration</h2>
                <p className="text-[10px] text-terminal-text/40 font-mono uppercase tracking-tighter">Manage Forensic Data Sources</p>
              </div>
            </div>
            <button onClick={onClose} className="text-terminal-text/40 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
             <div className="space-y-3">
               <h3 className="text-xs font-bold uppercase text-terminal-text/60 border-b border-terminal-border pb-2">Active Tools</h3>
               <div className="grid grid-cols-1 gap-3">
                  {tools.map(tool => (
                    <div key={tool.id} className="p-3 border border-terminal-border rounded bg-terminal-border/10">
                       <div className="flex justify-between items-center mb-1">
                          <h4 className="font-bold text-xs flex items-center gap-2"><TerminalSquare size={12} className="text-terminal-accent" /> {tool.name}</h4>
                          <span className="text-[10px] font-mono text-terminal-text/30">{tool.id}</span>
                       </div>
                       <p className="text-[10px] text-terminal-text/50 mb-2">{tool.description}</p>
                       <details className="text-[10px] font-mono text-terminal-text/40">
                         <summary className="cursor-pointer hover:text-terminal-text transition-colors">View Mock Output</summary>
                         <pre className="mt-2 p-2 bg-black/50 border border-terminal-border rounded whitespace-pre-wrap">{tool.mockOutput}</pre>
                       </details>
                    </div>
                  ))}
               </div>
             </div>

             <div className="pt-4 border-t border-terminal-border">
               <h3 className="text-xs font-bold uppercase text-terminal-accent mb-3">Add Custom Tool</h3>
               <div className="space-y-3 bg-terminal-border/5 p-4 rounded-md border border-terminal-accent/20">
                 <div className="grid grid-cols-2 gap-3">
                   <input 
                      type="text" 
                      placeholder="Tool ID (e.g. mft_parser)" 
                      value={newTool.id}
                      onChange={e => setNewTool({...newTool, id: e.target.value})}
                      className="bg-terminal-border/10 border border-terminal-border px-3 py-2 rounded text-xs font-mono focus:outline-none focus:border-terminal-accent text-white"
                   />
                   <input 
                      type="text" 
                      placeholder="Display Name (e.g. MFT Parser)" 
                      value={newTool.name}
                      onChange={e => setNewTool({...newTool, name: e.target.value})}
                      className="bg-terminal-border/10 border border-terminal-border px-3 py-2 rounded text-xs font-mono focus:outline-none focus:border-terminal-accent text-white"
                   />
                 </div>
                 <input 
                    type="text" 
                    placeholder="Description (Used by Agent to select tool)" 
                    value={newTool.description}
                    onChange={e => setNewTool({...newTool, description: e.target.value})}
                    className="w-full bg-terminal-border/10 border border-terminal-border px-3 py-2 rounded text-xs font-mono focus:outline-none focus:border-terminal-accent text-white"
                 />
                 <textarea 
                    placeholder="Mock Terminal Output (CSV, JSON, or Plaintext lines)" 
                    value={newTool.mockOutput}
                    onChange={e => setNewTool({...newTool, mockOutput: e.target.value})}
                    rows={4}
                    className="w-full bg-terminal-border/10 border border-terminal-border px-3 py-2 rounded text-xs font-mono focus:outline-none focus:border-terminal-accent text-white"
                 />
                 <button 
                  onClick={handleAddTool}
                  disabled={!newTool.id || !newTool.name || !newTool.mockOutput}
                  className="w-full flex justify-center items-center gap-2 bg-terminal-accent/10 border border-terminal-accent text-terminal-accent px-4 py-2 rounded font-bold text-xs hover:bg-terminal-accent hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   <Plus size={14} /> Add Tool Definition
                 </button>
               </div>
             </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
