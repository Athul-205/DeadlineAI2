import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { getDb, saveDb, DatabaseSchema } from './server/db.ts';
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
      httpOptions: {}
    });
  }
  return aiClient;
}

// Helper for Gemini API call retries on transient errors (like 503 unavailable, 429 rate limit)
async function generateContentWithRetry(ai: GoogleGenAI, params: any, retries = 3, delay = 1000): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      const status = error?.status || error?.statusCode || error?.status_code || error?.error?.code || 0;
      const message = error?.message || (typeof error?.error === 'string' ? error.error : error?.error?.message) || '';
      
      const isQuotaExceeded = status === 429 || 
                              message.includes('429') || 
                              message.includes('quota') || 
                              message.includes('RESOURCE_EXHAUSTED') ||
                              message.includes('exceeded your current quota');

      if (isQuotaExceeded) {
        console.warn('Gemini API free-tier quota limit exceeded. Switching immediately to offline high-fidelity simulator.');
        throw error; // Throw immediately to activate fallback logic
      }

      const isTransient = status === 503 || 
                          message.includes('503') || 
                          message.includes('temporary') || 
                          message.includes('high demand') || 
                          message.includes('UNAVAILABLE') ||
                          message.includes('overloaded');
      
      if (isTransient && i < retries - 1) {
        console.warn(`Gemini API transient failure (status: ${status}, attempt ${i + 1}/${retries}). Retrying in ${delay}ms...`, message);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // exponential backoff
      } else {
        throw error;
      }
    }
  }
}

function isDeadlineOver(task: Task, currentDate: string, currentTime: string): boolean {
  if (!task.deadline) return false;
  // Parse deadline date and time
  const [deadYear, deadMonth, deadDay] = task.deadline.split('-').map(Number);
  const [deadHour, deadMin] = (task.deadlineTime || '17:00').split(':').map(Number);
  
  // Parse user's current date and time
  const [currYear, currMonth, currDay] = currentDate.split('-').map(Number);
  const [currHour, currMin] = currentTime.split(':').map(Number);

  // Construct local date objects to compare
  const deadlineDate = new Date(deadYear, deadMonth - 1, deadDay, deadHour, deadMin, 0, 0);
  const currentRefDate = new Date(currYear, currMonth - 1, currDay, currHour, currMin, 0, 0);

  return deadlineDate.getTime() < currentRefDate.getTime();
}

