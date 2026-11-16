export interface ReplacementOption {
  value: string;
  shortDescription?: string;
}

export interface RuleCategory {
  id: string;
  name: string;
}

export interface RuleInfo {
  id: string;
  subId?: string;
  description: string;
  issueType: string;
  category: RuleCategory;
  urls?: { value: string }[];
}

export interface GrammarMatch {
  id: string;
  offset: number;
  length: number;
  originalText: string;
  message: string;
  shortMessage?: string;
  replacements: ReplacementOption[];
  rule: RuleInfo;
  sentence?: string;
  context?: {
    text: string;
    offset: number;
    length: number;
  };
}

export interface DocumentItem {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  createdAt: number;
  wordCount: number;
  charCount: number;
  issueCount: number;
}

export interface AppSettings {
  engineMode: 'public' | 'docker' | 'custom';
  customEndpoint: string;
  language: string;
  fontFamily: 'serif' | 'sans' | 'mono';
  fontSize: 'sm' | 'base' | 'lg';
  autoCheck: boolean;
  geminiApiKey?: string;
}
