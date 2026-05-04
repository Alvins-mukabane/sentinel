import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisStatus, ForensicResult, Critique, CustomTool } from "../types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '' });

// We define our MCP tools here. Note they do not contain mock Output anymore.
// We proxy the execution to the backend structure endpoints.
let MOCK_FORENSIC_DATABASE: Record<string, CustomTool> = {
  'analyze_sentry_trace': {
    id: 'analyze_sentry_trace',
    name: 'Analyze Sentry Traces',
    description: 'Fetches recent Sentry error logs to identify application crashes, stack traces, user impact, affected versions, and breadcrumbs.',
    mockOutput: '' // Removed, comes from API
  },
  'analyze_github_workflow': {
    id: 'analyze_github_workflow',
    name: 'Analyze GitHub Workflows',
    description: 'Fetches failed GitHub Actions workflows to identify CI/CD and deployment issues.',
    mockOutput: '' 
  },
  'analyze_github_commits': {
    id: 'analyze_github_commits',
    name: 'Analyze GitHub Commits',
    description: 'Analyzes GitHub commit history, focusing on recent commits to provide context for incident analysis.',
    mockOutput: ''
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
   * Option 2 Implementation: Simulates MCP structural execution calling explicit endpoints
   */
  static async executeTool(toolId: string): Promise<string> {
    try {
      const token = localStorage.getItem('siem_token') || '';
      const response = await fetch(`/api/mcp/${toolId}`, {
         method: 'POST',
         headers: { 
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${token}`
         },
         body: JSON.stringify({})
      });
      if (!response.ok) {
         return `Error: API returned ${response.status} for tool ${toolId}`;
      }
      const data = await response.json();
      return JSON.stringify(data, null, 2);
    } catch (e) {
      console.error(e);
      return `Error executing tool ${toolId}`;
    }
  }

  /**
   * Phase 1: Analyzer - Generates initial findings
   */
  static async analyzeEvidence(toolOutputs: string[]): Promise<ForensicResult[]> {
    const prompt = `You are an AI DevOps/SIEM Analyzer Engine.
Analyze the following tool outputs containing GitHub Actions and Sentry Webhook logs.
Extract critical crashes, CI/CD pipeline failures, and deployment issues.
Structure your findings as a list of independent incident facts.

TOOL OUTPUTS:
${toolOutputs.join('\n\n---\n\n')}

Validation Checklist:
- Correlate Sentry errors to specific GitHub deployments if timestamps align.
- Highlight fatal errors or pipeline failures that need immediate attention.
- Group related error entries.`;

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

    const prompt = `You are a Senior DevOps Critic Engine.
Evaluate the following incident response findings against formal validation rules for SIEM pipelines.

KNOWLEDGE BASE:
- Common Attack Vectors: Dependency confusion, exposed .env files, SQL injection, RCE via payload.
- Known Malware indicators: Obfuscated bash scripts, unknown outbound connections, sudden privilege escalation.
- Common Webhook patterns: Memory exhaustion usually follows a flood of 500 errors.

VALIDATION RULES:
1. ERROR CORRELATION: Sentry crashes must be evaluated for corresponding CI/CD events or recent commits.
2. TEMPORAL CONSISTENCY: Timestamps for deployments vs errors must align closely.
3. CONFIDENCE THRESHOLD: Any finding with confidence < 0.8 MUST be flagged for re-analysis or refinement as it does not meet the minimum threshold for inclusion in the final report.
4. THREAT INTEL / SECURITY: Query the KNOWLEDGE BASE to identify anomalies or missing corroborating evidence in the findings. Look for suspicious IPs or exploit attempts.

FINDINGS:
${JSON.stringify(findings, null, 2)}

TOOLS ALREADY RUN: ${currentToolsRun.join(', ')}

AVAILABLE TOOLS TO FILL GAPS:
${availableToolsList}

YOUR TASK:
- If a finding's confidence < 0.8, explicitly flag it and suggest tools or refinement.
- If a finding lacks sufficient detail or misses information from the KNOWLEDGE BASE, identify it.
- SUGGEST only tools NOT in the 'TOOLS ALREADY RUN' list unless a re-run is critical.
- Recommend 'analyze_github_commits' if there is a Sentry error but no corresponding pipeline failure identified.`;

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
