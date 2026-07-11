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

function getOffsetDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getDefaultDb(): DatabaseSchema {
  const todayStr = getOffsetDate(0);
  const tomorrowStr = getOffsetDate(1);
  const plusTwoStr = getOffsetDate(2);
  const plusThreeStr = getOffsetDate(3);

  return {
    tasks: [
      {
        id: 'task-1',
        name: 'AI project',
        deadline: todayStr,
        deadlineTime: '12:00',
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
        name: 'AI Mini Project Development',
        deadline: plusTwoStr,
        deadlineTime: '15:00',
        duration: 60,
        priority: 'high',
        category: 'Design',
        difficulty: 'medium',
        energyRequired: 'high',
        notes: 'Preapare Presentation.',
        status: 'pending',
        createdAt: new Date().toISOString()
      },
      {
        id: 'task-3',
        name: 'Complete Machine Learning Assignment',
        deadline: tomorrowStr,
        deadlineTime: '18:00',
        duration: 90,
        priority: 'medium',
        category: 'Study',
        difficulty: 'hard',
        energyRequired: 'high',
        notes: 'supervised and unsupervised.',
        status: 'pending',
        createdAt: new Date().toISOString()
      },
      {
        id: 'task-4',
        name: 'Evening Cardio & Gym Session',
        deadline: todayStr,
        deadlineTime: '20:00',
        duration: 40,
        priority: 'low',
        category: 'Health',
        difficulty: 'easy',
        energyRequired: 'low',
        notes: 'Focus on heart-rate zones and active mental decompression.',
        status: 'pending',
        createdAt: new Date().toISOString()
      },
      {
        id: 'task-5',
        name: 'Study Data Structures',
        deadline: plusThreeStr,
        deadlineTime: '16:00',
        duration: 120,
        priority: 'medium',
        category: 'Study',
        difficulty: 'medium',
        energyRequired: 'medium',
        notes: 'Review graph algorithms and trees for upcoming quiz.',
        status: 'pending',
        createdAt: new Date().toISOString()
      }
    ],
    commitments: [
      {
        id: 'commit-1',
        title: 'College',
        date: todayStr,
        startTime: '09:00',
        endTime: '15:00',
        description: 'Attend college lectures.',
        colorTag: 'purple',
        createdAt: new Date().toISOString()
      },
      {
        id: 'commit-2',
        title: 'Dinner',
        date: todayStr,
        startTime: '20:00',
        endTime: '21:00',
        description: 'Have dinner with family.',
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
}

export function getDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const defaultDb = getDefaultDb();
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2), 'utf-8');
      return defaultDb;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data) as DatabaseSchema;
  } catch (error) {
    console.error('Database read failed, returning default:', error);
    return getDefaultDb();
  }
}

export function saveDb(db: DatabaseSchema): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {
    console.error('Database save failed:', error);
  }
}
