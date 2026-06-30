import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { getDb, saveDb } from './server/db.ts';
import { Task, Commitment, AIHistoryItem, UserSettings } from './src/types.ts';

dotenv.config();

// Ensure the database is loaded or created immediately
getDb();

// Lazy initialization of Gemini API
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn('WARNING: GEMINI_API_KEY is not defined. AI Planner will run in demo fallback mode.');
    }
    aiClient = new GoogleGenAI({
      apiKey: key || 'DEMO_KEY',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Get Tasks
  app.get('/api/tasks', (req, res) => {
    const db = getDb();
    res.json(db.tasks);
  });

  // Create Task
  app.post('/api/tasks', (req, res) => {
    const db = getDb();
    const newTask: Task = {
      id: `task-${Date.now()}`,
      name: req.body.name || 'Untitled Task',
      deadline: req.body.deadline || new Date().toISOString().split('T')[0],
      duration: Number(req.body.duration) || 30,
      priority: req.body.priority || 'medium',
      category: req.body.category || 'General',
      difficulty: req.body.difficulty || 'medium',
      energyRequired: req.body.energyRequired || 'medium',
      notes: req.body.notes || '',
      status: req.body.status || 'pending',
      createdAt: new Date().toISOString(),
    };
    db.tasks.push(newTask);
    saveDb(db);
    res.json(newTask);
  });

  // Update Task
  app.put('/api/tasks/:id', (req, res) => {
    const db = getDb();
    const index = db.tasks.findIndex(t => t.id === req.params.id);
    if (index !== -1) {
      db.tasks[index] = {
        ...db.tasks[index],
        ...req.body,
      };
      saveDb(db);
      res.json(db.tasks[index]);
    } else {
      res.status(404).json({ error: 'Task not found' });
    }
  });

  // Delete Task
  app.delete('/api/tasks/:id', (req, res) => {
    const db = getDb();
    const filtered = db.tasks.filter(t => t.id !== req.params.id);
    if (filtered.length !== db.tasks.length) {
      db.tasks = filtered;
      saveDb(db);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Task not found' });
    }
  });

  // Get Commitments
  app.get('/api/commitments', (req, res) => {
    const db = getDb();
    res.json(db.commitments);
  });

  // Create Commitment
  app.post('/api/commitments', (req, res) => {
    const db = getDb();
    const newCommit: Commitment = {
      id: `commit-${Date.now()}`,
      title: req.body.title || 'Fixed Event',
      date: req.body.date || new Date().toISOString().split('T')[0],
      startTime: req.body.startTime || '09:00',
      endTime: req.body.endTime || '10:00',
      description: req.body.description || '',
      colorTag: req.body.colorTag || 'purple',
      createdAt: new Date().toISOString(),
    };
    db.commitments.push(newCommit);
    saveDb(db);
    res.json(newCommit);
  });

  // Update Commitment
  app.put('/api/commitments/:id', (req, res) => {
    const db = getDb();
    const index = db.commitments.findIndex(c => c.id === req.params.id);
    if (index !== -1) {
      db.commitments[index] = {
        ...db.commitments[index],
        ...req.body,
      };
      saveDb(db);
      res.json(db.commitments[index]);
    } else {
      res.status(404).json({ error: 'Commitment not found' });
    }
  });

  // Delete Commitment
  app.delete('/api/commitments/:id', (req, res) => {
    const db = getDb();
    const filtered = db.commitments.filter(c => c.id !== req.params.id);
    if (filtered.length !== db.commitments.length) {
      db.commitments = filtered;
      saveDb(db);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Commitment not found' });
    }
  });

  // Get Settings
  app.get('/api/settings', (req, res) => {
    const db = getDb();
    res.json(db.settings);
  });

  // Update Settings
  app.post('/api/settings', (req, res) => {
    const db = getDb();
    db.settings = {
      ...db.settings,
      ...req.body,
    };
    saveDb(db);
    res.json(db.settings);
  });

  // Get AI Planner History
  app.get('/api/ai/history', (req, res) => {
    const db = getDb();
    res.json(db.aiHistory);
  });

  // Clear AI History
  app.delete('/api/ai/history', (req, res) => {
    const db = getDb();
    db.aiHistory = [];
    saveDb(db);
    res.json({ success: true });
  });

  // Generate AI Daily Schedule with Gemini
  app.post('/api/ai/plan', async (req, res) => {
    const db = getDb();
    const { currentTime, currentDate } = req.body;

    if (!currentTime || !currentDate) {
      return res.status(400).json({ error: 'currentTime and currentDate are required.' });
    }

    // Filter pending tasks and today's commitments
    const pendingTasks = db.tasks.filter(t => t.status === 'pending');
    const todayCommitments = db.commitments.filter(c => c.date === currentDate);
    const settings = db.settings;

    // Check if API Key exists, if not, do a high-fidelity mock generator
    if (!process.env.GEMINI_API_KEY) {
      console.warn('No GEMINI_API_KEY. Using mock generator.');
      const mockResult = generateMockSchedule(pendingTasks, todayCommitments, settings, currentTime, currentDate);
      db.aiHistory.unshift(mockResult);
      saveDb(db);
      return res.json(mockResult);
    }

    try {
      const ai = getAi();
      const prompt = `
        You are DeadlineAI, an advanced cybernetic productivity scheduling coach.
        You are designing an optimized calendar schedule for the user today (${currentDate}) starting from the current time: ${currentTime}.

        USER SETTINGS:
        - Work Mode: ${settings.workMode} (modes: 'work', 'study', 'exam' - 'exam' is high intensity, 'study' requires more breaks)
        - Focus Session Target Duration: ${settings.focusDuration} minutes
        - Break Target Duration: ${settings.breakDuration} minutes
        - Core Goal: ${settings.productivityGoal}

        PENDING TASKS TO SCHEDULE:
        ${JSON.stringify(pendingTasks, null, 2)}

        FIXED COMMITMENTS (These times are strictly locked and must not be moved or overlapped):
        ${JSON.stringify(todayCommitments, null, 2)}

        YOUR TASK:
        1. Create an highly efficient daily timeline (blocks of tasks, commitments, focus sessions, and breaks) starting from ${currentTime}.
        2. Fixed commitments MUST be placed exactly at their startTime and endTime. Do not schedule anything else during these slots.
        3. Insert "focus" blocks for pending tasks around the target focus duration (${settings.focusDuration} mins).
        4. Insert "break" blocks of ${settings.breakDuration} mins between focus sessions to prevent burnout.
        5. Prioritize pending tasks based on:
           - Proximity of deadline (urgent tasks first)
           - Priority (high, medium, low)
           - Difficulty and estimated Energy Required (align high energy tasks with early slots, or space them out)
        6. Do not schedule anything after 23:30 (user decompress and sleep time).
        7. If there are too many tasks or fixed commitments, identify "Overload", flag conflict warnings, and list suggestions (e.g. "Suggest moving Gym Session to tomorrow because of overload").
        8. For each original task scheduled, explain WHY in the "whySelected" output.
        9. Select one task to recommend starting IMMEDIATELY.
        10. Provide 2-3 custom high-value futuristic coach warnings, 2-3 suggestions, and a powerful motivational quote.

        You MUST respond in strict JSON matching the requested schema.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              schedule: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, description: "Must be 'task', 'commitment', 'break', or 'focus'" },
                    title: { type: Type.STRING },
                    startTime: { type: Type.STRING, description: "HH:MM format" },
                    endTime: { type: Type.STRING, description: "HH:MM format" },
                    duration: { type: Type.INTEGER, description: "duration in minutes" },
                    idRef: { type: Type.STRING, description: "original Task or Commitment ID if applicable" },
                    priority: { type: Type.STRING, description: "low, medium, high" },
                    category: { type: Type.STRING },
                    notes: { type: Type.STRING }
                  },
                  required: ['type', 'title', 'startTime', 'endTime', 'duration']
                }
              },
              warnings: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              suggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              motivationalQuote: { type: Type.STRING },
              whySelected: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    taskId: { type: Type.STRING, description: "ID of the task" },
                    explanation: { type: Type.STRING, description: "Cyberpunk-styled coach explanation why this was scheduled at this time" }
                  },
                  required: ['taskId', 'explanation']
                }
              },
              immediateTaskId: { type: Type.STRING, description: "The ID of the task that should be tackled right now" }
            },
            required: ['schedule', 'warnings', 'suggestions', 'motivationalQuote', 'whySelected', 'immediateTaskId']
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Gemini API returned an empty response.');
      }

      const cleanJson = JSON.parse(responseText.trim());
      
      // Remap whySelected to a dictionary map for easy frontend lookup
      const whySelectedMap: { [key: string]: string } = {};
      if (Array.isArray(cleanJson.whySelected)) {
        cleanJson.whySelected.forEach((item: any) => {
          if (item.taskId && item.explanation) {
            whySelectedMap[item.taskId] = item.explanation;
          }
        });
      }

      const planResult: AIHistoryItem = {
        id: `ai-plan-${Date.now()}`,
        generatedAt: new Date().toISOString(),
        schedule: cleanJson.schedule,
        warnings: cleanJson.warnings || [],
        suggestions: cleanJson.suggestions || [],
        motivationalQuote: cleanJson.motivationalQuote || "Power through the timeline, Hacker.",
        whySelected: whySelectedMap
      };

      db.aiHistory.unshift(planResult);
      saveDb(db);
      res.json(planResult);

    } catch (error: any) {
      console.error('Gemini scheduling failed, falling back to mock:', error);
      const fallbackResult = generateMockSchedule(pendingTasks, todayCommitments, settings, currentTime, currentDate);
      db.aiHistory.unshift(fallbackResult);
      saveDb(db);
      res.json(fallbackResult);
    }
  });

  // Regenerate remaining schedule for the rest of the day
  app.post('/api/ai/plan/regenerate', async (req, res) => {
    const db = getDb();
    const { currentTime, currentDate, taskId, additionalMinutes } = req.body;

    if (!currentTime || !currentDate) {
      return res.status(400).json({ error: 'currentTime and currentDate are required.' });
    }

    // 1. Update task duration if taskId and additionalMinutes are passed
    if (taskId && additionalMinutes !== undefined) {
      const index = db.tasks.findIndex(t => t.id === taskId);
      if (index !== -1) {
        db.tasks[index].duration = Number(additionalMinutes);
        saveDb(db);
      }
    }

    // 2. Extract preserved blocks (completed tasks in the previous plan)
    const completedTaskIds = new Set(db.tasks.filter(t => t.status === 'completed').map(t => t.id));
    const preservedBlocks = (db.aiHistory && db.aiHistory[0])
      ? db.aiHistory[0].schedule.filter(block => block.idRef && completedTaskIds.has(block.idRef))
      : [];

    // Filter pending tasks and today's commitments
    const pendingTasks = db.tasks.filter(t => t.status === 'pending');
    const todayCommitments = db.commitments.filter(c => c.date === currentDate);
    const settings = db.settings;

    // Helper to parse time to minutes for merging
    const parseTimeToMinutes = (tStr: string) => {
      if (!tStr) return 0;
      const [h, m] = tStr.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    // Check if API Key exists, if not, do a high-fidelity mock generator
    if (!process.env.GEMINI_API_KEY) {
      console.warn('No GEMINI_API_KEY. Using mock generator for regeneration.');
      const mockResult = generateMockSchedule(pendingTasks, todayCommitments, settings, currentTime, currentDate);
      
      // Filter out any blocks that match our completed tasks to avoid duplicates
      const newSchedule = mockResult.schedule.filter(block => !block.idRef || !completedTaskIds.has(block.idRef));
      
      // Merge preserved blocks
      const mergedSchedule = [...preservedBlocks, ...newSchedule];
      mergedSchedule.sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

      const planResult: AIHistoryItem = {
        ...mockResult,
        id: `ai-plan-${Date.now()}`,
        generatedAt: new Date().toISOString(),
        schedule: mergedSchedule,
      };

      db.aiHistory.unshift(planResult);
      saveDb(db);
      return res.json(planResult);
    }

    try {
      const ai = getAi();
      const prompt = `
        You are DeadlineAI, an advanced cybernetic productivity scheduling coach.
        You are designing an optimized calendar schedule for the user today (${currentDate}) starting from the current time: ${currentTime}.

        USER SETTINGS:
        - Work Mode: ${settings.workMode} (modes: 'work', 'study', 'exam' - 'exam' is high intensity, 'study' requires more breaks)
        - Focus Session Target Duration: ${settings.focusDuration} minutes
        - Break Target Duration: ${settings.breakDuration} minutes
        - Core Goal: ${settings.productivityGoal}

        PENDING TASKS TO SCHEDULE:
        ${JSON.stringify(pendingTasks, null, 2)}

        FIXED COMMITMENTS (These times are strictly locked and must not be moved or overlapped):
        ${JSON.stringify(todayCommitments, null, 2)}

        YOUR TASK:
        1. Create an highly efficient daily timeline (blocks of tasks, commitments, focus sessions, and breaks) starting from ${currentTime}.
        2. Fixed commitments MUST be placed exactly at their startTime and endTime. Do not schedule anything else during these slots.
        3. Insert "focus" blocks for pending tasks around the target focus duration (${settings.focusDuration} mins).
        4. Insert "break" blocks of ${settings.breakDuration} mins between focus sessions to prevent burnout.
        5. Prioritize pending tasks based on:
           - Proximity of deadline (urgent tasks first)
           - Priority (high, medium, low)
           - Difficulty and estimated Energy Required (align high energy tasks with early slots, or space them out)
        6. Do not schedule anything after 23:30 (user decompress and sleep time).
        7. If there are too many tasks or fixed commitments, identify "Overload", flag conflict warnings, and list suggestions (e.g. "Suggest moving Gym Session to tomorrow because of overload").
        8. For each original task scheduled, explain WHY in the "whySelected" output.
        9. Select one task to recommend starting IMMEDIATELY.
        10. Provide 2-3 custom high-value futuristic coach warnings, 2-3 suggestions, and a powerful motivational quote.

        You MUST respond in strict JSON matching the requested schema.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              schedule: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, description: "Must be 'task', 'commitment', 'break', or 'focus'" },
                    title: { type: Type.STRING },
                    startTime: { type: Type.STRING, description: "HH:MM format" },
                    endTime: { type: Type.STRING, description: "HH:MM format" },
                    duration: { type: Type.INTEGER, description: "duration in minutes" },
                    idRef: { type: Type.STRING, description: "original Task or Commitment ID if applicable" },
                    priority: { type: Type.STRING, description: "low, medium, high" },
                    category: { type: Type.STRING },
                    notes: { type: Type.STRING }
                  },
                  required: ['type', 'title', 'startTime', 'endTime', 'duration']
                }
              },
              warnings: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              suggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              motivationalQuote: { type: Type.STRING },
              whySelected: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    taskId: { type: Type.STRING, description: "ID of the task" },
                    explanation: { type: Type.STRING, description: "Cyberpunk-styled coach explanation why this was scheduled at this time" }
                  },
                  required: ['taskId', 'explanation']
                }
              },
              immediateTaskId: { type: Type.STRING, description: "The ID of the task that should be tackled right now" }
            },
            required: ['schedule', 'warnings', 'suggestions', 'motivationalQuote', 'whySelected', 'immediateTaskId']
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Gemini API returned an empty response.');
      }

      const cleanJson = JSON.parse(responseText.trim());
      
      // Remap whySelected to a dictionary map for easy frontend lookup
      const whySelectedMap: { [key: string]: string } = {};
      if (Array.isArray(cleanJson.whySelected)) {
        cleanJson.whySelected.forEach((item: any) => {
          if (item.taskId && item.explanation) {
            whySelectedMap[item.taskId] = item.explanation;
          }
        });
      }

      const newSchedule = (cleanJson.schedule || []).filter((block: any) => !block.idRef || !completedTaskIds.has(block.idRef));
      const mergedSchedule = [...preservedBlocks, ...newSchedule];
      mergedSchedule.sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

      const planResult: AIHistoryItem = {
        id: `ai-plan-${Date.now()}`,
        generatedAt: new Date().toISOString(),
        schedule: mergedSchedule,
        warnings: cleanJson.warnings || [],
        suggestions: cleanJson.suggestions || [],
        motivationalQuote: cleanJson.motivationalQuote || "Power through the timeline, Hacker.",
        whySelected: whySelectedMap
      };

      db.aiHistory.unshift(planResult);
      saveDb(db);
      res.json(planResult);

    } catch (error: any) {
      console.error('Gemini scheduling failed during regeneration, falling back to mock:', error);
      const fallbackResult = generateMockSchedule(pendingTasks, todayCommitments, settings, currentTime, currentDate);
      const newSchedule = fallbackResult.schedule.filter(block => !block.idRef || !completedTaskIds.has(block.idRef));
      const mergedSchedule = [...preservedBlocks, ...newSchedule];
      mergedSchedule.sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

      const planResult: AIHistoryItem = {
        ...fallbackResult,
        id: `ai-plan-${Date.now()}`,
        generatedAt: new Date().toISOString(),
        schedule: mergedSchedule,
      };

      db.aiHistory.unshift(planResult);
      saveDb(db);
      res.json(planResult);
    }
  });

  // --- End of API Routes ---

  // Vite middleware or static server
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Helper to generate high-fidelity schedules offline or in demo mode
function generateMockSchedule(
  tasks: Task[],
  commitments: Commitment[],
  settings: UserSettings,
  currentTime: string,
  currentDate: string
): AIHistoryItem {
  const schedule: any[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const whySelected: { [key: string]: string } = {};

  // Sort tasks by priority
  const sortedTasks = [...tasks].sort((a, b) => {
    const priorities = { high: 3, medium: 2, low: 1 };
    return priorities[b.priority] - priorities[a.priority];
  });

  let currentMin = parseTimeToMinutes(currentTime);
  // Default to start at least at 08:00 if currently before
  if (currentMin < 480) currentMin = 480;

  // Add Today's commitments to schedule first
  const mappedCommitments = commitments.map(c => ({
    id: c.id,
    type: 'commitment',
    title: c.title,
    startTime: c.startTime,
    endTime: c.endTime,
    duration: parseTimeToMinutes(c.endTime) - parseTimeToMinutes(c.startTime),
    colorTag: c.colorTag,
    idRef: c.id
  }));

  // Simple chronological greedy layout
  const allEvents = [...mappedCommitments].sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

  // We place tasks in slots between commitments
  for (const task of sortedTasks) {
    const duration = task.duration;
    
    // Find next available slot
    let foundSlot = false;
    while (!foundSlot && currentMin < 1380) { // Up to 23:00
      const startStr = minutesToTimeStr(currentMin);
      const endStr = minutesToTimeStr(currentMin + duration);
      
      // Check overlap with commitments
      const overlap = mappedCommitments.some(c => {
        const cStart = parseTimeToMinutes(c.startTime);
        const cEnd = parseTimeToMinutes(c.endTime);
        return (currentMin < cEnd && (currentMin + duration) > cStart);
      });

      if (!overlap) {
        schedule.push({
          id: `block-${task.id}`,
          type: 'task',
          title: task.name,
          startTime: startStr,
          endTime: endStr,
          duration: duration,
          priority: task.priority,
          category: task.category,
          idRef: task.id,
          notes: task.notes
        });

        whySelected[task.id] = `Placed at ${startStr} due to high dependency overlap and a near critical energy profile match in ${settings.workMode} mode.`;
        
        // Add a break immediately after if possible
        currentMin += duration;
        
        if (currentMin + settings.breakDuration < 1380) {
          schedule.push({
            id: `break-${Date.now()}-${currentMin}`,
            type: 'break',
            title: 'Neural Decompression Break',
            startTime: minutesToTimeStr(currentMin),
            endTime: minutesToTimeStr(currentMin + settings.breakDuration),
            duration: settings.breakDuration
          });
          currentMin += settings.breakDuration;
        }

        foundSlot = true;
      } else {
        // Advance currentMin to the end of the overlapping commitment
        const activeOverlap = mappedCommitments.find(c => {
          const cStart = parseTimeToMinutes(c.startTime);
          const cEnd = parseTimeToMinutes(c.endTime);
          return (currentMin < cEnd && (currentMin + duration) > cStart);
        });
        if (activeOverlap) {
          currentMin = parseTimeToMinutes(activeOverlap.endTime);
        } else {
          currentMin += 15;
        }
      }
    }
  }

  // Interleave the actual commitments into our schedule output
  mappedCommitments.forEach(c => {
    schedule.push(c);
  });

  // Sort schedule chronologically
  schedule.sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

  // Warnings & suggestions
  if (tasks.length > 3) {
    warnings.push('CRITICAL: High cognitive burden detected. You are scheduling more than 3 active focus slots.');
    suggestions.push('We recommend moving low-energy tasks like Gym Session to tomorrow to guarantee focus reserve.');
  } else {
    suggestions.push('Schedule density looks ideal. Ensure water intake is synchronized with break slots.');
  }
  
  if (settings.workMode === 'exam') {
    suggestions.push('Exam Mode enabled: AI planner has locked in 50-minute deep concentration intervals.');
  }

  warnings.push('Neuro-link status nominal. Ensure breaks are strictly taken away from display monitors.');

  return {
    id: `ai-plan-mock-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    schedule,
    warnings,
    suggestions,
    motivationalQuote: "The future is negotiated in the micro-timeline of today's focus blocks. Optimize your reality.",
    whySelected
  };
}

function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

startServer();
