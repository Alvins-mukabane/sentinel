import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisStatus, ForensicResult, Critique, CustomTool } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Global Mock Forensic Database
let MOCK_FORENSIC_DATABASE: Record<string, CustomTool> = {
  'process_list': {
    id: 'process_list',
    name: 'Process List',
    description: 'Use for mapping PIDs to executable paths and names.',
    mockOutput: `PID: 432 | Name: svchost.exe | User: SYSTEM | Path: C:\\Windows\\System32\\svchost.exe
PID: 2190 | Name: chrome.exe | User: Admin | Path: C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe
PID: 8812 | Name: updater.exe | User: Admin | Path: C:\\Users\\Admin\\AppData\\Local\\Temp\\updater.exe
PID: 9001 | Name: winlogon.exe | User: SYSTEM | Path: C:\\Windows\\System32\\winlogon.exe`
  },
  'network_conns': {
    id: 'network_conns',
    name: 'Network Connections',
    description: 'Use for identifying which PIDs are calling external IPs.',
    mockOutput: `TCP | local: 192.168.1.15:44321 | remote: 45.33.21.144:80 | ESTABLISHED | PID: 8812
TCP | local: 192.168.1.15:135 | remote: 0.0.0.0:0 | LISTENING | PID: 432`
  },
  'file_timeline': {
    id: 'file_timeline',
    name: 'File Timeline',
    description: 'Use for deep temporal analysis of file modifications.',
    mockOutput: `2026-05-01 14:22:01 | Created | C:\\Users\\Admin\\AppData\\Local\\Temp\\updater.exe
2026-05-01 14:23:15 | Modified | C:\\Windows\\System32\\drivers\\etc\\hosts
2026-05-01 14:25:00 | Deleted | C:\\Users\\Admin\\AppData\\Local\\Temp\\setup_log.txt`
  },
  'registry_keys': {
    id: 'registry_keys',
    name: 'Registry Keys',
    description: 'Use for verifying persistence (Run keys, etc).',
    mockOutput: `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run | Name: SysUpdater | Value: C:\\Users\\Admin\\AppData\\Local\\Temp\\updater.exe`
  },
  'threat_intel': {
    id: 'threat_intel',
    name: 'External Threat Intel Feed',
    description: 'Use to enrich IPs or Hashes with known malicious indicators.',
    mockOutput: `INTEL RECORD: IP 45.33.21.144 | Category: C2 Server | Confidence: HIGH | Known Actor: APT29
INTEL RECORD: File updater.exe | Hash: 8d3b2... | Category: Trojan Drop | Confidence: HIGH`
  }
};

export class GeminiService {
  static getTools(): CustomTool[] {
    return Object.values(MOCK_FORENSIC_DATABASE);
  }

  static addTool(tool: CustomTool) {
    MOCK_FORENSIC_DATABASE[tool.id] = tool;
  }

  /**
   * Simulates running a forensic tool (SIFT/MCP style)
   */
  static async executeTool(toolId: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 1500));
    const tool = MOCK_FORENSIC_DATABASE[toolId];
    return tool ? tool.mockOutput : "Error: Tool output empty or tool not found.";
  }

  /**
   * Phase 1: Analyzer - Generates initial findings
   */
  static async analyzeEvidence(toolOutputs: string[]): Promise<ForensicResult[]> {
    const prompt = `You are a Forensic Analyzer Engine.
Analyze the following tool outputs and extract suspended or malicious activity.
Structure your findings as a list of independent forensic facts.

TOOL OUTPUTS:
${toolOutputs.join('\n\n---\n\n')}

Validation Checklist (Initial):
- Identify unique artifacts (Files, IPs, PIDs).
- Link artifacts to timestamps where possible.
- Group related entries.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              evidence: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['title', 'evidence', 'confidence', 'tags']
          }
        }
      }
    });

    try {
      return JSON.parse(response.text || '[]');
    } catch (e) {
      console.error("Failed to parse analysis response", e);
      return [];
    }
  }

  /**
   * Phase 2: Critic - Evaluates findings for gaps, errors, or hallucinations
   * Using formal validation rules and tool-gap mapping.
   */
  static async critiqueFindings(findings: ForensicResult[], currentToolsRun: string[]): Promise<Critique> {
    const availableToolsList = Object.values(MOCK_FORENSIC_DATABASE)
      .map(t => `- '${t.id}': ${t.description}`)
      .join('\n');

    const prompt = `You are a Senior Forensic Critic Engine.
Evaluate the following incident response findings against formal validation rules.

VALIDATION RULES:
1. PROCESS CORRELATION: Any file activity (Write/Modify) or network activity MUST be linked to a specific Process ID (PID).
2. TEMPORAL CONSISTENCY: Timestamps for a single operation (e.g. file creation) must align across different logs (Timeline vs Registry).
3. SOURCE VERIFICATION: Registry persistence claims must be backed by registry dump artifacts.
4. CONFIDENCE THRESHOLD: Any finding with confidence < 0.85 must be flagged for re-analysis or more evidence.
5. THREAT INTEL: Suspicious IPs or unknown processes should be cross-referenced with threat intelligence if the tool is available.

FINDINGS:
${JSON.stringify(findings, null, 2)}

TOOLS ALREADY RUN: ${currentToolsRun.join(', ')}

AVAILABLE TOOLS TO FILL GAPS:
${availableToolsList}

YOUR TASK:
- If a finding lacks PID correlation, identify 'process_list' as a gap.
- If a finding involves 'updater.exe' but lacks a registry check, identify 'registry_keys' as a gap.
- If finding confidence is low, identify issues.
- SUGGEST only tools NOT in the 'TOOLS ALREADY RUN' list unless a re-run is critical.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            issues: { type: Type.ARRAY, items: { type: Type.STRING } },
            gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedTools: { type: Type.ARRAY, items: { type: Type.STRING } },
            confidenceAdjustment: { type: Type.STRING, enum: ['STABLE', 'DECREASE', 'INCREASE'] },
            isSatisfactory: { type: Type.BOOLEAN },
            nextSteps: { type: Type.STRING }
          },
          required: ['issues', 'gaps', 'suggestedTools', 'confidenceAdjustment', 'isSatisfactory']
        }
      }
    });

    try {
      return JSON.parse(response.text || '{}');
    } catch (e) {
      console.error("Failed to parse critique response", e);
      return { issues: [], gaps: [], suggestedTools: [], confidenceAdjustment: 'STABLE', isSatisfactory: true };
    }
  }

  /**
   * Phase 3: Correct - Merges critique into final findings
   */
  static async correctFindings(originalFindings: ForensicResult[], critique: Critique, additionalEvidence?: string[]): Promise<ForensicResult[]> {
    const prompt = `You are the Sentinel Loop Correction Engine.
Refine the findings based on the critique and newly acquired evidence.

ORIGINAL FINDINGS:
${JSON.stringify(originalFindings, null, 2)}

CRITIQUE:
${JSON.stringify(critique, null, 2)}

NEW EVIDENCE:
${additionalEvidence?.join('\n\n---\n\n') || 'No additional evidence.'}

Rules:
1. Fix errors identified by the critic.
2. Incorporate new evidence to fill gaps.
3. Update confidence levels.
4. Produce the FINAL, VERIFIED forensic findings.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              evidence: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['title', 'evidence', 'confidence', 'tags']
          }
        }
      }
    });

    try {
      return JSON.parse(response.text || '[]');
    } catch (e) {
      console.error("Failed to parse correction response", e);
      return originalFindings;
    }
  }
}
