
export interface Persona {
  name: string;
  description: string;
}

export interface AnalysisResult {
  trends: string[];
  characteristics: string[];
  personas: Persona[];
}