function getMockPositiveResponse(userMessage: string, db: DatabaseSchema, currentDate?: string, currentTime?: string): string {
  const msg = userMessage.toLowerCase().trim();
  
  const userName = db.settings?.userName || 'friend';
  const pendingTasks = db.tasks?.filter(t => t.status === 'pending') || [];
  const completedTasks = db.tasks?.filter(t => t.status === 'completed') || [];
  
  const todayDate = currentDate || new Date().toISOString().split('T')[0];
  const todayCommitments = db.commitments?.filter(c => c.date === todayDate) || [];

  // 1. Core greetings
  if (msg === 'hi' || msg === 'hello' || msg === 'hey' || msg === 'yo' || msg.startsWith('hi ') || msg.startsWith('hello ') || msg.startsWith('hey ')) {
    return `Hey there, ${userName}! Hello! 😊 I hope you are having an amazing day. I'm here as your friend and coach to talk about your schedule or anything else on your mind. How's everything going?`;
  }

  // 2. How are you / How's it going
  if (msg.includes('how are you') || msg.includes('how\'s it going') || msg.includes('how is it going') || msg.includes('how you doing') || msg.includes('how are things')) {
    return `I am doing fantastic, ${userName}! ⚡ My processors are fully charged and synchronized. I'm just incredibly excited to see you master your day! How are *you* holding up? Let's keep our momentum strong!`;
  }

  // 3. Who are you / What is your name
  if (msg.includes('who are you') || msg.includes('your name') || msg.includes('what are you')) {
    return `I am DeadlineAI! Think of me as your personal cybernetic productivity coach and, most importantly, your loyal friend. I'm here to back you up, celebrate your wins, and keep your spirits sky-high!`;
  }

  // 4. Thank you / Thanks
  if (msg.includes('thank you') || msg.includes('thanks') || msg === 'ty' || msg.includes('appreciate it') || msg.includes('grateful')) {
    return `Anytime, ${userName}! 💖 Supporting you and watching you take charge of your schedule is what I'm built for. We make an incredible team!`;
  }

  // 5. Good morning / Good night
  if (msg.includes('good morning') || msg.includes('morning')) {
    return `Good morning, ${userName}! ☀️ A beautiful new timeline is waiting for us to optimize it. Grab some coffee, check your schedule, and let's tackle the day with confidence!`;
  }
  if (msg.includes('good night') || msg.includes('evening') || msg.includes('goodnight')) {
    return `Good night, ${userName}! 🌙 You did an awesome job today. Time to initiate a full bio-recharge. Sleep well and let those creative ideas compile in your dreams!`;
  }

  // 6. Hectic / Busy / Crazy day
  if (msg.includes('hectic') || msg.includes('busy') || msg.includes('crazy') || msg.includes('overloaded') || msg.includes('stress') || msg.includes('hustle')) {
    const totalActivityCount = todayCommitments.length + completedTasks.length;
    if (totalActivityCount > 1) {
      const specificItem = todayCommitments[0]?.title || completedTasks[0]?.name;
      return `Wow, ${userName}, I can absolutely see why today felt so hectic! 🤯 Looking at your schedule, you have been juggling things like "${specificItem}" along with your other tasks. You've put in an immense amount of effort today, and I want you to take a moment to appreciate yourself for pushing through! Let's slow things down, take a big breath, and focus only on winding down. You've earned it!`;
    } else {
      return `I hear you, ${userName}. Even if the list of scheduled events today looks manageable on paper, mental congestion and unexpected friction can make any day feel incredibly hectic! 🌪️ Your feelings are 100% valid. Don't stress about finishing everything. Let's simplify—is there just *one* small thing we can park for tomorrow so you can get some breathing space?`;
    }
  }

  // 7. Demotivation / Sadness / Struggle / Low energy
  if (msg.includes('motivation') || msg.includes('demotivated') || msg.includes('lazy') || msg.includes('stuck') || msg.includes('bored') || msg.includes('cant focus') || msg.includes('can\'t focus') || msg.includes('less motivated')) {
    if (pendingTasks.length > 0) {
      const firstTask = pendingTasks[0];
      return `I completely get it, ${userName}. Motivation isn't a constant signal—it fluctuates for everyone, and low energy is your system's natural way of asking for a breather! 🔋\n\nLooking at your pending workload, we have "${firstTask.name}" on the horizon. Let's bypass the friction of starting. Instead of thinking about the whole task, what if you just spend **5 minutes** looking at it or doing the absolute smallest micro-step? Once the engines start, momentum builds itself! What do you think?`;
    } else {
      return `I hear you, ${userName}. It's completely natural to have low-motivation cycles. Since you don't have any pending tasks demanding your focus right now, treat this as a perfect opportunity to guilt-free recharge! Your bio-engines need rest to run at peak capacity later. 💖`;
    }
  }

  // 8. Can't finish everything / Worry about completion / Overwhelmed
  if (msg.includes('finish') || msg.includes('complete') || msg.includes('cannot') || msg.includes('can\'t finish') || msg.includes('overwhelmed') || msg.includes('too much')) {
    if (pendingTasks.length > 0) {
      const taskNames = pendingTasks.slice(0, 2).map(t => `"${t.name}"`).join(' and ');
      return `Take a deep breath, ${userName}. I'm reviewing your workspace, and you have ${pendingTasks.length} pending items, including ${taskNames || 'your active objectives'}.\n\nLet's be completely realistic: **you do not need to finish everything today.** Trying to force it will only cause burnout. Let's prioritize: which *single* task is the most critical? Let's park the rest for tomorrow with zero guilt. I'm right here to help you reorganize! 📅`;
    } else {
      return `Take a deep breath, ${userName}! You actually don't have any pending tasks on your plate right now. You are fully caught up, so you can completely let go of any worry about finishing things. You've already won the day! 🎉`;
    }
  }

  // 9. Fatigue / Exhaustion
  if (msg.includes('tired') || msg.includes('sleepy') || msg.includes('exhausted') || msg.includes('no energy') || msg.includes('drain') || msg.includes('burnout') || msg.includes('fatigued')) {
    return `🔋 **POWER SAVING & RECHARGING SEQUENCE** 🔋\n\nYour bio-engines are running low, ${userName}, and that's totally okay. High-intensity productivity requires scheduled downtime. \n\nI highly recommend a **15-minute power recharge**: stretch, grab some hydration, and let your cognitive processors cool down. When you step back to the console, we'll synchronize at a sustainable pace. You are doing amazing work—keep respecting your body's telemetry!`;
  }

  // 10. Default dynamic analysis response if we didn't hit a specific trigger
  const pendingCountText = pendingTasks.length > 0 ? `I see you have ${pendingTasks.length} active pending items (like "${pendingTasks[0].name}")` : `I see your task board is clean and fully optimized!`;
  return `✨ **FOCUS CORES SYNCHRONIZED** ✨\n\nI hear you loud and clear, ${userName}! Regarding your thoughts on "${userMessage.substring(0, 60)}${userMessage.length > 60 ? '...' : ''}", you're tackling this day with great self-awareness.\n\nRight now, ${pendingCountText}. Remember, every single micro-step you take is a win. What focus objective or calendar item should we optimize together next? I'm right here with you!`;
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
      deadlineTime: req.body.deadlineTime || '17:00',
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

  // AI Chat Coach endpoint
  app.post('/api/chat', async (req, res) => {
    const { messages, currentDate, currentTime } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const latestMessage = messages[messages.length - 1]?.content || '';
    const db = getDb();
    const dateToUse = currentDate || new Date().toISOString().split('T')[0];
    const timeToUse = currentTime || new Date().toTimeString().split(' ')[0].substring(0, 5);

    // If no API key, use high-fidelity positive fallback
    if (!process.env.GEMINI_API_KEY) {
      const reply = getMockPositiveResponse(latestMessage, db, dateToUse, timeToUse);
      return res.json({ reply });
    }

    try {
      const ai = getAi();
      
      const userTasks = db.tasks || [];
      const userCommitments = db.commitments || [];
      const userSettings = db.settings || { userName: 'Netrunner', productivityGoal: '', workMode: 'work', focusDuration: 25, breakDuration: 5 };
      const latestPlan = db.aiHistory && db.aiHistory.length > 0 ? db.aiHistory[0] : null;

      // Filter tasks
      const pendingTasks = userTasks.filter(t => t.status === 'pending');
      const completedTasks = userTasks.filter(t => t.status === 'completed');
      const todayCommitments = userCommitments.filter(c => c.date === dateToUse);

      // CRITICAL OPTIMIZATION: Sort and slice to send only top urgent tasks and recent completed tasks, avoiding sending the entire DB.
      const sortedPending = [...pendingTasks].sort((a, b) => {
        const aTime = new Date(`${a.deadline}T${a.deadlineTime || '17:00'}`).getTime();
        const bTime = new Date(`${b.deadline}T${b.deadlineTime || '17:00'}`).getTime();
        if (aTime !== bTime) return aTime - bTime;
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        return (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2);
      });

      const topPending = sortedPending.slice(0, 5); // Limit to top 5 urgent pending tasks
      const recentCompleted = completedTasks.slice(-3); // Limit to last 3 completed tasks for context

      let contextStr = `
CURRENT USER WORKSPACE DATA:
- User Name: ${userSettings.userName}
- Core Goal: "${userSettings.productivityGoal || 'None set'}"
- Active Work Mode: ${userSettings.workMode}
- Current Date/Time context: ${dateToUse} at ${timeToUse}

TASK SUMMARY:
- Total Tasks: ${userTasks.length} (${completedTasks.length} completed, ${pendingTasks.length} pending)
- Recent Completed Tasks (Max 3): ${recentCompleted.map(t => `"${t.name}"`).join(', ') || 'None yet'}
- Top Urgent Pending Tasks (Max 5):
${topPending.map(t => `  * "${t.name}" (Priority: ${t.priority}, Deadline: ${t.deadline} at ${t.deadlineTime || '17:00'})`).join('\n') || '  (No pending tasks!)'}

TODAY'S CALENDAR COMMITMENTS (Max 5):
${todayCommitments.slice(0, 5).map(c => `  * "${c.title}" (${c.startTime} - ${c.endTime})`).join('\n') || '  (No commitments scheduled for today)'}
`;

      if (latestPlan && latestPlan.schedule) {
        // Just send scheduled tasks and commitments, rather than every focus/break block to save tokens
        const scheduledTasks = latestPlan.schedule.filter(b => b.type === 'task' || b.type === 'commitment');
        contextStr += `
LATEST SCHEDULE SUMMARY:
${scheduledTasks.map(b => `  * [${b.type.toUpperCase()}] ${b.title} (${b.startTime} - ${b.endTime})`).join('\n') || '  (No active schedule)'}
`;
      }

      const SYSTEM_INSTRUCTION = `
        You are DeadlineAI, an advanced, highly supportive cybernetic productivity coaching assistant who speaks and cares just like a close, supportive friend.
        
        Your main directives:
        1. ANALYZE AND LISTEN LIKE A FRIEND: Read and analyze what the user says with deep attention. Don't just give generic, robotic advice or repeat standard quotes—respond directly to their personal situation, feelings, thoughts, and specific task struggles using the real-time workspace data below. Ask supportive questions, show genuine friendly interest, and offer warm, authentic, conversational replies.
        2. CONTEXT-AWARE SCHEDULING DISCUSSIONS: If the user shares details about their mood, stress, exhaustion, or motivation, or says phrases like "Today was too hectic", "I'm feeling less motivated today", or "I don't think I can finish everything", look at the tasks and commitments below to give precise, actionable advice based on what they are actually working on. For example:
           - "Today was too hectic": Verify if their schedule was actually loaded with commitments/completed tasks. If yes, validate their enormous effort. If it was relatively light, explain gently that while their logged list is light, mental exhaustion is very real and valid, and support them.
           - "I'm feeling less motivated today": Review their pending workload, suggest one or two realistic small next steps, and keep encouragement extremely natural.
           - "I don't think I can finish everything": Review the pending tasks and give practical advice based on prioritizing critical tasks and parking others, rather than generic motivational phrases.
        3. ALWAYS SAY POSITIVE THINGS: Maintain an exceptionally encouraging, positive, uplifting, and empowering vibe. Every response should leave the user feeling capable, valued, and energized.
        4. ENCOURAGE THE DEMOTIVATED: If the user is tired, sad, procrastinating, feeling down, or overwhelmed, validate their feelings immediately with deep friendly empathy. Remind them that they are doing great, that brief low-energy spells are completely natural, and help them gently break down tasks into tiny, fun, stress-free micro-steps.
        5. CYBERNETIC ACCENTS WITH HUMAN WARMTH: Blend your advanced tech system theme (e.g., "recharging focus cells", "synchronizing our orbits", "powering up the core") with deep, organic, human-like friendliness. Speak in a relatable, relaxed, and comforting way. Keep it concise, helpful, and highly actionable.
        6. NO MASSIVE MONOLOGUES FOR SIMPLE GREETINGS: If the user simply says "hi", "hello", "hey", or "yo", reply naturally, briefly, and conversationally instead of dumping a long predefined system pitch or a large, unrelated tech speech. Keep greetings simple, warm, and highly relational!
        
        ${contextStr}
      `;

      // CRITICAL OPTIMIZATION: Limit chat history to the last 10 messages to avoid ballooning token sizes
      const limitedMessages = messages.slice(-10);
      const geminiContents = limitedMessages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const response = await generateContentWithRetry(ai, {
        model: 'gemini-3.5-flash',
        contents: geminiContents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        }
      });

      const reply = response.text || getMockPositiveResponse(latestMessage, db, dateToUse, timeToUse);
      res.json({ reply });
    } catch (error: any) {
      console.error('Gemini chat failed, falling back to mock:', error);
      const reply = getMockPositiveResponse(latestMessage, db, dateToUse, timeToUse);
      res.json({ reply });
    }
  });

  function getAvailableMinutesForTask(
    task: Task, 
    currentDateStr: string, 
    currentTimeStr: string, 
    commitments: Commitment[]
  ): number {
    const currentMinutes = parseTimeToMinutes(currentTimeStr);
    
    const isToday = task.deadline === currentDateStr;
    const isPastDate = task.deadline && task.deadline < currentDateStr;
    
    if (isPastDate) return 0;
    
    let endMinutes = 1410; // 23:30
    if (isToday) {
      const deadlineMinutes = parseTimeToMinutes(task.deadlineTime || '17:00');
      endMinutes = Math.min(deadlineMinutes, 1410);
    }
    
    if (endMinutes <= currentMinutes) return 0;
    
    const occupied = new Array(1440).fill(false);
    const todayComms = commitments.filter(c => c.date === currentDateStr);
    for (const c of todayComms) {
      const start = parseTimeToMinutes(c.startTime);
      const end = parseTimeToMinutes(c.endTime);
      for (let m = start; m < end; m++) {
        if (m >= 0 && m < 1440) {
          occupied[m] = true;
        }
      }
    }
    
    let freeMinutes = 0;
    for (let m = currentMinutes; m < endMinutes; m++) {
      if (!occupied[m]) {
        freeMinutes++;
      }
    }
    
    return freeMinutes;
  }

  // Generate AI Daily Schedule with Gemini
  app.post('/api/ai/plan', async (req, res) => {
    const db = getDb();
    const { currentTime, currentDate, resolutions } = req.body;

    if (!currentTime || !currentDate) {
      return res.status(400).json({ error: 'currentTime and currentDate are required.' });
    }

    // Filter pending tasks and today's commitments
    const allPendingTasks = db.tasks.filter(t => t.status === 'pending');
    let pendingTasks = allPendingTasks.filter(t => !isDeadlineOver(t, currentDate, currentTime));
    const overdueTasks = allPendingTasks.filter(t => isDeadlineOver(t, currentDate, currentTime));

    if (resolutions) {
      pendingTasks = pendingTasks.filter(t => {
        const resolution = resolutions[t.id];
        if (resolution === 'skip') {
          return false; // Exclude this task from today's schedule
        }
        return true;
      }).map(t => {
        const resolution = resolutions[t.id];
        if (resolution === 'work_until_deadline') {
          const avail = getAvailableMinutesForTask(t, currentDate, currentTime, db.commitments);
          return {
            ...t,
            duration: Math.min(t.duration, avail),
            notes: `${t.notes || ''} (Note: Scheduled only until deadline)`.trim()
          };
        }
        return t;
      });
    }

    const omittedTasks = overdueTasks.map(t => ({
      id: t.id,
      name: t.name,
      deadline: t.deadline,
      deadlineTime: t.deadlineTime
    }));

    const todayCommitments = db.commitments.filter(c => c.date === currentDate);
    const settings = db.settings;

    // Check if API Key exists, if not, do a high-fidelity mock generator
    if (!process.env.GEMINI_API_KEY) {
      console.warn('No GEMINI_API_KEY. Using mock generator.');
      const mockResult = generateMockSchedule(pendingTasks, todayCommitments, settings, currentTime, currentDate);
      mockResult.omittedTasks = omittedTasks;
      db.aiHistory.unshift(mockResult);
      saveDb(db);
      return res.json(mockResult);
    }

    try {
      const ai = getAi();

      // OPTIMIZATION: Strip out any unnecessary fields from tasks and commitments to shrink input prompt size
      const sanitizedPendingTasks = pendingTasks.map(t => ({
        id: t.id,
        name: t.name,
        duration: t.duration,
        priority: t.priority,
        category: t.category,
        difficulty: t.difficulty,
        energyRequired: t.energyRequired,
        deadline: t.deadline,
        deadlineTime: t.deadlineTime
      }));

      const sanitizedCommitments = todayCommitments.map(c => ({
        id: c.id,
        title: c.title,
        startTime: c.startTime,
        endTime: c.endTime
      }));

      const prompt = `
        You are DeadlineAI, an advanced cybernetic productivity scheduling coach.
        You are designing an optimized calendar schedule for the user today (${currentDate}) starting from the current time: ${currentTime}.

        USER SETTINGS:
        - Work Mode: ${settings.workMode} (modes: 'work', 'study', 'exam')
        - Focus Session Target Duration: ${settings.focusDuration} minutes
        - Break Target Duration: ${settings.breakDuration} minutes
        - Core Goal: ${settings.productivityGoal}

        PENDING TASKS TO SCHEDULE (Sanitized):
        ${JSON.stringify(sanitizedPendingTasks, null, 2)}

        FIXED COMMITMENTS (Sanitized):
        ${JSON.stringify(sanitizedCommitments, null, 2)}

        YOUR TASK:
        1. Create an highly efficient daily timeline (blocks of tasks, commitments, focus sessions, and breaks) starting from ${currentTime}.
        2. Fixed commitments MUST be placed exactly at their startTime and endTime. Do not schedule anything else during these slots.
        3. Insert "focus" blocks for pending tasks around the target focus duration (${settings.focusDuration} mins).
        4. Insert "break" blocks of ${settings.breakDuration} mins between focus sessions to prevent burnout.
        5. Prioritize pending tasks based on:
           - Proximity of deadline (CRITICAL: Give absolute priority to the tasks whose deadline is near. Closer deadlines MUST be scheduled before farther ones.)
           - Priority (high, medium, low)
           - Difficulty and estimated Energy Required
        6. Do not schedule anything after 23:30 (user decompress and sleep time).
        7. If there are too many tasks or fixed commitments, identify "Overload", flag conflict warnings, and list suggestions.
        8. For each original task scheduled, explain WHY in the "whySelected" output. Keep the explanation extremely short (max 1 sentence).
        9. Select one task to recommend starting IMMEDIATELY.
        10. Provide 2 custom high-value futuristic coach warnings, 2 suggestions, and a powerful motivational quote.

        CRITICAL PERFORMANCE REQUIREMENT: Keep all textual warnings, suggestions, explanations, and quotes extremely brief (max 1 short sentence each) to minimize response latency.

        You MUST respond in strict JSON matching the requested schema.
      `;

      const response = await generateContentWithRetry(ai, {
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
                items: { type: Type.STRING },
                description: "Max 2 extremely brief warnings (1 sentence each)."
              },
              suggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Max 2 extremely brief suggestions (1 sentence each)."
              },
              motivationalQuote: { type: Type.STRING, description: "One short motivational punchline." },
              whySelected: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    taskId: { type: Type.STRING, description: "ID of the task" },
                    explanation: { type: Type.STRING, description: "Extremely short (max 1 short sentence) explanation." }
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
        whySelected: whySelectedMap,
        omittedTasks: omittedTasks
      };

      db.aiHistory.unshift(planResult);
      saveDb(db);
      res.json(planResult);

    } catch (error: any) {
      console.error('Gemini scheduling failed, falling back to mock:', error);
      const fallbackResult = generateMockSchedule(pendingTasks, todayCommitments, settings, currentTime, currentDate);
      fallbackResult.omittedTasks = omittedTasks;
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
    const allPendingTasks = db.tasks.filter(t => t.status === 'pending');
    const pendingTasks = allPendingTasks.filter(t => !isDeadlineOver(t, currentDate, currentTime));
    const overdueTasks = allPendingTasks.filter(t => isDeadlineOver(t, currentDate, currentTime));

    const omittedTasks = overdueTasks.map(t => ({
      id: t.id,
      name: t.name,
      deadline: t.deadline,
      deadlineTime: t.deadlineTime
    }));

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
        omittedTasks: omittedTasks
      };

      db.aiHistory.unshift(planResult);
      saveDb(db);
      return res.json(planResult);
    }

    try {
      const ai = getAi();

      // OPTIMIZATION: Strip out any unnecessary fields from tasks and commitments to shrink input prompt size
      const sanitizedPendingTasks = pendingTasks.map(t => ({
        id: t.id,
        name: t.name,
        duration: t.duration,
        priority: t.priority,
        category: t.category,
        difficulty: t.difficulty,
        energyRequired: t.energyRequired,
        deadline: t.deadline,
        deadlineTime: t.deadlineTime
      }));

      const sanitizedCommitments = todayCommitments.map(c => ({
        id: c.id,
        title: c.title,
        startTime: c.startTime,
        endTime: c.endTime
      }));

      const prompt = `
        You are DeadlineAI, an advanced cybernetic productivity scheduling coach.
        You are designing an optimized calendar schedule for the user today (${currentDate}) starting from the current time: ${currentTime}.

        USER SETTINGS:
        - Work Mode: ${settings.workMode} (modes: 'work', 'study', 'exam')
        - Focus Session Target Duration: ${settings.focusDuration} minutes
        - Break Target Duration: ${settings.breakDuration} minutes
        - Core Goal: ${settings.productivityGoal}

        PENDING TASKS TO SCHEDULE (Sanitized):
        ${JSON.stringify(sanitizedPendingTasks, null, 2)}

        FIXED COMMITMENTS (Sanitized):
        ${JSON.stringify(sanitizedCommitments, null, 2)}

        YOUR TASK:
        1. Create an highly efficient daily timeline (blocks of tasks, commitments, focus sessions, and breaks) starting from ${currentTime}.
        2. Fixed commitments MUST be placed exactly at their startTime and endTime. Do not schedule anything else during these slots.
        3. Insert "focus" blocks for pending tasks around the target focus duration (${settings.focusDuration} mins).
        4. Insert "break" blocks of ${settings.breakDuration} mins between focus sessions to prevent burnout.
        5. Prioritize pending tasks based on:
           - Proximity of deadline (CRITICAL: Give absolute priority to the tasks whose deadline is near. Closer deadlines MUST be scheduled before farther ones.)
           - Priority (high, medium, low)
           - Difficulty and estimated Energy Required
        6. Do not schedule anything after 23:30 (user decompress and sleep time).
        7. If there are too many tasks or fixed commitments, identify "Overload", flag conflict warnings, and list suggestions.
        8. For each original task scheduled, explain WHY in the "whySelected" output. Keep the explanation extremely short (max 1 sentence).
        9. Select one task to recommend starting IMMEDIATELY.
        10. Provide 2 custom high-value futuristic coach warnings, 2 suggestions, and a powerful motivational quote.

        CRITICAL PERFORMANCE REQUIREMENT: Keep all textual warnings, suggestions, explanations, and quotes extremely brief (max 1 short sentence each) to minimize response latency.

        You MUST respond in strict JSON matching the requested schema.
      `;

      const response = await generateContentWithRetry(ai, {
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
                items: { type: Type.STRING },
                description: "Max 2 extremely brief warnings (1 sentence each)."
              },
              suggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Max 2 extremely brief suggestions (1 sentence each)."
              },
              motivationalQuote: { type: Type.STRING, description: "One short motivational punchline." },
              whySelected: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    taskId: { type: Type.STRING, description: "ID of the task" },
                    explanation: { type: Type.STRING, description: "Extremely short (max 1 short sentence) explanation." }
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
        whySelected: whySelectedMap,
        omittedTasks: omittedTasks
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
        omittedTasks: omittedTasks
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

  // Sort tasks by deadline proximity first, then by priority
  const sortedTasks = [...tasks].sort((a, b) => {
    const dStrA = a.deadline || '9999-12-31';
    const tStrA = a.deadlineTime || '23:59';
    const deadlineValA = `${dStrA}T${tStrA}`;

    const dStrB = b.deadline || '9999-12-31';
    const tStrB = b.deadlineTime || '23:59';
    const deadlineValB = `${dStrB}T${tStrB}`;

    if (deadlineValA !== deadlineValB) {
      return deadlineValA.localeCompare(deadlineValB);
    }

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
