import fs from 'fs';
import path from 'path';
import { Task, Commitment, AIHistoryItem, UserSettings } from '../src/types.ts';

const DB_FILE = path.join(process.cwd(), 'db.json');

export interface DatabaseSchema {
  tasks: Task[];
  commitments: Commitment[];
  aiHistory: AIHistoryItem[];
  settings: UserSettings;
}

const DEFAULT_DB: DatabaseSchema = {
  tasks: [
    {
      id: 'task-1',
      name: 'Refactor DeadlineAI API Endpoints',
      deadline: '2026-06-30',
      duration: 45,
      priority: 'high',
      category: 'Work',
      difficulty: 'hard',
      energyRequired: 'high',
      notes: 'Clean up the route handlers and optimize JSON schema response formatting.',
      status: 'completed',
      createdAt: new Date().toISOString()
    },
    {
      id: 'task-2',
      name: 'Design Cyberpunk Dashboard UI',
      deadline: '2026-06-30',
      duration: 60,
      priority: 'high',
      category: 'Design',
      difficulty: 'medium',
      energyRequired: 'high',
      notes: 'Add glowing neon shadows, glassmorphism card styles, and premium transitions.',
      status: 'pending',
      createdAt: new Date().toISOString()
    },
    {
      id: 'task-3',
      name: 'Write Gemini Prompt Engineering Guide',
      deadline: '2026-07-01',
      duration: 90,
      priority: 'medium',
      category: 'Study',
      difficulty: 'hard',
      energyRequired: 'high',
      notes: 'Document structured JSON outputs and thinkingLevel parameters.',
      status: 'pending',
      createdAt: new Date().toISOString()
    },
    {
      id: 'task-4',
      name: 'Evening Cardio & Gym Session',
      deadline: '2026-06-30',
      duration: 40,
      priority: 'low',
      category: 'Health',
      difficulty: 'easy',
      energyRequired: 'low',
      notes: 'Focus on heart-rate zones and active mental decompression.',
      status: 'pending',
      createdAt: new Date().toISOString()
    }
  ],
  commitments: [
    {
      id: 'commit-1',
      title: 'Google AI Studio Mentoring Session',
      date: '2026-06-30',
      startTime: '10:00',
      endTime: '11:00',
      description: 'Discuss adaptive scheduling architecture and model choices with judges.',
      colorTag: 'purple',
      createdAt: new Date().toISOString()
    },
    {
      id: 'commit-2',
      title: 'DeadlineAI Hackathon Team Sync',
      date: '2026-06-30',
      startTime: '14:00',
      endTime: '14:45',
      description: 'Align design constraints, code modularization, and feature freezing.',
      colorTag: 'cyan',
      createdAt: new Date().toISOString()
    }
  ],
  aiHistory: [],
  settings: {
    userName: 'Netrunner',
    productivityGoal: 'Maximize focus blocks and prevent developer burnout',
    workMode: 'work',
    focusDuration: 25,
    breakDuration: 5
  }
};

export function getDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
      return DEFAULT_DB;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data) as DatabaseSchema;
  } catch (error) {
    console.error('Database read failed, returning default:', error);
    return DEFAULT_DB;
  }
}

export function saveDb(db: DatabaseSchema): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {
    console.error('Database save failed:', error);
  }
}
