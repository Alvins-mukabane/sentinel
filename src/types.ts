export enum AnalysisStatus {
  IDLE = 'IDLE',
  COLLECTING = 'COLLECTING',
  ANALYZING = 'ANALYZING',
  CRITIQUING = 'CRITIQUING',
  CORRECTING = 'CORRECTING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export type ToolID = string;

export interface ForensicResult {
  id?: string;
  title: string;
  evidence: string;
  confidence: number;
  tags: string[];
  feedback?: 'positive' | 'negative' | null;
}

export interface CustomTool {
  id: string;
  name: string;
  description: string;
  mockOutput: string;
}

export interface Critique {
  issues: string[];
  gaps: string[];
  suggestedTools: ToolID[];
  confidenceAdjustment: 'STABLE' | 'DECREASE' | 'INCREASE';
  isSatisfactory: boolean;
  nextSteps?: string;
}

export interface TraceLog {
  id: string;
  timestamp: string;
  step: AnalysisStatus;
  message: string;
  details?: any;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface ForensicReport {
  generatedAt: string;
  totalFindings: number;
  averageConfidence: number;
  findings: ForensicResult[];
  trace: TraceLog[];
  integrityHash: string;
}

export const ANALYSIS_CONFIG = {
  MIN_CONFIDENCE_THRESHOLD: 0.85,
  MAX_LOOP_ITERATIONS: 3,
};
