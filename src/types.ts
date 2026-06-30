export interface Task {
  id: string;
  name: string;
  deadline: string; // YYYY-MM-DD
  duration: number; // in minutes
  priority: 'low' | 'medium' | 'high';
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  energyRequired: 'low' | 'medium' | 'high';
  notes: string;
  status: 'pending' | 'completed' | 'missed';
  createdAt: string;
}

export interface Commitment {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  description: string;
  colorTag: 'purple' | 'violet' | 'blue' | 'cyan' | 'rose' | 'emerald';
  createdAt: string;
}

export interface AIHistoryItem {
  id: string;
  generatedAt: string;
  schedule: ScheduleBlock[];
  warnings: string[];
  suggestions: string[];
  motivationalQuote: string;
  whySelected: { [taskId: string]: string };
}

export interface ScheduleBlock {
  id: string;
  type: 'task' | 'commitment' | 'break' | 'focus';
  title: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  duration: number; // minutes
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  idRef?: string; // Reference to task ID or commitment ID
  notes?: string;
}

export interface UserSettings {
  userName: string;
  productivityGoal: string;
  workMode: 'work' | 'study' | 'exam';
  focusDuration: number;
  breakDuration: number;
}
