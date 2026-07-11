import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  BrainCircuit,
  Plus,
  Trash2,
  Sparkles,
  Search,
  Filter,
  Check,
  Zap,
  BookOpen,
  Trophy,
  Flame,
  Award,
  Hourglass,
  Sliders,
  Play,
  RotateCcw,
  ExternalLink,
  PlusCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Info,
  Edit2,
  Menu,
  Send,
  MessageSquare,
  Bot,
  Heart,
  AlertTriangle
} from 'lucide-react';

import Sidebar from './components/Sidebar';
import NotificationToast, { Toast, ToastType } from './components/NotificationToast';
import { Task, Commitment, AIHistoryItem, UserSettings, ScheduleBlock } from './types';

// Recharts components for beautiful analytics
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const PRODUCTIVITY_QUOTES = [
  "The future belongs to those who control their micro-timelines. Optimize yours now.",
  "Your concentration is the ultimate currency of the digital age. Protect it.",
  "Do not react to deadlines. Let adaptive intelligence navigate your schedule.",
  "A perfect timeline is built one deep focus block at a time.",
  "Burnout is a state-space optimization error. Trust the AI recommendation and rest.",
  "Your cognitive potential is directly proportional to your structured break duration."
];

const formatTimeTo12Hour = (timeStr: string | undefined | null): string => {
  if (!timeStr) return '';
  const clean = timeStr.trim();
  if (/am|pm/i.test(clean)) {
    return clean;
  }
  
  const parts = clean.split(':');
  if (parts.length < 2) return clean;
  
  let hours = parseInt(parts[0], 10);
  const minutesStr = parts[1];
  
  if (isNaN(hours)) return clean;
  
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  
  const minutes = minutesStr.padStart(2, '0');
  
  return `${hours}:${minutes} ${ampm}`;
};

const parse24To12 = (time24: string) => {
  const parts = (time24 || '10:00').split(':');
  let h = parseInt(parts[0], 10);
  let m = parseInt(parts[1], 10);
  if (isNaN(h)) h = 10;
  if (isNaN(m)) m = 0;
  
  const ampm: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  let hour12 = h % 12;
  if (hour12 === 0) hour12 = 12;
  
  return { hour: hour12, minute: m, ampm };
};

const format12To24 = (hour: number, minute: number, ampm: 'AM' | 'PM') => {
  let h = hour;
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  
  const hStr = h.toString().padStart(2, '0');
  const mStr = minute.toString().padStart(2, '0');
  return `${hStr}:${mStr}`;
};

const timeToMinutes = (tStr: string): number => {
  if (!tStr) return 0;
  const [h, m] = tStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const formatFriendlyDuration = (minutes: number): string => {
  if (minutes <= 0) return '0 mins';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins} mins`;
  if (mins === 0) return `${hrs} hour${hrs === 1 ? '' : 's'}`;
  if (mins === 30) return `${hrs}.5 hours`;
  return `${hrs}h ${mins}m`;
};

const getFriendlyDeadline = (task: Task, currentDateStr: string) => {
  const formattedTime = formatTimeTo12Hour(task.deadlineTime || '17:00');
  if (task.deadline === currentDateStr) {
    return `Today at ${formattedTime}`;
  }
  const d = new Date(`${task.deadline}T00:00:00`);
  if (isNaN(d.getTime())) return `${task.deadline} at ${formattedTime}`;
  const datePart = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${datePart} at ${formattedTime}`;
};

const getContextualExplanation = (task: Task, probability: number, availableTime: number) => {
  if (probability >= 80) {
    return `Excellent outlook. You have plenty of free time (${formatFriendlyDuration(availableTime)}) relative to the required ${formatFriendlyDuration(task.duration)}. Keep up the pace!`;
  } else if (probability >= 50) {
    return `Moderate outlook. While doable, commitments or competing tasks restrict your buffer. Consider prioritizing this high-value milestone early.`;
  } else {
    return `Critical buffer deficit. Estimated time (${formatFriendlyDuration(task.duration)}) exceeds available free time. Consider rescheduling commitments or adjusting priority.`;
  }
};

interface Time12HourPickerProps {
  label: string;
  value: string; // "HH:MM"
  onChange: (newValue: string) => void;
  colorTheme?: 'cyan' | 'purple';
}

function Time12HourPicker({ label, value, onChange, colorTheme = 'cyan' }: Time12HourPickerProps) {
  const { hour, minute, ampm } = parse24To12(value);

  const handleHourChange = (newHour: number) => {
    onChange(format12To24(newHour, minute, ampm));
  };

  const handleMinuteChange = (newMinute: number) => {
    onChange(format12To24(hour, newMinute, ampm));
  };

  const handleAmpmChange = (newAmpm: 'AM' | 'PM') => {
    onChange(format12To24(hour, minute, newAmpm));
  };

  const activeColorClass = colorTheme === 'purple'
    ? 'bg-purple-500 text-slate-950 shadow-[0_0_10px_rgba(168,85,247,0.4)] font-extrabold'
    : 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.4)] font-extrabold';

  const focusBorderClass = colorTheme === 'purple'
    ? 'focus-within:border-purple-500/50'
    : 'focus-within:border-cyan-500/50';

  const hoverBorderClass = colorTheme === 'purple'
    ? 'hover:border-purple-500/30 focus:border-purple-500/30'
    : 'hover:border-cyan-500/30 focus:border-cyan-500/30';

  return (
    <div className="space-y-2">
      <label className="text-xs font-mono text-slate-400 uppercase tracking-widest block">{label}</label>
      <div className={`flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 ${focusBorderClass} rounded-xl p-1.5 transition-colors`}>
        {/* Hour Dropdown */}
        <div className="relative flex-1 min-w-[70px]">
          <select
            value={hour}
            onChange={(e) => handleHourChange(parseInt(e.target.value, 10))}
            className={`w-full bg-slate-950 text-slate-200 text-sm font-sans focus:outline-none px-3 py-2 cursor-pointer appearance-none rounded-lg border border-transparent ${hoverBorderClass} text-center`}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
              <option key={h} value={h} className="bg-slate-950 text-slate-200">
                {h.toString().padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>

        <span className="text-slate-500 font-sans font-bold flex-shrink-0">:</span>

        {/* Minute Dropdown */}
        <div className="relative flex-1 min-w-[70px]">
          <select
            value={minute}
            onChange={(e) => handleMinuteChange(parseInt(e.target.value, 10))}
            className={`w-full bg-slate-950 text-slate-200 text-sm font-sans focus:outline-none px-3 py-2 cursor-pointer appearance-none rounded-lg border border-transparent ${hoverBorderClass} text-center`}
          >
            {Array.from({ length: 60 }, (_, i) => i).map(m => (
              <option key={m} value={m} className="bg-slate-950 text-slate-200">
                {m.toString().padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>

        {/* AM/PM Toggle Segment */}
        <div className="flex bg-slate-900 rounded-lg p-0.5 ml-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => handleAmpmChange('AM')}
            className={`px-3 py-1.5 text-xs font-bold font-mono rounded-md transition-all cursor-pointer ${
              ampm === 'AM'
                ? activeColorClass
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => handleAmpmChange('PM')}
            className={`px-3 py-1.5 text-xs font-bold font-mono rounded-md transition-all cursor-pointer ${
              ampm === 'PM'
                ? activeColorClass
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            PM
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // Navigation & Tab State
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Core Data State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    userName: 'Netrunner',
    productivityGoal: 'Maximize focus blocks and prevent developer burnout',
    workMode: 'work',
    focusDuration: 25,
    breakDuration: 5
  });
  const [aiHistory, setAiHistory] = useState<AIHistoryItem[]>([]);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  // Feasibility Check State
  const [feasibilityIssues, setFeasibilityIssues] = useState<{
    task: Task;
    availableTime: number;
    requiredDuration: number;
    deadline: string;
    deadlineTime: string;
  }[]>([]);
  const [showFeasibilityModal, setShowFeasibilityModal] = useState<boolean>(false);
  const [feasibilityResolutions, setFeasibilityResolutions] = useState<{[taskId: string]: 'work_until_deadline' | 'skip'}>({});

  // Prompt and schedule regeneration states
  const [showDurationOptions, setShowDurationOptions] = useState<boolean>(false);
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);
  const [customDurationValue, setCustomDurationValue] = useState<string>('');
  const [isRegeneratingRemaining, setIsRegeneratingRemaining] = useState<boolean>(false);

  // Editing States
  const [expandedPredictionTaskId, setExpandedPredictionTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingCommitment, setEditingCommitment] = useState<Commitment | null>(null);

  const startEditingTask = (task: Task) => {
    setEditingTask(task);
    setTaskForm({
      name: task.name,
      deadline: task.deadline,
      deadlineTime: task.deadlineTime || '17:00',
      duration: task.duration,
      priority: task.priority,
      category: task.category,
      difficulty: task.difficulty || 'medium',
      energyRequired: task.energyRequired || 'medium',
      notes: task.notes || ''
    });
    setActiveTab('add-task');
  };

  const startEditingCommitment = (commit: Commitment) => {
    setEditingCommitment(commit);
    setCommitmentForm({
      title: commit.title,
      date: commit.date,
      startTime: commit.startTime,
      endTime: commit.endTime,
      description: commit.description || '',
      colorTag: commit.colorTag || 'purple'
    });
    setActiveTab('commitments');
  };

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [sortBy, setSortBy] = useState<string>('deadline');

  // Form States
  const [taskForm, setTaskForm] = useState({
    name: '',
    deadline: new Date().toISOString().split('T')[0],
    deadlineTime: '17:00',
    duration: 30,
    priority: 'medium' as 'low' | 'medium' | 'high',
    category: 'Work',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    energyRequired: 'medium' as 'low' | 'medium' | 'high',
    notes: ''
  });

  const [commitmentForm, setCommitmentForm] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '11:00',
    description: '',
    colorTag: 'purple' as 'purple' | 'violet' | 'blue' | 'cyan' | 'rose' | 'emerald'
  });

  // Calendar State
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month');
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());

  // Notification Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = (type: ToastType, message: string) => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Live Updating Clock State
  const [timeState, setTimeState] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTimeState(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // AI Chat state and handlers
  const [chatMessages, setChatMessages] = useState<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: string }[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `✨ **FOCUS CORE SYNCHRONIZED** ✨\n\nWelcome to the AI Coach support terminal. I am DeadlineAI, your cybernetic productivity mentor.\n\nWhether you are crushing your timeline or running on low power reserves, I am here to optimize your momentum! Always stay positive. How are you feeling about your timeline today?`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatLoading]);

  const handleSendChatMessage = async (customMessage?: string) => {
    const messageText = customMessage || chatInput;
    if (!messageText.trim() || isChatLoading) return;

    if (!customMessage) {
      setChatInput('');
    }

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      content: messageText,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    };

    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setIsChatLoading(true);

    const currentDateStr = timeState.toISOString().split('T')[0];
    const currentTimeStr = timeState.toTimeString().split(' ')[0].substring(0, 5);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          currentDate: currentDateStr,
          currentTime: currentTimeStr
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      const assistantMsg = {
        id: `assistant-${Date.now()}`,
        role: 'assistant' as const,
        content: data.reply || "My neural systems are fully synchronized and positive! You are doing amazing, let's keep moving forward.",
        timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      };

      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error('Chat error:', error);
      addToast('error', 'Neural transmission failed. Falling back offline.');
      
      // Local fallback
      const fallbackReply = `⚡ **TRANSMISSION CALIBRATION ACTIVE** ⚡\n\nEven with network interference, my belief in your timeline remains absolute! Every micro-step you take is an optimization. Keep your engines firing—you're doing incredibly well!`;
      const assistantMsg = {
        id: `assistant-${Date.now()}`,
        role: 'assistant' as const,
        content: fallbackReply,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, assistantMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Fetch initial data
  const fetchData = async () => {
    try {
      const [tasksRes, commitmentsRes, settingsRes, historyRes] = await Promise.all([
        fetch('/api/tasks').then(r => r.json()),
        fetch('/api/commitments').then(r => r.json()),
        fetch('/api/settings').then(r => r.json()),
        fetch('/api/ai/history').then(r => r.json())
      ]);

      setTasks(tasksRes);
      setCommitments(commitmentsRes);
      setSettings(settingsRes);
      setAiHistory(historyRes);
    } catch (error) {
      console.error('Failed to load application data:', error);
      addToast('error', 'Cybernetic data-link error. Could not load database records.');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Hello / Greeting Time Check
  const getGreeting = () => {
    const hours = timeState.getHours();
    if (hours < 12) return 'Good Morning';
    if (hours < 18) return 'Good Afternoon';
    if (hours < 22) return 'Good Evening';
    return 'Good Night';
  };

  // Deadline & Urgency Helpers
  const getDeadlineRemainingInfo = (task: Task, refDate: Date) => {
    if (!task.deadline) return null;
    const tTime = task.deadlineTime || '17:00';
    const [hours, minutes] = tTime.split(':').map(Number);
    const deadlineDate = new Date(task.deadline);
    // Parse Date as local
    const year = deadlineDate.getFullYear();
    const month = deadlineDate.getMonth();
    const date = deadlineDate.getDate();
    const dDate = new Date(year, month, date, hours || 17, minutes || 0, 0, 0);
    const diffMs = dDate.getTime() - refDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    return {
      diffMins,
      deadlineDate: dDate,
      formattedTime: formatTimeTo12Hour(tTime)
    };
  };

  const getNearTasks = () => {
    return tasks
      .filter(t => t.status === 'pending')
      .map(t => ({
        task: t,
        info: getDeadlineRemainingInfo(t, timeState)
      }))
      .filter(item => {
        if (!item.info) return false;
        // Show if overdue or due within 48 hours (2880 minutes)
        return item.info.diffMins < 2880;
      })
      .sort((a, b) => {
        return (a.info?.diffMins || 0) - (b.info?.diffMins || 0);
      });
  };

  const getUrgentReminders = () => {
    return tasks
      .filter(t => t.status === 'pending')
      .map(t => ({
        task: t,
        info: getDeadlineRemainingInfo(t, timeState)
      }))
      .filter(item => {
        if (!item.info) return false;
        // ONLY show if task has to submit within 3 hours (180 minutes) and is NOT overdue
        return item.info.diffMins >= 0 && item.info.diffMins < 180;
      })
      .sort((a, b) => {
        return (a.info?.diffMins || 0) - (b.info?.diffMins || 0);
      });
  };

  // Tasks Event Handlers
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.name.trim()) {
      addToast('warning', 'Task name cannot be empty.');
      return;
    }

    try {
      if (editingTask) {
        const res = await fetch(`/api/tasks/${editingTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskForm)
        });
        const updated = await res.json();
        setTasks(prev => prev.map(t => t.id === editingTask.id ? updated : t));
        addToast('success', `Task "${updated.name}" updated successfully.`);
        setEditingTask(null);
      } else {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskForm)
        });
        const newTask = await res.json();
        setTasks(prev => [newTask, ...prev]);
        addToast('success', `Task "${newTask.name}" initialized successfully.`);
      }
      // Reset form
      setTaskForm({
        name: '',
        deadline: new Date().toISOString().split('T')[0],
        deadlineTime: '17:00',
        duration: 30,
        priority: 'medium',
        category: 'Work',
        difficulty: 'medium',
        energyRequired: 'medium',
        notes: ''
      });
      setActiveTab('dashboard');
    } catch (err) {
      addToast('error', editingTask ? 'Failed to update task.' : 'Failed to compile new task.');
    }
  };

  const handleUpdateTaskStatus = async (id: string, newStatus: 'pending' | 'completed' | 'missed') => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const updatedTask = await res.json();
      setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
      addToast('success', `Task marked as ${newStatus}.`);
    } catch (err) {
      addToast('error', 'Status mutation failed.');
    }
  };

  const getPassedPendingTask = () => {
    if (aiHistory.length === 0) return null;
    const currentPlan = aiHistory[0];
    const currentMin = timeState.getHours() * 60 + timeState.getMinutes();
    
    for (const block of currentPlan.schedule) {
      if (block.type === 'task' || block.type === 'focus') {
        if (block.idRef) {
          const task = tasks.find(t => t.id === block.idRef);
          if (task && task.status === 'pending') {
            const endMin = timeToMinutes(block.endTime);
            if (currentMin >= endMin) {
              return { block, task };
            }
          }
        }
      }
    }
    return null;
  };

  const handleCompletePrompt = async (taskId: string) => {
    await handleUpdateTaskStatus(taskId, 'completed');
    setShowDurationOptions(false);
    setShowCustomInput(false);
    setCustomDurationValue('');
  };

  const handleRegenerateRemaining = async (taskId: string, additionalMinutes: number) => {
    setIsRegeneratingRemaining(true);
    addToast('info', 'Decompressing timelines and recalculating neuro-temporal paths...');
    
    const currentDateStr = timeState.toISOString().split('T')[0];
    const currentTimeStr = timeState.toTimeString().split(' ')[0].substring(0, 5);

    try {
      const res = await fetch('/api/ai/plan/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentTime: currentTimeStr,
          currentDate: currentDateStr,
          taskId,
          additionalMinutes
        })
      });

      if (!res.ok) throw new Error('Regeneration server error');
      
      const newPlan = await res.json();
      setAiHistory(prev => [newPlan, ...prev]);
      addToast('success', 'Timeline regenerated starting from current time. Remaining schedule optimized.');
      
      // Refresh tasks data to get updated durations
      await fetchData();
      
      // Reset prompt state
      setShowDurationOptions(false);
      setShowCustomInput(false);
      setCustomDurationValue('');
    } catch (err) {
      addToast('error', 'Failed to regenerate remaining schedule.');
    } finally {
      setIsRegeneratingRemaining(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      setTasks(prev => prev.filter(t => t.id !== id));
      addToast('info', 'Task decommissioned from timeline.');
    } catch (err) {
      addToast('error', 'Failed to delete task.');
    }
  };

  // Commitments Event Handlers
  const handleCreateCommitment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitmentForm.title.trim()) {
      addToast('warning', 'Commitment title cannot be empty.');
      return;
    }

    try {
      if (editingCommitment) {
        const res = await fetch(`/api/commitments/${editingCommitment.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(commitmentForm)
        });
        const updated = await res.json();
        setCommitments(prev => prev.map(c => c.id === editingCommitment.id ? updated : c));
        addToast('success', `Commitment "${updated.title}" updated successfully.`);
        setEditingCommitment(null);
      } else {
        const res = await fetch('/api/commitments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(commitmentForm)
        });
        const newCommit = await res.json();
        setCommitments(prev => [...prev, newCommit]);
        addToast('success', `Fixed commitment "${newCommit.title}" locked into timeline.`);
      }
      setCommitmentForm({
        title: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '10:00',
        endTime: '11:00',
        description: '',
        colorTag: 'purple'
      });
      setActiveTab('dashboard');
    } catch (err) {
      addToast('error', editingCommitment ? 'Failed to update fixed event.' : 'Failed to lock fixed event.');
    }
  };

  const handleDeleteCommitment = async (id: string) => {
    try {
      await fetch(`/api/commitments/${id}`, { method: 'DELETE' });
      setCommitments(prev => prev.filter(c => c.id !== id));
      addToast('info', 'Fixed event purged from database.');
    } catch (err) {
      addToast('error', 'Failed to delete commitment.');
    }
  };

  // Settings Save Handler
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const updatedSettings = await res.json();
      setSettings(updatedSettings);
      addToast('success', 'Neural profile parameters synchronized successfully.');
    } catch (err) {
      addToast('error', 'Profile synchronization failed.');
    }
  };

  // Clear Schedule History
  const handleClearHistory = async () => {
    try {
      await fetch('/api/ai/history', { method: 'DELETE' });
      setAiHistory([]);
      addToast('info', 'AI generation history cleared.');
    } catch (err) {
      addToast('error', 'Failed to wipe history.');
    }
  };

  const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const getAvailableMinutesForTask = (
    task: Task, 
    currentDateStr: string, 
    currentTimeStr: string, 
    commitmentsList: Commitment[]
  ): number => {
    const currentMinutes = parseTimeToMinutes(currentTimeStr);
    
    const isToday = task.deadline === currentDateStr;
    const isPastDate = task.deadline && task.deadline < currentDateStr;
    
    if (isPastDate) return 0;
    
    let endMinutes = 1410; // 23:30 (standard sleep/decompress time)
    if (isToday) {
      const deadlineMinutes = parseTimeToMinutes(task.deadlineTime || '17:00');
      endMinutes = Math.min(deadlineMinutes, 1410);
    }
    
    if (endMinutes <= currentMinutes) return 0;
    
    const occupied = new Array(1440).fill(false);
    const todayComms = commitmentsList.filter(c => c.date === currentDateStr);
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
  };

  const executePlanGeneration = async (resolutions: {[taskId: string]: 'work_until_deadline' | 'skip'}) => {
    setIsGeneratingPlan(true);
    addToast('info', 'Connecting to Gemini model to formulate adaptive productivity timeline...');
    
    const currentDateStr = timeState.toISOString().split('T')[0];
    const currentTimeStr = timeState.toTimeString().split(' ')[0].substring(0, 5);

    try {
      const res = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentDate: currentDateStr,
          currentTime: currentTimeStr,
          resolutions
        })
      });

      if (!res.ok) throw new Error('API server error');
      
      const newPlan = await res.json();
      setAiHistory(prev => [newPlan, ...prev]);
      addToast('success', 'Optimal productivity daily timeline compiled by DeadlineAI.');
      setActiveTab('planner');
    } catch (err) {
      addToast('warning', 'Gemini node timeout. Rendered high-fidelity local adaptive timeline.');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // Generate Daily Schedule with Gemini
  const handleGeneratePlan = async () => {
    const currentDateStr = timeState.toISOString().split('T')[0];
    const currentTimeStr = timeState.toTimeString().split(' ')[0].substring(0, 5);
    const currentMinutes = parseTimeToMinutes(currentTimeStr);

    // Filter pending tasks
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const issues: typeof feasibilityIssues = [];

    for (const t of pendingTasks) {
      const isToday = t.deadline === currentDateStr;
      const isPastDate = t.deadline && t.deadline < currentDateStr;
      
      let isOver = false;
      if (isPastDate) {
        isOver = true;
      } else if (isToday) {
        const deadlineMinutes = parseTimeToMinutes(t.deadlineTime || '17:00');
        if (deadlineMinutes < currentMinutes) {
          isOver = true;
        }
      }

      let availableTime = 0;
      if (!isOver) {
        availableTime = getAvailableMinutesForTask(t, currentDateStr, currentTimeStr, commitments);
      }

      if (isOver || t.duration > availableTime) {
        issues.push({
          task: t,
          availableTime,
          requiredDuration: t.duration,
          deadline: t.deadline,
          deadlineTime: t.deadlineTime || '17:00'
        });
      }
    }

    if (issues.length > 0) {
      // Show warning/feasibility modal
      const initialResolutions: {[taskId: string]: 'work_until_deadline' | 'skip'} = {};
      issues.forEach(iss => {
        initialResolutions[iss.task.id] = 'work_until_deadline';
      });
      setFeasibilityResolutions(initialResolutions);
      setFeasibilityIssues(issues);
      setShowFeasibilityModal(true);
      addToast('warning', 'Neural-temporal conflicts detected! Manual action required before proceeding.');
    } else {
      // Proceed normally
      await executePlanGeneration({});
    }
  };

  // Searching, Sorting, and Filtering Logic
  const getFilteredTasks = () => {
    return tasks
      .filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              t.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              t.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
        const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
        return matchesSearch && matchesCategory && matchesPriority;
      })
      .sort((a, b) => {
        if (sortBy === 'deadline') {
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        } else if (sortBy === 'priority') {
          const priorities = { high: 3, medium: 2, low: 1 };
          return priorities[b.priority] - priorities[a.priority];
        } else if (sortBy === 'duration') {
          return b.duration - a.duration;
        }
        return 0;
      });
  };

  // Get lists of unique categories
  const categories = ['all', ...Array.from(new Set(tasks.map(t => t.category)))];

  // Helper Stats Calculation
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const todayDateStr = timeState.toISOString().split('T')[0];
  const todayCommitments = commitments.filter(c => c.date === todayDateStr);

  // Analytics Helpers
  const focusHours = parseFloat(((tasks.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.duration, 0)) / 60).toFixed(1));
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // 1. Productivity Index
  const productivityScore = React.useMemo(() => {
    if (tasks.length === 0) return 100;
    const completed = tasks.filter(t => t.status === 'completed');
    const missedCount = tasks.filter(t => t.status === 'missed').length;
    
    const overdueCount = tasks.filter(t => {
      if (t.status !== 'pending') return false;
      const currentDateStr = timeState.toISOString().split('T')[0];
      const currentTimeStr = timeState.toTimeString().split(' ')[0].substring(0, 5);
      if (!t.deadline) return false;
      if (t.deadline < currentDateStr) return true;
      if (t.deadline === currentDateStr) {
        return parseTimeToMinutes(t.deadlineTime || '17:00') < parseTimeToMinutes(currentTimeStr);
      }
      return false;
    }).length;

    const rate = completed.length / tasks.length;
    const focusHrs = completed.reduce((sum, t) => sum + t.duration, 0) / 60;

    let score = 50 + Math.round(rate * 30) + Math.min(20, completed.length * 5) + Math.min(20, Math.round(focusHrs * 4)) - (missedCount * 15) - (overdueCount * 10);
    return Math.max(0, Math.min(100, score));
  }, [tasks, timeState]);

  // 2. Active Streak
  const activeStreak = React.useMemo(() => {
    const completed = tasks.filter(t => t.status === 'completed');
    if (completed.length === 0) return 0;
    
    const uniqueDates: string[] = Array.from(new Set(completed.map(t => t.deadline)))
      .filter((d): d is string => !!d)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    if (uniqueDates.length === 0) return 0;

    const currentDateStr = timeState.toISOString().split('T')[0];
    const latestDate = new Date(uniqueDates[0]);
    const today = new Date(currentDateStr);
    const diffTime = Math.abs(today.getTime() - latestDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 1 && uniqueDates[0] < currentDateStr) {
      return 0;
    }

    let streak = 0;
    let checkDate = new Date(uniqueDates[0]);

    while (true) {
      const checkDateStr = checkDate.toISOString().split('T')[0];
      if (uniqueDates.includes(checkDateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [tasks, timeState]);

  // 3. Task Completion Velocity
  const weeklyCompletionData = React.useMemo(() => {
    const data = [];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(timeState);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = daysOfWeek[d.getDay()];
      
      const tasksForDay = tasks.filter(t => t.deadline === dateStr);
      const completedForDay = tasksForDay.filter(t => t.status === 'completed').length;
      const totalForDay = tasksForDay.length;
      
      data.push({
        day: dayLabel,
        completed: completedForDay,
        targeted: totalForDay,
        date: dateStr
      });
    }
    return data;
  }, [tasks, timeState]);

  // 4. Category Allocation Profile
  const categoryDistributionData = React.useMemo(() => {
    const catMap: { [cat: string]: number } = {};
    tasks.forEach(t => {
      const cat = t.category || 'General';
      catMap[cat] = (catMap[cat] || 0) + t.duration;
    });
    
    const totalDuration = Object.values(catMap).reduce((sum, val) => sum + val, 0);
    if (totalDuration === 0) return [];
    
    return Object.keys(catMap).map(cat => ({
      name: cat,
      value: catMap[cat],
      percentage: Math.round((catMap[cat] / totalDuration) * 100)
    }));
  }, [tasks]);

  // 5. Consistency Matrix
  const consistencyMatrixData = React.useMemo(() => {
    const matrix = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date(timeState);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const completedCount = tasks.filter(t => t.deadline === dateStr && t.status === 'completed').length;
      matrix.push({
        dateStr,
        completedCount,
        dayNum: 28 - i,
        formattedDate: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      });
    }
    return matrix;
  }, [tasks, timeState]);

  // 6. Additional Useful Statistics
  const tasksCompletedToday = React.useMemo(() => {
    return tasks.filter(t => t.status === 'completed' && t.deadline === todayDateStr).length;
  }, [tasks, todayDateStr]);

  const totalPlannedHours = React.useMemo(() => {
    return parseFloat((tasks.reduce((sum, t) => sum + t.duration, 0) / 60).toFixed(1));
  }, [tasks]);

  const totalCompletedHours = React.useMemo(() => {
    return parseFloat((tasks.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.duration, 0) / 60).toFixed(1));
  }, [tasks]);

  const missedDeadlinesCount = React.useMemo(() => {
    const missedStatus = tasks.filter(t => t.status === 'missed').length;
    const overdueCount = tasks.filter(t => {
      if (t.status !== 'pending') return false;
      const currentDateStr = timeState.toISOString().split('T')[0];
      const currentTimeStr = timeState.toTimeString().split(' ')[0].substring(0, 5);
      if (!t.deadline) return false;
      if (t.deadline < currentDateStr) return true;
      if (t.deadline === currentDateStr) {
        return parseTimeToMinutes(t.deadlineTime || '17:00') < parseTimeToMinutes(currentTimeStr);
      }
      return false;
    }).length;
    return missedStatus + overdueCount;
  }, [tasks, timeState]);

  const upcomingDeadlinesCount = React.useMemo(() => {
    return tasks.filter(t => {
      if (t.status !== 'pending') return false;
      const currentDateStr = timeState.toISOString().split('T')[0];
      const currentTimeStr = timeState.toTimeString().split(' ')[0].substring(0, 5);
      if (!t.deadline) return false;
      if (t.deadline > currentDateStr) return true;
      if (t.deadline === currentDateStr) {
        return parseTimeToMinutes(t.deadlineTime || '17:00') >= parseTimeToMinutes(currentTimeStr);
      }
      return false;
    }).length;
  }, [tasks, timeState]);

  const mostProductiveDay = React.useMemo(() => {
    const completed = tasks.filter(t => t.status === 'completed');
    if (completed.length === 0) return 'N/A';
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts: { [day: string]: number } = {};
    
    completed.forEach(t => {
      const d = new Date(t.deadline);
      if (!isNaN(d.getTime())) {
        const dayName = dayNames[d.getDay()];
        dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
      }
    });
    
    let bestDay = 'N/A';
    let maxCount = 0;
    for (const [day, count] of Object.entries(dayCounts)) {
      if (count > maxCount) {
        maxCount = count;
        bestDay = day;
      }
    }
    return bestDay;
  }, [tasks]);

  const mostProductiveTimeOfDay = React.useMemo(() => {
    const completed = tasks.filter(t => t.status === 'completed');
    if (completed.length === 0) return 'N/A';
    
    const timeBlockCounts = {
      Morning: 0,   // 6 AM - 12 PM
      Afternoon: 0, // 12 PM - 5 PM
      Evening: 0,   // 5 PM - 9 PM
      Night: 0      // 9 PM - 6 AM
    };
    
    completed.forEach(t => {
      const timeStr = t.deadlineTime || '17:00';
      const hour = parseInt(timeStr.split(':')[0]) || 0;
      if (hour >= 6 && hour < 12) {
        timeBlockCounts.Morning++;
      } else if (hour >= 12 && hour < 17) {
        timeBlockCounts.Afternoon++;
      } else if (hour >= 17 && hour < 21) {
        timeBlockCounts.Evening++;
      } else {
        timeBlockCounts.Night++;
      }
    });
    
    let bestTime = 'N/A';
    let maxCount = 0;
    for (const [block, count] of Object.entries(timeBlockCounts)) {
      if (count > maxCount) {
        maxCount = count;
        bestTime = block;
      }
    }
    return bestTime;
  }, [tasks]);

  // 7. Deadline Predictions List
  const deadlinePredictions = React.useMemo(() => {
    const currentDateStr = timeState.toISOString().split('T')[0];
    const currentTimeStr = timeState.toTimeString().split(' ')[0].substring(0, 5);

    return tasks
      .filter(t => t.status === 'pending')
      .map(t => {
        const availableTime = getAvailableMinutesForTask(t, currentDateStr, currentTimeStr, commitments);
        
        const now = new Date(timeState);
        const deadlineDate = new Date(`${t.deadline}T${t.deadlineTime || '17:00'}`);
        const totalMinutes = Math.max(0, Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60)));

        let commitmentsMinutes = 0;
        commitments.forEach(c => {
          const commStart = new Date(`${c.date}T${c.startTime}`);
          const commEnd = new Date(`${c.date}T${c.endTime}`);
          const intersectStart = Math.max(now.getTime(), commStart.getTime());
          const intersectEnd = Math.min(deadlineDate.getTime(), commEnd.getTime());
          if (intersectStart < intersectEnd) {
            commitmentsMinutes += Math.floor((intersectEnd - intersectStart) / (1000 * 60));
          }
        });

        let prob = 0;
        
        if (availableTime > 0) {
          if (availableTime < t.duration) {
            prob = Math.max(5, Math.round((availableTime / t.duration) * 35));
          } else {
            const otherCompetingDuration = tasks
              .filter(other => other.id !== t.id && other.status === 'pending')
              .filter(other => {
                if (other.deadline < t.deadline) return true;
                if (other.deadline === t.deadline) {
                  const otherDeadMin = parseTimeToMinutes(other.deadlineTime || '17:00');
                  const tDeadMin = parseTimeToMinutes(t.deadlineTime || '17:00');
                  if (otherDeadMin < tDeadMin) return true;
                  if (otherDeadMin === tDeadMin) {
                    const priorities = { high: 3, medium: 2, low: 1 };
                    return priorities[other.priority] >= priorities[t.priority];
                  }
                }
                return false;
              })
              .reduce((sum, other) => sum + other.duration, 0);

            let probability = 85;

            // Buffer factor
            const buffer = availableTime - t.duration;
            if (buffer < otherCompetingDuration) {
              const deficit = otherCompetingDuration - buffer;
              const penalty = Math.min(50, Math.round((deficit / (t.duration + 1)) * 30));
              probability -= penalty;
            } else {
              const extraBuffer = buffer - otherCompetingDuration;
              probability += Math.min(10, Math.round((extraBuffer / 120) * 5));
            }

            // Priority factor
            if (t.priority === 'high') probability += 8;
            else if (t.priority === 'low') probability -= 8;

            // Difficulty factor
            if (t.difficulty === 'hard') probability -= 10;
            else if (t.difficulty === 'easy') probability += 5;

            // Energy factor
            if (t.energyRequired === 'high') probability -= 5;

            prob = Math.max(5, Math.min(98, probability));
          }
        }
        
        // Define indicator and color
        let indicator = '🔴';
        let colorClass = 'text-rose-400 border-rose-500/20 bg-rose-500/5';
        if (prob >= 80) {
          indicator = '🟢';
          colorClass = 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
        } else if (prob >= 50) {
          indicator = '🟡';
          colorClass = 'text-amber-400 border-amber-500/20 bg-amber-500/5';
        }

        return {
          task: t,
          probability: prob,
          indicator,
          colorClass,
          availableTime,
          totalMinutes,
          commitmentsMinutes
        };
      })
      .sort((a, b) => b.probability - a.probability);
  }, [tasks, commitments, timeState]);

  const TREND_COLORS = ['#8B5CF6', '#22D3EE', '#EC4899', '#10B981', '#F59E0B', '#EF4444'];

  // Calendar render helper
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex overflow-hidden selection:bg-purple-500/30 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        settings={settings}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Mobile Sticky/Fixed Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-950/90 backdrop-blur-md border-b border-violet-500/10 z-30 px-4 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors cursor-pointer focus:outline-none"
            aria-label="Open navigation menu"
          >
            <Menu className="w-6 h-6 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-tr from-violet-600 to-cyan-400 shadow-[0_0_10px_rgba(139,92,246,0.3)]">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold font-sans tracking-tight text-white flex items-center gap-0.5">
              Deadline<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-300">AI</span>
            </h1>
          </div>
        </div>
        
        {/* Simple mini-clock on mobile topbar */}
        <div className="text-xs font-mono text-cyan-400 font-semibold bg-slate-900/60 border border-cyan-500/20 px-2.5 py-1 rounded-lg">
          {timeState.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
        </div>
      </div>

      {/* Main Content Pane */}
      <main className="flex-1 min-h-screen md:ml-[340px] ml-0 p-4 md:p-8 pt-20 md:pt-8 pb-24 overflow-y-auto custom-scrollbar relative">
        {/* Background Cyber Glow Gradients */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-20 right-10 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Global Floating Header (Live Clock + Greeting) */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 pb-6 border-b border-violet-500/10 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 text-[10px] font-mono tracking-widest uppercase rounded-full bg-violet-950/40 text-violet-300 border border-violet-500/30 shadow-[0_0_8px_rgba(168,85,247,0.2)] animate-pulse">
                SYS ONLINE
              </span>
              <span className="text-[10px] font-mono text-slate-500">•</span>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                NODE_ID: AIS-RUN-3000
              </span>
            </div>
            <h2 className="text-3xl font-extrabold font-sans text-white tracking-tight flex items-center gap-2">
              {getGreeting()},{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-300 drop-shadow-[0_0_12px_rgba(168,85,247,0.3)]">
                {settings.userName || 'Netrunner'}
              </span>
            </h2>
            <p className="text-sm font-sans text-slate-400 mt-1 max-w-xl">
              "{(activeTab === 'planner' && aiHistory.length > 0) ? aiHistory[0].motivationalQuote : PRODUCTIVITY_QUOTES[timeState.getSeconds() % PRODUCTIVITY_QUOTES.length]}"
            </p>
          </div>

          {/* Glowing Digital Time Telemetry */}
          <div className="flex items-center gap-4 bg-slate-950/60 border border-cyan-500/20 px-6 py-3.5 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.1)] backdrop-blur-md">
            <Clock className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)] animate-pulse" />
            <div className="font-mono text-right">
              <div className="text-lg font-bold tracking-widest text-cyan-300">
                {timeState.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
                {timeState.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit' })}
              </div>
            </div>
          </div>
        </header>

        {/* Tab Router Switch */}
        <div className="relative z-10">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-8"
              >
                {/* URGENT DEADLINES REMINDER WIDGET */}
                {(() => {
                  const urgentList = getUrgentReminders();
                  if (urgentList.length === 0) return null;

                  return (
                    <div className="p-6 rounded-3xl bg-slate-950/80 border border-rose-500/20 shadow-[0_0_25px_rgba(244,63,94,0.05)] relative overflow-hidden space-y-4">
                      {/* Glow effects */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-[60px] pointer-events-none" />
                      
                      <div className="flex items-center justify-between pb-3 border-b border-slate-900">
                        <div className="flex items-center gap-2.5">
                          <AlertCircle className="w-5 h-5 text-rose-500 animate-pulse drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                          <h4 className="text-sm font-mono font-bold tracking-widest text-slate-200 uppercase">
                            URGENT REMINDER: SUBMISSION WINDOW CLOSING SOON
                          </h4>
                        </div>
                        <span className="px-2.5 py-0.5 text-[10px] font-mono text-rose-400 bg-rose-950/30 border border-rose-500/20 rounded-full animate-pulse">
                          {urgentList.length} Immediate Attention Required
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {urgentList.slice(0, 4).map(({ task, info }) => {
                          if (!info) return null;
                          
                          let countdownText = "";
                          const hours = Math.floor(info.diffMins / 60);
                          const mins = info.diffMins % 60;
                          if (hours > 0) {
                            countdownText = `Due in ${hours}h ${mins}m`;
                          } else {
                            countdownText = `Due in ${mins}m!`;
                          }

                          // Rose/Red themed style for emergency urgency
                          const cardBorder = "border-rose-500/40 bg-rose-950/10 shadow-[0_0_15px_rgba(244,63,94,0.1)]";
                          const badgeColor = "text-rose-400 bg-rose-950/50 border-rose-500/20";

                          return (
                            <div 
                              key={task.id} 
                              className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all duration-300 ${cardBorder}`}
                            >
                              <div className="min-w-0 flex-1 space-y-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider rounded-full border ${badgeColor}`}>
                                    {countdownText}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                                    {task.category}
                                  </span>
                                </div>
                                <h5 className="text-sm font-bold font-sans text-white truncate" title={task.name}>
                                  {task.name}
                                </h5>
                                <p className="text-[10px] font-mono text-slate-400">
                                  Deadline: <span className="text-slate-200">{task.deadline}</span> at <span className="text-slate-200">{info.formattedTime}</span>
                                </p>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                                  className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/20 hover:border-emerald-500/40 transition-all cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.1)] hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                                  title="Mark Completed"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    startEditingTask(task);
                                  }}
                                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                                  title="Modify Task"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Stats Cards Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Total Tasks */}
                  <div 
                    onClick={() => {
                      setTaskStatusFilter('all');
                      document.getElementById('backlog-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="p-6 rounded-2xl glass-card border border-violet-500/10 relative overflow-hidden group hover:border-violet-500/30 transition-all duration-300 cursor-pointer hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/5 rounded-full blur-xl group-hover:bg-violet-600/10 transition-all" />
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Total Backlog</p>
                      <Plus className="w-4 h-4 text-violet-400" />
                    </div>
                    <h3 className="text-3xl font-extrabold font-sans text-white mt-4 tracking-tight">
                      {totalTasks}
                    </h3>
                    <div className="flex items-center justify-between mt-2 text-slate-500 text-xs font-sans">
                      <span>Tasks queued across timeline</span>
                      <span className="text-[10px] font-mono text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity">VIEW ALL →</span>
                    </div>
                  </div>

                  {/* Commitments Today */}
                  <div 
                    onClick={() => {
                      document.getElementById('commitments-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="p-6 rounded-2xl glass-card border border-cyan-500/10 relative overflow-hidden group hover:border-cyan-500/30 transition-all duration-300 cursor-pointer hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-600/5 rounded-full blur-xl group-hover:bg-cyan-600/10 transition-all" />
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Today's Anchors</p>
                      <CalendarIcon className="w-4 h-4 text-cyan-400" />
                    </div>
                    <h3 className="text-3xl font-extrabold font-sans text-white mt-4 tracking-tight">
                      {todayCommitments.length}
                    </h3>
                    <div className="flex items-center justify-between mt-2 text-slate-500 text-xs font-sans">
                      <span>Fixed time commitments</span>
                      <span className="text-[10px] font-mono text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">GO TO →</span>
                    </div>
                  </div>

                  {/* Completed Tasks */}
                  <div 
                    onClick={() => {
                      setTaskStatusFilter('completed');
                      document.getElementById('backlog-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="p-6 rounded-2xl glass-card border border-emerald-500/10 relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300 cursor-pointer hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-600/5 rounded-full blur-xl group-hover:bg-emerald-600/10 transition-all" />
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Completed Focus</p>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <h3 className="text-3xl font-extrabold font-sans text-white mt-4 tracking-tight">
                      {completedTasks}
                    </h3>
                    <div className="flex items-center justify-between mt-2 text-emerald-400 text-xs font-sans">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>{completionRate}% success velocity</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">VIEW →</span>
                    </div>
                  </div>

                  {/* Pending Tasks */}
                  <div 
                    onClick={() => {
                      setTaskStatusFilter('pending');
                      document.getElementById('backlog-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="p-6 rounded-2xl glass-card border border-pink-500/10 relative overflow-hidden group hover:border-pink-500/30 transition-all duration-300 cursor-pointer hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_0_20px_rgba(236,72,153,0.15)]"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-pink-600/5 rounded-full blur-xl group-hover:bg-pink-600/10 transition-all" />
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Pending Tasks</p>
                      <AlertCircle className="w-4 h-4 text-pink-400" />
                    </div>
                    <h3 className="text-3xl font-extrabold font-sans text-white mt-4 tracking-tight">
                      {pendingTasks}
                    </h3>
                    <div className="flex items-center justify-between mt-2 text-slate-500 text-xs font-sans">
                      <span>Awaiting adaptive optimization</span>
                      <span className="text-[10px] font-mono text-pink-400 opacity-0 group-hover:opacity-100 transition-opacity">VIEW →</span>
                    </div>
                  </div>
                </div>

                {/* Generate AI Day Action Banner */}
                <div className="relative rounded-3xl p-8 overflow-hidden bg-gradient-to-r from-violet-950/40 via-purple-900/20 to-cyan-950/30 border border-violet-500/20 shadow-[0_0_30px_rgba(139,92,246,0.15)] flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(139,92,246,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,92,246,0.1)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <BrainCircuit className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)] animate-bounce" />
                      <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">DeadlineAI Optimizer</span>
                    </div>
                    <h3 className="text-2xl font-bold font-sans text-white">Generate Your Custom Daily Schedule</h3>
                    <p className="text-sm font-sans text-slate-400 mt-1 max-w-xl">
                      Gemini will synthesize your pending workload, locked commitments, work modes, and breaks into an optimized timeline designed to preserve cognitive focus.
                    </p>
                  </div>
                  <div className="relative z-10 flex-shrink-0">
                    <button
                      onClick={handleGeneratePlan}
                      disabled={isGeneratingPlan}
                      className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-cyan-500 text-white font-bold tracking-wide text-sm shadow-[0_0_25px_rgba(139,92,246,0.5)] hover:shadow-[0_0_40px_rgba(139,92,246,0.8)] transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none overflow-hidden cursor-pointer flex items-center gap-3"
                    >
                      {isGeneratingPlan ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>SYNTHESIZING TIMELINE...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 text-cyan-200 animate-pulse" />
                          <span>GENERATE MY DAY</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>



                {/* Dashboard Two-Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Column 1: Today's Fixed commitments */}
                  <div id="commitments-section" className="space-y-6 scroll-mt-20">
                    <div className="flex items-center justify-between pb-2 border-b border-violet-500/10">
                      <h3 className="text-lg font-bold font-sans text-white flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-cyan-400" />
                        Today's Commitments
                      </h3>
                      <button
                        onClick={() => setActiveTab('commitments')}
                        className="text-xs font-sans text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                      >
                        <PlusCircle className="w-4 h-4" /> Add Event
                      </button>
                    </div>

                    <div className="space-y-4 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                      {todayCommitments.length === 0 ? (
                        <div className="p-8 rounded-2xl glass-card border border-dashed border-slate-800 text-center text-slate-500 text-sm">
                          No fixed events scheduled for today. Feel free to fill with deep work blocks.
                        </div>
                      ) : (
                        todayCommitments.map((commit) => (
                          <div
                            key={commit.id}
                            className={`p-5 rounded-2xl glass-card border border-l-4 border-l-cyan-400 hover:border-cyan-400/30 transition-all duration-300 relative group`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
                                {formatTimeTo12Hour(commit.startTime)} - {formatTimeTo12Hour(commit.endTime)}
                              </span>
                              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                                <button
                                  onClick={() => startEditingCommitment(commit)}
                                  className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-cyan-950/50 hover:text-cyan-400 border border-slate-800 text-slate-500 transition-all cursor-pointer"
                                  title="Edit Event"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCommitment(commit.id)}
                                  className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-rose-950/50 hover:text-rose-400 border border-slate-800 text-slate-500 transition-all cursor-pointer"
                                  title="Delete Event"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <h4 className="text-base font-bold font-sans text-white">{commit.title}</h4>
                            {commit.description && (
                              <p className="text-xs font-sans text-slate-400 mt-1.5 leading-relaxed">
                                {commit.description}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Column 2: Pending Workload / Backlog */}
                  <div id="backlog-section" className="space-y-6 scroll-mt-20">
                    <div className="flex items-center justify-between pb-2 border-b border-violet-500/10">
                      <h3 className="text-lg font-bold font-sans text-white flex items-center gap-2">
                        <Hourglass className="w-5 h-5 text-purple-400" />
                        {taskStatusFilter === 'all' ? 'All Workload Backlog' : taskStatusFilter === 'completed' ? 'Completed Workload' : 'Pending Workload'}
                      </h3>
                      <button
                        onClick={() => setActiveTab('add-task')}
                        className="text-xs font-sans text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                      >
                        <PlusCircle className="w-4 h-4" /> Add Task
                      </button>
                    </div>

                    {/* Status Pill Tabs */}
                    <div className="flex gap-1.5 p-1 bg-slate-950/80 border border-slate-900/80 rounded-xl w-full">
                      <button
                        onClick={() => setTaskStatusFilter('pending')}
                        className={`flex-1 py-2 rounded-lg text-[11px] font-mono tracking-wider transition-all cursor-pointer text-center ${
                          taskStatusFilter === 'pending'
                            ? 'bg-purple-500/15 text-purple-400 border border-purple-500/25 shadow-[0_0_10px_rgba(168,85,247,0.15)]'
                            : 'text-slate-400 hover:text-slate-300 border border-transparent'
                        }`}
                      >
                        PENDING
                      </button>
                      <button
                        onClick={() => setTaskStatusFilter('completed')}
                        className={`flex-1 py-2 rounded-lg text-[11px] font-mono tracking-wider transition-all cursor-pointer text-center ${
                          taskStatusFilter === 'completed'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                            : 'text-slate-400 hover:text-slate-300 border border-transparent'
                        }`}
                      >
                        COMPLETED
                      </button>
                      <button
                        onClick={() => setTaskStatusFilter('all')}
                        className={`flex-1 py-2 rounded-lg text-[11px] font-mono tracking-wider transition-all cursor-pointer text-center ${
                          taskStatusFilter === 'all'
                            ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                            : 'text-slate-400 hover:text-slate-300 border border-transparent'
                        }`}
                      >
                        ALL BACKLOG
                      </button>
                    </div>

                    {/* Search & Sort Widgets */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Search tasks..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm font-sans focus:outline-none focus:border-purple-500/50 text-slate-200 transition-colors"
                        />
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={priorityFilter}
                          onChange={(e) => setPriorityFilter(e.target.value)}
                          className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-500/50 text-slate-300 transition-colors"
                        >
                          <option value="all">All Priority</option>
                          <option value="high">High Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="low">Low Priority</option>
                        </select>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-500/50 text-slate-300 transition-colors"
                        >
                          <option value="deadline">Sort: Deadline</option>
                          <option value="priority">Sort: Priority</option>
                          <option value="duration">Sort: Duration</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                      {getFilteredTasks().filter(t => taskStatusFilter === 'all' ? true : t.status === taskStatusFilter).length === 0 ? (
                        <div className="p-8 rounded-2xl glass-card border border-dashed border-slate-800 text-center text-slate-500 text-sm">
                          {taskStatusFilter === 'completed' 
                            ? 'No completed tasks found. Keep focus session going!' 
                            : 'No tasks found. All clear or check your filters.'}
                        </div>
                      ) : (
                        getFilteredTasks()
                          .filter(t => taskStatusFilter === 'all' ? true : t.status === taskStatusFilter)
                          .map((task) => (
                            <div
                              key={task.id}
                              className="p-5 rounded-2xl glass-card border border-violet-500/10 hover:border-violet-500/30 transition-all duration-300 relative group flex items-start justify-between gap-4"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`px-2.5 py-0.5 text-[9px] font-mono uppercase rounded-full ${
                                    task.priority === 'high'
                                      ? 'bg-rose-950/50 text-rose-400 border border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.15)]'
                                      : task.priority === 'medium'
                                      ? 'bg-amber-950/50 text-amber-400 border border-amber-500/30'
                                      : 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/30'
                                  }`}>
                                    {task.priority}
                                  </span>
                                  <span className="text-slate-500 font-mono text-[10px]">•</span>
                                  <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                                    {task.category}
                                  </span>
                                  <span className="text-slate-500 font-mono text-[10px]">•</span>
                                  <span className="text-slate-500 font-mono text-[10px]">
                                    {task.duration}m
                                  </span>
                                  {task.status === 'completed' && (
                                    <>
                                      <span className="text-slate-500 font-mono text-[10px]">•</span>
                                      <span className="px-2 py-0.5 text-[9px] font-mono uppercase rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.15)]">
                                        Completed
                                      </span>
                                    </>
                                  )}
                                </div>
                                <h4 className={`text-base font-bold font-sans text-white truncate ${task.status === 'completed' ? 'line-through text-slate-500' : ''}`}>{task.name}</h4>
                                {task.notes && (
                                  <p className="text-xs font-sans text-slate-400 mt-1.5 leading-relaxed truncate max-w-sm">
                                    {task.notes}
                                  </p>
                                )}
                                <div className="flex items-center gap-1.5 mt-2 text-[10px] font-mono text-purple-400">
                                  <span>DEADLINE:</span>
                                  <span className="text-slate-300">{task.deadline}</span>
                                  <span>at</span>
                                  <span className="text-slate-300">{formatTimeTo12Hour(task.deadlineTime || '17:00')}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                {task.status !== 'completed' ? (
                                  <button
                                    onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                                    className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                                    title="Mark Completed"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <div className="p-2 rounded-xl bg-emerald-950/30 border border-emerald-500/10 text-emerald-500/60 flex items-center justify-center">
                                    <CheckCircle2 className="w-4 h-4" />
                                  </div>
                                )}
                                <button
                                  onClick={() => startEditingTask(task)}
                                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-purple-400 hover:border-purple-500/30 transition-all cursor-pointer"
                                  title="Edit Task"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-rose-400 hover:border-rose-500/30 transition-all cursor-pointer"
                                  title="Decommission Task"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB: Add Task */}
            {activeTab === 'add-task' && (
              <motion.div
                key="add-task"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="max-w-3xl mx-auto"
              >
                <div className="p-8 rounded-3xl glass-card border border-violet-500/10 shadow-[0_0_40px_rgba(139,92,246,0.05)] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/5 rounded-full blur-[80px]" />
                  <div className="flex items-center gap-3 mb-6">
                    <PlusCircle className="w-6 h-6 text-purple-400" />
                    <h3 className="text-2xl font-bold font-sans text-white">
                      {editingTask ? 'Edit Daily Focused Task' : 'Create Daily Focused Task'}
                    </h3>
                  </div>

                  <form onSubmit={handleCreateTask} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-mono text-slate-400 uppercase tracking-widest">Task Title</label>
                      <input
                        type="text"
                        required
                        value={taskForm.name}
                        onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                        placeholder="e.g. Refactor API route handlers"
                        className="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500/50 rounded-xl px-4 py-3 text-sm font-sans focus:outline-none text-slate-200 transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-mono text-slate-400 uppercase tracking-widest">Deadline Date</label>
                        <input
                          type="date"
                          required
                          value={taskForm.deadline}
                          onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                          className="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500/50 rounded-xl px-4 py-3 text-sm font-sans focus:outline-none text-slate-300 transition-colors h-[54px]"
                        />
                      </div>
                      <Time12HourPicker
                        label="Deadline Time"
                        value={taskForm.deadlineTime}
                        onChange={(newVal) => setTaskForm({ ...taskForm, deadlineTime: newVal })}
                        colorTheme="purple"
                      />
                      <div className="space-y-2">
                        <label className="text-xs font-mono text-slate-400 uppercase tracking-widest">Target Duration (minutes)</label>
                        <input
                          type="number"
                          required
                          min="10"
                          max="480"
                          value={taskForm.duration}
                          onChange={(e) => setTaskForm({ ...taskForm, duration: Number(e.target.value) })}
                          className="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500/50 rounded-xl px-4 py-3 text-sm font-sans focus:outline-none text-slate-300 transition-colors h-[54px]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-mono text-slate-400 uppercase tracking-widest">Priority Tier</label>
                        <select
                          value={taskForm.priority}
                          onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                          className="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500/50 rounded-xl px-4 py-3 text-sm focus:outline-none text-slate-300 transition-colors"
                        >
                          <option value="high">High Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="low">Low Priority</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-mono text-slate-400 uppercase tracking-widest">Category</label>
                        <input
                          type="text"
                          required
                          value={taskForm.category}
                          onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
                          placeholder="e.g. Work, Study, Health"
                          className="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500/50 rounded-xl px-4 py-3 text-sm font-sans focus:outline-none text-slate-200 transition-colors"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-mono text-slate-400 uppercase tracking-widest">Energy Required</label>
                        <select
                          value={taskForm.energyRequired}
                          onChange={(e) => setTaskForm({ ...taskForm, energyRequired: e.target.value as any })}
                          className="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500/50 rounded-xl px-4 py-3 text-sm focus:outline-none text-slate-300 transition-colors"
                        >
                          <option value="high">High Reserve</option>
                          <option value="medium">Medium Reserve</option>
                          <option value="low">Low Reserve</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-mono text-slate-400 uppercase tracking-widest">Scope & Execution Notes</label>
                      <textarea
                        value={taskForm.notes}
                        onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                        placeholder="Summarize key outputs to help Gemini optimize recommendations..."
                        rows={4}
                        className="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500/50 rounded-xl px-4 py-3 text-sm font-sans focus:outline-none text-slate-200 transition-colors resize-none"
                      />
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTask(null);
                          setTaskForm({
                            name: '',
                            deadline: new Date().toISOString().split('T')[0],
                            duration: 30,
                            priority: 'medium',
                            category: 'Work',
                            difficulty: 'medium',
                            energyRequired: 'medium',
                            notes: ''
                          });
                          setActiveTab('dashboard');
                        }}
                        className="flex-1 py-3.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 transition-all cursor-pointer font-sans"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] cursor-pointer font-sans"
                      >
                        {editingTask ? 'Update Task Details' : 'Compile Task'}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {/* TAB: Commitments */}
            {activeTab === 'commitments' && (
              <motion.div
                key="commitments"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="max-w-3xl mx-auto"
              >
                <div className="p-8 rounded-3xl glass-card border border-cyan-500/10 shadow-[0_0_40px_rgba(6,182,212,0.05)] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-600/5 rounded-full blur-[80px]" />
                  <div className="flex items-center gap-3 mb-6">
                    <CalendarIcon className="w-6 h-6 text-cyan-400" />
                    <h3 className="text-2xl font-bold font-sans text-white">
                      {editingCommitment ? 'Edit Fixed Event' : 'Anchor Fixed Event'}
                    </h3>
                  </div>

                  <form onSubmit={handleCreateCommitment} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-mono text-slate-400 uppercase tracking-widest">Event Title</label>
                      <input
                        type="text"
                        required
                        value={commitmentForm.title}
                        onChange={(e) => setCommitmentForm({ ...commitmentForm, title: e.target.value })}
                        placeholder="e.g. Google AI Studio Hackathon Pitch"
                        className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-3 text-sm font-sans focus:outline-none text-slate-200 transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-mono text-slate-400 uppercase tracking-widest">Date</label>
                        <input
                          type="date"
                          required
                          value={commitmentForm.date}
                          onChange={(e) => setCommitmentForm({ ...commitmentForm, date: e.target.value })}
                          className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-3 text-sm font-sans focus:outline-none text-slate-300 transition-colors"
                        />
                      </div>
                      <Time12HourPicker
                        label="Start Time"
                        value={commitmentForm.startTime}
                        onChange={(newVal) => setCommitmentForm({ ...commitmentForm, startTime: newVal })}
                      />
                      <Time12HourPicker
                        label="End Time"
                        value={commitmentForm.endTime}
                        onChange={(newVal) => setCommitmentForm({ ...commitmentForm, endTime: newVal })}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-mono text-slate-400 uppercase tracking-widest">Color Tag Accent</label>
                        <select
                          value={commitmentForm.colorTag}
                          onChange={(e) => setCommitmentForm({ ...commitmentForm, colorTag: e.target.value as any })}
                          className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-3 text-sm focus:outline-none text-slate-300 transition-colors"
                        >
                          <option value="purple">Purple Aura</option>
                          <option value="cyan">Cyan Neon</option>
                          <option value="blue">Deep Blue</option>
                          <option value="emerald">Emerald Safety</option>
                          <option value="rose">Rose Intense</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-mono text-slate-400 uppercase tracking-widest">Tag Preview</label>
                        <div className="flex items-center h-12 px-4 rounded-xl border border-slate-800 bg-slate-950/40">
                          <span className={`w-3.5 h-3.5 rounded-full mr-3 animate-pulse ${
                            commitmentForm.colorTag === 'purple' ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.6)]' :
                            commitmentForm.colorTag === 'cyan' ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.6)]' :
                            commitmentForm.colorTag === 'blue' ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]' :
                            commitmentForm.colorTag === 'emerald' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]' :
                            'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]'
                          }`} />
                          <span className="text-sm font-sans capitalize text-slate-300">{commitmentForm.colorTag} Accent Zone</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-mono text-slate-400 uppercase tracking-widest">Description</label>
                      <textarea
                        value={commitmentForm.description}
                        onChange={(e) => setCommitmentForm({ ...commitmentForm, description: e.target.value })}
                        placeholder="Add fixed commitments details, links, or physical spaces..."
                        rows={3}
                        className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-3 text-sm font-sans focus:outline-none text-slate-200 transition-colors resize-none"
                      />
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCommitment(null);
                          setCommitmentForm({
                            title: '',
                            date: new Date().toISOString().split('T')[0],
                            startTime: '10:00',
                            endTime: '11:00',
                            description: '',
                            colorTag: 'purple'
                          });
                          setActiveTab('dashboard');
                        }}
                        className="flex-1 py-3.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 transition-all cursor-pointer font-sans"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] cursor-pointer font-sans"
                      >
                        {editingCommitment ? 'Update Event Details' : 'Lock commitment'}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {/* TAB: Planner */}
            {activeTab === 'planner' && (
              <motion.div
                key="planner"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between pb-4 border-b border-violet-500/10">
                  <div>
                    <h3 className="text-2xl font-extrabold font-sans text-white tracking-tight flex items-center gap-2">
                      <BrainCircuit className="w-6 h-6 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                      Gemini Adaptive Scheduler
                    </h3>
                    <p className="text-sm font-sans text-slate-400 mt-1">
                      Cybernetic sequence formulation built strictly for high-intensity timelines.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleClearHistory}
                      className="px-4 py-2 text-xs font-mono rounded-xl border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> WIPE TIMELINE
                    </button>
                    <button
                      onClick={handleGeneratePlan}
                      disabled={isGeneratingPlan}
                      className="px-5 py-2 text-xs font-mono rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-bold shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] transition-all cursor-pointer flex items-center gap-2"
                    >
                      {isGeneratingPlan ? (
                        <>
                          <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                          <span>SYNTHESIZING...</span>
                        </>
                      ) : (
                        <>
                          <span>🔄 Regenerate Plan</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {aiHistory.length > 0 && (() => {
                  const activePrompt = getPassedPendingTask();
                  if (!activePrompt) return null;
                  return (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-6 rounded-2xl bg-slate-950 border border-violet-500/40 shadow-[0_0_20px_rgba(139,92,246,0.2)] relative overflow-hidden space-y-4"
                    >
                      {/* Background glow effects */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
                      
                      <div className="relative z-10 flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-violet-950/80 border border-violet-500/50 flex items-center justify-center text-violet-400 shadow-[0_0_15px_rgba(168,85,247,0.3)] animate-pulse flex-shrink-0">
                          <BrainCircuit className="w-6 h-6" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold tracking-widest text-violet-400 uppercase animate-pulse">Neural Progress Synchronization</span>
                          </div>
                          <h4 className="text-lg font-bold font-sans text-white">Did you complete this task?</h4>
                          <p className="text-sm font-sans text-slate-300">
                            Scheduled block: <span className="text-cyan-400 font-semibold">"{activePrompt.task.name}"</span> ended at <span className="text-purple-400 font-mono font-semibold">{formatTimeTo12Hour(activePrompt.block.endTime)}</span>.
                          </p>
                        </div>
                      </div>

                      {!showDurationOptions ? (
                        <div className="flex items-center gap-3 relative z-10 pl-16">
                          <button
                            onClick={() => handleCompletePrompt(activePrompt.task.id)}
                            className="px-5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 text-sm font-bold font-sans hover:text-slate-950 transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center gap-1.5"
                          >
                            ✅ Yes, Completed
                          </button>
                          <button
                            onClick={() => setShowDurationOptions(true)}
                            className="px-5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500 text-sm font-bold font-sans hover:text-slate-950 transition-all cursor-pointer shadow-[0_0_15px_rgba(244,63,94,0.1)] hover:shadow-[0_0_20px_rgba(244,63,94,0.3)] flex items-center gap-1.5"
                          >
                            ❌ No
                          </button>
                        </div>
                      ) : (
                        <div className="relative z-10 pl-16 space-y-4">
                          <p className="text-sm font-bold font-sans text-slate-200">How much additional time do you need?</p>
                          
                          {!showCustomInput ? (
                            <div className="flex flex-wrap gap-2">
                              {[
                                { label: '15 mins', val: 15 },
                                { label: '30 mins', val: 30 },
                                { label: '45 mins', val: 45 },
                                { label: '1 hour', val: 60 }
                              ].map(opt => (
                                <button
                                  key={opt.val}
                                  onClick={() => handleRegenerateRemaining(activePrompt.task.id, opt.val)}
                                  disabled={isRegeneratingRemaining}
                                  className="px-4 py-2 text-xs font-mono font-bold rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:text-cyan-400 text-slate-300 transition-all cursor-pointer"
                                >
                                  {opt.label}
                                </button>
                              ))}
                              <button
                                onClick={() => setShowCustomInput(true)}
                                className="px-4 py-2 text-xs font-mono font-bold rounded-lg bg-slate-900 border border-violet-500/30 hover:border-violet-500 hover:text-violet-400 text-slate-300 transition-all cursor-pointer"
                              >
                                Custom duration
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 max-w-sm">
                              <input
                                type="number"
                                placeholder="Minutes"
                                value={customDurationValue}
                                onChange={(e) => setCustomDurationValue(e.target.value)}
                                className="w-28 bg-slate-900 border border-slate-800 focus:border-violet-500/50 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none text-slate-200"
                              />
                              <button
                                onClick={() => {
                                  const mins = parseInt(customDurationValue, 10);
                                  if (mins && mins > 0) {
                                    handleRegenerateRemaining(activePrompt.task.id, mins);
                                  } else {
                                    addToast('warning', 'Please enter a valid duration in minutes.');
                                  }
                                }}
                                disabled={isRegeneratingRemaining}
                                className="px-4 py-2 text-xs font-mono font-bold rounded-xl bg-violet-600 text-white hover:bg-violet-500 transition-all cursor-pointer"
                              >
                                Regenerate
                              </button>
                              <button
                                onClick={() => {
                                  setShowCustomInput(false);
                                  setCustomDurationValue('');
                                }}
                                className="px-3 py-2 text-xs font-mono text-slate-400 hover:text-slate-200 transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })()}

                {aiHistory.length === 0 ? (
                  <div className="p-16 rounded-3xl glass-card border border-slate-800 text-center space-y-4 max-w-2xl mx-auto">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-950/60 border border-violet-500/30 flex items-center justify-center text-violet-400 shadow-[0_0_20px_rgba(168,85,247,0.2)] animate-pulse">
                      <BrainCircuit className="w-8 h-8" />
                    </div>
                    <h4 className="text-lg font-bold font-sans text-white">No Adaptive Timeline Formulated Yet</h4>
                    <p className="text-sm font-sans text-slate-400 leading-relaxed">
                      Initialize the system pipeline to let Gemini structure your workload, detect impossible schedules, configure deep work segments, and recommend where to start immediately.
                    </p>
                    <button
                      onClick={handleGeneratePlan}
                      disabled={isGeneratingPlan}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-bold tracking-wide text-sm shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-all cursor-pointer inline-flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-cyan-200" />
                      <span>INITIALIZE GENERATION</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left 2 Columns: Chronological Timeline blocks */}
                    <div className="lg:col-span-2 space-y-6">
                      <div className="p-6 rounded-2xl glass-card border border-violet-500/10">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                          <h4 className="text-base font-bold font-sans text-white flex items-center gap-2">
                            <Clock className="w-5 h-5 text-purple-400" />
                            Optimized Sequence Timeline
                          </h4>
                          <span className="text-[10px] font-mono text-slate-500 uppercase">
                            Compiled {new Date(aiHistory[0].generatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
                          </span>
                        </div>

                        {/* Chronological Grid List */}
                        <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-800">
                          {aiHistory[0].schedule.map((block, index) => {
                            const isTask = block.type === 'task' || block.type === 'focus';
                            const isCommitment = block.type === 'commitment';
                            const isBreak = block.type === 'break';

                            return (
                              <div key={index} className="flex items-start gap-4 relative group">
                                {/* Bullet indicator on timeline */}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 flex-shrink-0 transition-all duration-300 ${
                                  isCommitment
                                    ? 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                                    : isBreak
                                    ? 'bg-emerald-950 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-pulse'
                                    : 'bg-purple-950 border-purple-500 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                                }`}>
                                  {isCommitment ? <CalendarIcon className="w-4 h-4" /> : isBreak ? <Hourglass className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                                </div>

                                <div className="flex-1 p-5 rounded-2xl bg-slate-950/60 border border-slate-800 group-hover:border-slate-700 transition-colors">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                    <span className="text-xs font-mono font-bold tracking-wider text-slate-400">
                                      {formatTimeTo12Hour(block.startTime)} — {formatTimeTo12Hour(block.endTime)} ({block.duration}m)
                                    </span>
                                    <span className={`self-start sm:self-auto px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest rounded-full ${
                                      isCommitment
                                        ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/20'
                                        : isBreak
                                        ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20'
                                        : 'bg-purple-950/40 text-purple-400 border border-purple-500/20'
                                    }`}>
                                      {block.type}
                                    </span>
                                  </div>
                                  <h5 className="text-base font-bold font-sans text-white">{block.title}</h5>

                                  {/* Deep details & notes if task/commitment */}
                                  {block.notes && (
                                    <p className="text-xs font-sans text-slate-400 mt-2 leading-relaxed">
                                      {block.notes}
                                    </p>
                                  )}

                                  {/* Cyber explanation mapping "Why selected" */}
                                  {block.idRef && aiHistory[0].whySelected[block.idRef] && (
                                    <div className="mt-3.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] font-mono leading-relaxed text-slate-400">
                                      <span className="text-cyan-400 font-bold uppercase mr-1">Coach Notes:</span>
                                      {aiHistory[0].whySelected[block.idRef]}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Right 1 Column: Warnings, Suggestions, Coach Motivation */}
                    <div className="space-y-6">
                      {/* Omitted Overdue Tasks Alert block */}
                      {aiHistory[0].omittedTasks && aiHistory[0].omittedTasks.length > 0 && (
                        <div className="p-6 rounded-2xl bg-amber-950/30 border border-amber-500/20 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl animate-pulse" />
                          <h4 className="text-sm font-mono font-bold tracking-widest text-amber-400 uppercase mb-2 flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-amber-400 animate-pulse" />
                            Overdue - Omitted Tasks
                          </h4>
                          <p className="text-xs font-sans text-slate-300 leading-relaxed mb-4">
                            The following pending tasks passed their deadlines and were not added to the plan. To include them, edit their deadlines:
                          </p>
                          <div className="space-y-3">
                            {aiHistory[0].omittedTasks.map((task) => {
                              const localTask = tasks.find(t => t.id === task.id);
                              return (
                                <div key={task.id} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-semibold text-slate-200 truncate">{task.name}</div>
                                    <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                                      <span>Deadline: {task.deadline} {task.deadlineTime || ''}</span>
                                    </div>
                                  </div>
                                  {localTask && (
                                    <button
                                      onClick={() => startEditingTask(localTask)}
                                      className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 text-[10px] font-mono font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                      <span>Edit</span>
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Interactive Prompt immediately start advice */}
                      <div className="p-6 rounded-2xl bg-gradient-to-br from-violet-950/60 to-purple-950/40 border border-violet-500/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl animate-pulse" />
                        <h4 className="text-sm font-mono font-bold tracking-widest text-cyan-400 uppercase mb-2 flex items-center gap-1.5">
                          <Play className="w-4 h-4 text-cyan-400 animate-pulse" />
                          IMMEDIATE ACTION PROTOCOL
                        </h4>
                        <p className="text-sm font-sans text-slate-200 font-semibold leading-relaxed">
                          Start task "{aiHistory[0].schedule.find(s => s.type === 'task')?.title || 'Deep Work focus slot'}" right now to maximize neuro-temporal alignment.
                        </p>
                      </div>

                      {/* Warnings Block */}
                      {aiHistory[0].warnings && aiHistory[0].warnings.length > 0 && (
                        <div className="p-6 rounded-2xl glass-card border border-rose-500/10">
                          <h4 className="text-sm font-bold font-sans text-white flex items-center gap-2 mb-4 text-rose-400">
                            <AlertCircle className="w-4 h-4" />
                            System Conflict Warnings
                          </h4>
                          <ul className="space-y-3">
                            {aiHistory[0].warnings.map((warn, i) => (
                              <li key={i} className="text-xs font-sans text-slate-400 leading-relaxed flex items-start gap-2">
                                <span className="text-rose-500 select-none mt-1">•</span>
                                <span>{warn}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Suggestions Block */}
                      {aiHistory[0].suggestions && aiHistory[0].suggestions.length > 0 && (
                        <div className="p-6 rounded-2xl glass-card border border-cyan-500/10">
                          <h4 className="text-sm font-bold font-sans text-white flex items-center gap-2 mb-4 text-cyan-400">
                            <Sparkles className="w-4 h-4" />
                            AI Coach Suggestions
                          </h4>
                          <ul className="space-y-3">
                            {aiHistory[0].suggestions.map((sug, i) => (
                              <li key={i} className="text-xs font-sans text-slate-400 leading-relaxed flex items-start gap-2">
                                <span className="text-cyan-400 select-none mt-1">•</span>
                                <span>{sug}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Mode Telemetry */}
                      <div className="p-6 rounded-2xl glass-card border border-slate-800">
                        <h4 className="text-sm font-bold font-sans text-white mb-3">AI Engine Architecture</h4>
                        <div className="space-y-2 font-mono text-[11px] text-slate-400">
                          <div className="flex justify-between py-1 border-b border-slate-900">
                            <span>COACH ENGINE:</span>
                            <span className="text-cyan-400">Gemini-3.5-Flash</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-900">
                            <span>WORK MODE:</span>
                            <span className="text-purple-400 capitalize">{settings.workMode}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-900">
                            <span>STABILITY CONFIDENCE:</span>
                            <span className="text-emerald-400">98.4%</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span>CALENDAR SYNC:</span>
                            <span className="text-slate-400">Durable JSON</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB: Calendar */}
            {activeTab === 'calendar' && (
              <motion.div
                key="calendar"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between pb-4 border-b border-violet-500/10">
                  <div>
                    <h3 className="text-2xl font-bold font-sans text-white">Interactive Telemetry Calendar</h3>
                    <p className="text-sm font-sans text-slate-400 mt-1">
                      Full temporal timeline overview of tasks and anchor events.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handlePrevMonth}
                      className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-lg font-bold font-sans text-white">
                      {currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                    <button
                      onClick={handleNextMonth}
                      className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Monthly Calendar View */}
                <div className="p-6 rounded-3xl glass-card border border-violet-500/10">
                  {/* Day labels header */}
                  <div className="grid grid-cols-7 gap-2 text-center mb-4">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, idx) => (
                      <span key={idx} className="text-xs font-mono text-slate-500 uppercase tracking-widest">
                        {d}
                      </span>
                    ))}
                  </div>

                  {/* Calendar Matrix */}
                  <div className="grid grid-cols-7 gap-3">
                    {/* Empty padding blocks for offsets */}
                    {Array.from({ length: getFirstDayOfMonth(currentCalendarDate) }).map((_, idx) => (
                      <div key={`empty-${idx}`} className="h-28 rounded-2xl bg-slate-950/20 border border-slate-900/10" />
                    ))}

                    {/* Actual days */}
                    {Array.from({ length: getDaysInMonth(currentCalendarDate) }).map((_, idx) => {
                      const dayNumber = idx + 1;
                      const dateString = `${currentCalendarDate.getFullYear()}-${(currentCalendarDate.getMonth() + 1).toString().padStart(2, '0')}-${dayNumber.toString().padStart(2, '0')}`;

                      // Match tasks and commitments for this day
                      const dayTasks = tasks.filter(t => t.deadline === dateString);
                      const dayCommits = commitments.filter(c => c.date === dateString);
                      const isToday = new Date().toISOString().split('T')[0] === dateString;

                      return (
                        <div
                          key={`day-${dayNumber}`}
                          className={`h-28 rounded-2xl p-2 bg-slate-950/40 border transition-all duration-300 flex flex-col justify-between overflow-hidden relative ${
                            isToday
                              ? 'border-purple-500/60 shadow-[0_0_15px_rgba(139,92,246,0.15)] bg-purple-950/10'
                              : 'border-slate-900 hover:border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-mono font-bold ${isToday ? 'text-purple-400' : 'text-slate-500'}`}>
                              {dayNumber}
                            </span>
                            {isToday && (
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                            )}
                          </div>

                          {/* Mini lists inside cell */}
                          <div className="space-y-1 overflow-y-auto custom-scrollbar flex-grow mt-1 pr-0.5">
                            {dayCommits.map(c => (
                              <button
                                key={c.id}
                                onClick={() => startEditingCommitment(c)}
                                className="w-full text-left px-1.5 py-0.5 rounded text-[8px] font-sans font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-500/20 hover:border-cyan-400/50 transition-colors cursor-pointer truncate block"
                                title={`Commitment: ${c.title} (Click to Edit)`}
                              >
                                {formatTimeTo12Hour(c.startTime)} {c.title}
                              </button>
                            ))}
                            {dayTasks.map(t => (
                              <button
                                key={t.id}
                                onClick={() => startEditingTask(t)}
                                className={`w-full text-left px-1.5 py-0.5 rounded text-[8px] font-sans font-semibold hover:border-purple-400/50 transition-colors cursor-pointer truncate block ${
                                  t.status === 'completed'
                                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/20 line-through'
                                    : 'bg-purple-950/80 text-purple-300 border border-purple-500/20'
                                }`}
                                title={`Task: ${t.name} (Click to Edit)`}
                              >
                                {t.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB: Analytics */}
            {activeTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-8"
              >
                <div>
                  <h3 className="text-2xl font-bold font-sans text-white">Neural Telemetry Analytics</h3>
                  <p className="text-sm font-sans text-slate-400 mt-1">
                    Track schedule optimization rates, active focus blocks, and completion metrics.
                  </p>
                </div>

                {/* Score Grid Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Productivity Score */}
                  <div className="p-6 rounded-2xl glass-card border border-purple-500/10 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-1">Productivity Index</p>
                      <h4 className="text-3xl font-extrabold font-sans text-white">{productivityScore} / 100</h4>
                      <p className="text-xs font-sans text-purple-400 mt-2">Nominal performance reserve</p>
                    </div>
                    <Flame className="w-10 h-10 text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)] animate-pulse" />
                  </div>

                  {/* Focus Hours */}
                  <div className="p-6 rounded-2xl glass-card border border-cyan-500/10 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-1">Focus Time Logged</p>
                      <h4 className="text-3xl font-extrabold font-sans text-white">{focusHours} Hours</h4>
                      <p className="text-xs font-sans text-cyan-400 mt-2">Active cognitive concentration</p>
                    </div>
                    <Hourglass className="w-10 h-10 text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                  </div>

                  {/* Achievements */}
                  <div className="p-6 rounded-2xl glass-card border border-emerald-500/10 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-1">Active Streaks</p>
                      <h4 className="text-3xl font-extrabold font-sans text-white">{activeStreak}-Day Loop</h4>
                      <p className="text-xs font-sans text-emerald-400 mt-2">Consistent schedule completion</p>
                    </div>
                    <Award className="w-10 h-10 text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-bounce" />
                  </div>
                </div>

                {/* Additional Telemetry Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl glass-card border border-slate-800 flex flex-col justify-between">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Completion Rate</span>
                    <span className="text-xl font-bold font-sans text-purple-400 mt-2">{completionRate}%</span>
                  </div>
                  <div className="p-4 rounded-xl glass-card border border-slate-800 flex flex-col justify-between">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Completed Today</span>
                    <span className="text-xl font-bold font-sans text-emerald-400 mt-2">{tasksCompletedToday} Task{tasksCompletedToday === 1 ? '' : 's'}</span>
                  </div>
                  <div className="p-4 rounded-xl glass-card border border-slate-800 flex flex-col justify-between">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Pending Workload</span>
                    <span className="text-xl font-bold font-sans text-amber-400 mt-2">{pendingTasks} Active</span>
                  </div>
                  <div className="p-4 rounded-xl glass-card border border-slate-800 flex flex-col justify-between">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Time Allocation</span>
                    <span className="text-xl font-bold font-sans text-cyan-400 mt-2">{totalCompletedHours}h / {totalPlannedHours}h</span>
                  </div>
                  
                  <div className="p-4 rounded-xl glass-card border border-slate-800 flex flex-col justify-between">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Missed Deadlines</span>
                    <span className="text-xl font-bold font-sans text-rose-400 mt-2">{missedDeadlinesCount}</span>
                  </div>
                  <div className="p-4 rounded-xl glass-card border border-slate-800 flex flex-col justify-between">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Upcoming Deadlines</span>
                    <span className="text-xl font-bold font-sans text-blue-400 mt-2">{upcomingDeadlinesCount}</span>
                  </div>
                  <div className="p-4 rounded-xl glass-card border border-slate-800 flex flex-col justify-between">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Peak Velocity Day</span>
                    <span className="text-base font-bold font-sans text-violet-400 mt-2 truncate">{mostProductiveDay}</span>
                  </div>
                  <div className="p-4 rounded-xl glass-card border border-slate-800 flex flex-col justify-between">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Peak Cognitive Time</span>
                    <span className="text-base font-bold font-sans text-yellow-400 mt-2 truncate">{mostProductiveTimeOfDay}</span>
                  </div>
                </div>

                {/* Recharts Plots */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Plot 1: Focus Hours Over Time */}
                  <div className="p-6 rounded-3xl glass-card border border-slate-800">
                    <h4 className="text-base font-bold font-sans text-white mb-6">Task Completion velocity</h4>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={weeklyCompletionData}>
                          <defs>
                            <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                          <YAxis stroke="#64748b" fontSize={11} />
                          <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px' }} />
                          <Area type="monotone" dataKey="completed" stroke="#8B5CF6" fillOpacity={1} fill="url(#colorCompleted)" strokeWidth={2} />
                          <Area type="monotone" dataKey="targeted" stroke="#0ea5e9" strokeDasharray="5 5" fill="none" strokeWidth={1.5} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Plot 2: Category distribution */}
                  <div className="p-6 rounded-3xl glass-card border border-slate-800">
                    <h4 className="text-base font-bold font-sans text-white mb-6">Category Allocation Profile</h4>
                    <div className="h-80">
                      {categoryDistributionData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                          Add tasks with categories to analyze allocation profiles.
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoryDistributionData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {categoryDistributionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={TREND_COLORS[index % TREND_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px' }}
                              formatter={(value: any, name: any, props: any) => [`${value} mins (${props.payload.percentage}%)`, name]}
                            />
                            <Legend formatter={(value) => <span className="text-slate-300 font-sans text-xs">{value}</span>} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>

                {/* Grid 2: Consistency Matrix & Deadline Prediction */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Neural Consistency Matrix */}
                  <div className="p-6 rounded-3xl glass-card border border-slate-800 flex flex-col justify-between">
                    <div>
                      <h4 className="text-base font-bold font-sans text-white mb-2">Neural Consistency Matrix</h4>
                      <p className="text-xs font-sans text-slate-400 mb-6">Historical completed tasks mapped across active tracking loops.</p>
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto pb-2">
                      {consistencyMatrixData.map((item, idx) => {
                        const completedCount = item.completedCount;
                        const level = Math.min(3, completedCount);
                        const glowColors = [
                          'bg-slate-900 border-slate-800/80 text-slate-500',
                          'bg-purple-950/40 border-purple-500/20 text-purple-400',
                          'bg-purple-900/60 border-purple-500/40 text-purple-300',
                          'bg-purple-600 border-purple-400 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                        ];

                        return (
                          <div
                            key={idx}
                            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center border text-[10px] font-mono flex-shrink-0 transition-all ${glowColors[level]}`}
                            title={`${item.formattedDate}: ${completedCount} task${completedCount === 1 ? '' : 's'} completed`}
                          >
                            <span className="opacity-60 text-[8px] uppercase">D{item.dayNum}</span>
                            <span className="font-bold text-xs">{completedCount}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Deadline Prediction Card */}
                  <div className="p-6 rounded-3xl glass-card border border-slate-800 flex flex-col">
                    <h4 className="text-base font-bold font-sans text-white mb-2">Deadline Prediction</h4>
                    <p className="text-xs font-sans text-slate-400 mb-6">AI-calculated probabilities of completing pending milestones on time.</p>
                    
                    <div className="flex-1 overflow-y-auto max-h-[26rem] space-y-3 pr-1">
                      {deadlinePredictions.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-500 text-sm italic py-8">
                          No pending tasks to predict deadlines for.
                        </div>
                      ) : (
                        deadlinePredictions.map(({ task, probability, indicator, colorClass, availableTime, totalMinutes, commitmentsMinutes }) => {
                          const isExpanded = expandedPredictionTaskId === task.id;
                          return (
                            <div 
                              key={task.id} 
                              className="rounded-2xl border border-slate-800/50 bg-slate-950/40 hover:border-slate-700/60 overflow-hidden transition-all duration-200"
                            >
                              <div 
                                onClick={() => setExpandedPredictionTaskId(isExpanded ? null : task.id)}
                                className="flex items-center justify-between p-3 cursor-pointer select-none hover:bg-slate-900/30 transition-colors"
                              >
                                <span className="text-sm font-semibold text-slate-200 truncate pr-4">{task.name}</span>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className={`px-3 py-1 rounded-full border text-xs font-mono font-bold flex items-center gap-1.5 ${colorClass}`}>
                                    <span>{indicator}</span>
                                    <span>{probability}%</span>
                                  </span>
                                </div>
                              </div>

                              <AnimatePresence initial={false}>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25, ease: "easeInOut" }}
                                    className="border-t border-slate-900 bg-slate-950/80"
                                  >
                                    <div className="p-4 space-y-3 text-xs font-sans text-slate-300">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                                        <div className="flex justify-between border-b border-slate-900/50 pb-1">
                                          <span className="text-slate-400 font-mono">Current Time:</span>
                                          <span className="font-semibold text-slate-200">{timeState.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-900/50 pb-1">
                                          <span className="text-slate-400 font-mono">Deadline:</span>
                                          <span className="font-semibold text-slate-200">{getFriendlyDeadline(task, todayDateStr)}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-900/50 pb-1">
                                          <span className="text-slate-400 font-mono">Estimated Time Required:</span>
                                          <span className="font-semibold text-slate-200">{formatFriendlyDuration(task.duration)}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-900/50 pb-1">
                                          <span className="text-slate-400 font-mono">Available Time Before Deadline:</span>
                                          <span className="font-semibold text-slate-200">{formatFriendlyDuration(totalMinutes)}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-900/50 pb-1">
                                          <span className="text-slate-400 font-mono">Existing Commitments Before Deadline:</span>
                                          <span className="font-semibold text-slate-200">{formatFriendlyDuration(commitmentsMinutes)}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-900/50 pb-1">
                                          <span className="text-slate-400 font-mono">Remaining Free Time:</span>
                                          <span className="font-semibold text-slate-200">{formatFriendlyDuration(availableTime)}</span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 pt-1 border-t border-slate-900/50">
                                        <span className="text-slate-400 font-mono">AI Completion Probability:</span>
                                        <span className={`font-bold font-mono px-2 py-0.5 rounded border text-xs ${colorClass}`}>
                                          {probability}%
                                        </span>
                                      </div>

                                      <p className="text-slate-400 leading-relaxed border-l-2 border-purple-500/30 pl-2 py-0.5 mt-2 italic">
                                        {getContextualExplanation(task, probability, availableTime)}
                                      </p>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB: Settings */}
            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="max-w-3xl mx-auto"
              >
                <div className="p-8 rounded-3xl glass-card border border-violet-500/10 shadow-[0_0_40px_rgba(139,92,246,0.05)]">
                  <div className="flex items-center gap-3 mb-6">
                    <Sliders className="w-6 h-6 text-purple-400" />
                    <h3 className="text-2xl font-bold font-sans text-white">Neural Settings Configuration</h3>
                  </div>

                  <form onSubmit={handleSaveSettings} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-mono text-slate-400 uppercase tracking-widest">Operator Name</label>
                      <input
                        type="text"
                        required
                        value={settings.userName}
                        onChange={(e) => setSettings({ ...settings, userName: e.target.value })}
                        className="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500/50 rounded-xl px-4 py-3 text-sm font-sans focus:outline-none text-slate-200 transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-mono text-slate-400 uppercase tracking-widest">Productivity Target / Strategic Goal</label>
                      <input
                        type="text"
                        required
                        value={settings.productivityGoal}
                        onChange={(e) => setSettings({ ...settings, productivityGoal: e.target.value })}
                        className="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500/50 rounded-xl px-4 py-3 text-sm font-sans focus:outline-none text-slate-200 transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-mono text-slate-400 uppercase tracking-widest">Operation Mode</label>
                        <select
                          value={settings.workMode}
                          onChange={(e) => setSettings({ ...settings, workMode: e.target.value as any })}
                          className="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500/50 rounded-xl px-4 py-3 text-sm focus:outline-none text-slate-300 transition-colors"
                        >
                          <option value="work">Work Mode (Productivity Balance)</option>
                          <option value="study">Study Mode (More break blocks)</option>
                          <option value="exam">Exam Mode (Maximum concentration intervals)</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-mono text-slate-400 uppercase tracking-widest">Focus Block Target (m)</label>
                        <input
                          type="number"
                          required
                          min="10"
                          max="120"
                          value={settings.focusDuration}
                          onChange={(e) => setSettings({ ...settings, focusDuration: Number(e.target.value) })}
                          className="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500/50 rounded-xl px-4 py-3 text-sm focus:outline-none text-slate-300 transition-colors"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-mono text-slate-400 uppercase tracking-widest">Break Block Target (m)</label>
                        <input
                          type="number"
                          required
                          min="2"
                          max="60"
                          value={settings.breakDuration}
                          onChange={(e) => setSettings({ ...settings, breakDuration: Number(e.target.value) })}
                          className="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500/50 rounded-xl px-4 py-3 text-sm focus:outline-none text-slate-300 transition-colors"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-bold tracking-wide text-sm transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] cursor-pointer font-sans"
                    >
                      Save Settings
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* TAB: AI Coach Chat */}
            {activeTab === 'chat' && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-14rem)] min-h-[500px]"
              >
                {/* Header Banner */}
                <div className="p-6 rounded-t-3xl bg-slate-900 border border-violet-500/10 border-b-0 relative overflow-hidden flex items-center justify-between gap-4">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl" />
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      <Bot className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold font-sans text-white flex items-center gap-1.5">
                        DeadlineAI Coach Chat
                        <span className="px-2 py-0.5 text-[9px] font-mono tracking-widest font-semibold uppercase rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-400/30 animate-pulse">
                          Online
                        </span>
                      </h3>
                      <p className="text-xs font-sans text-slate-400 mt-0.5">
                        Cybernetic companion for relentless positivity and absolute momentum.
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-400">
                    <Heart className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                    <span>Always Positive Mode</span>
                  </div>
                </div>

                {/* Messages Panel */}
                <div className="flex-1 bg-slate-950/40 border border-violet-500/10 p-6 overflow-y-auto space-y-4 flex flex-col">
                  {chatMessages.map((msg) => {
                    const isAssistant = msg.role === 'assistant';
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 max-w-[85%] ${
                          isAssistant ? 'self-start' : 'self-end flex-row-reverse'
                        }`}
                      >
                        {/* Avatar */}
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            isAssistant
                              ? 'bg-gradient-to-tr from-violet-600 to-cyan-500 text-white'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {isAssistant ? <Bot className="w-4 h-4" /> : (settings.userName ? settings.userName.substring(0, 2).toUpperCase() : 'ME')}
                        </div>

                        {/* Content block */}
                        <div className="space-y-1">
                          <div
                            className={`p-4 rounded-2xl text-sm font-sans leading-relaxed whitespace-pre-wrap ${
                              isAssistant
                                ? 'bg-slate-900 border border-violet-500/15 text-slate-200 rounded-tl-none'
                                : 'bg-gradient-to-br from-violet-950/80 to-purple-950/60 border border-violet-500/20 text-white rounded-tr-none'
                            }`}
                          >
                            {msg.content}
                          </div>
                          <p className="text-[9px] font-mono text-slate-500 px-1">
                            {msg.timestamp}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {/* Loading/Typing State */}
                  {isChatLoading && (
                    <div className="flex gap-3 max-w-[80%] self-start">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-cyan-500 text-white flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 animate-spin" />
                      </div>
                      <div className="bg-slate-900 border border-violet-500/15 p-4 rounded-2xl rounded-tl-none flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Suggestions drawer */}
                <div className="p-4 bg-slate-950 border-x border-violet-500/10 border-b border-b-slate-900 flex flex-wrap gap-2">
                  <span className="text-[10px] font-mono text-slate-500 self-center uppercase tracking-widest mr-2">Quick Signals:</span>
                  {[
                    { text: "I'm feeling demotivated", label: "😞 Demotivated" },
                    { text: "I'm exhausted and tired", label: "🔋 Low energy" },
                    { text: "I feel overwhelmed with tasks", label: "🤯 Overwhelmed" },
                    { text: "Give me a super boost!", label: "🚀 Power boost" }
                  ].map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendChatMessage(s.text)}
                      disabled={isChatLoading}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-violet-950/40 border border-slate-800 hover:border-violet-500/30 text-xs font-medium text-slate-300 hover:text-purple-300 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Footer Input Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendChatMessage();
                  }}
                  className="p-4 rounded-b-3xl bg-slate-900 border border-violet-500/10 border-t-0 flex items-center gap-3"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Transmit encouragement signals, share progress, or vent to coach..."
                    disabled={isChatLoading}
                    className="flex-1 bg-slate-950/90 border border-slate-800 focus:border-purple-500/50 rounded-xl px-4 py-3.5 text-sm focus:outline-none text-slate-300 transition-colors placeholder:text-slate-500 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isChatLoading}
                    className="p-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] cursor-pointer disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none flex items-center justify-center"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Feasibility Check Modal Overlay */}
      <AnimatePresence>
        {showFeasibilityModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-violet-500/20 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden flex flex-col gap-6 text-left max-h-[90vh]"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/5 rounded-full blur-[80px] pointer-events-none" />
              
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-sans text-white">
                    Neural-Temporal Scheduling Conflicts
                  </h3>
                  <p className="text-xs font-sans text-slate-400 mt-1">
                    Our real-time feasibility engine has detected scheduling anomalies. The following pending tasks cannot be completed before their designated deadlines given your current commitments.
                  </p>
                </div>
              </div>

              {/* Scrollable Issues List */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[45vh]">
                {feasibilityIssues.map((issue) => {
                  const taskId = issue.task.id;
                  const resolution = feasibilityResolutions[taskId] || 'work_until_deadline';
                  const formatMinutes = (m: number) => {
                    if (m <= 0) return '0 minutes';
                    const hrs = Math.floor(m / 60);
                    const mins = m % 60;
                    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins} mins`;
                  };
                  return (
                    <div 
                      key={taskId} 
                      className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-violet-500/15 transition-all space-y-3.5"
                    >
                      {/* Task Info */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold font-sans text-white">
                            {issue.task.name}
                          </h4>
                          <div className="flex items-center gap-1.5 text-xs text-rose-400 font-mono">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Deadline: {issue.deadline} at {issue.deadlineTime}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400">
                            Required: {formatMinutes(issue.requiredDuration)}
                          </span>
                          <span className={`px-2.5 py-1 rounded-lg border ${
                            issue.availableTime <= 0 
                              ? 'bg-rose-950/25 border-rose-500/20 text-rose-400' 
                              : 'bg-amber-950/25 border-amber-500/20 text-amber-400'
                          }`}>
                            Available: {formatMinutes(issue.availableTime)}
                          </span>
                        </div>
                      </div>

                      {/* Explanation */}
                      <p className="text-xs font-sans text-slate-400 leading-relaxed italic bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/40">
                        {issue.availableTime <= 0 
                          ? `The deadline has either passed, is too close, or existing calendar commitments have fully blocked your remaining schedule. This task is impossible to allocate.`
                          : `You require ${formatMinutes(issue.requiredDuration)}, but only ${formatMinutes(issue.availableTime)} of unblocked scheduling time is available before its deadline.`
                        }
                      </p>

                      {/* Options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => setFeasibilityResolutions(prev => ({ ...prev, [taskId]: 'work_until_deadline' }))}
                          className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            resolution === 'work_until_deadline'
                              ? 'bg-violet-950/40 border-violet-500/40 shadow-[0_0_15px_rgba(139,92,246,0.1)]'
                              : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/70 hover:border-slate-700'
                          }`}
                        >
                          <span className={`text-xs font-bold font-sans flex items-center gap-1.5 ${
                            resolution === 'work_until_deadline' ? 'text-violet-300' : 'text-slate-300'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${resolution === 'work_until_deadline' ? 'bg-violet-400' : 'bg-slate-500'}`} />
                            1. Work Until Deadline (Recommended)
                          </span>
                          <span className="text-[10px] font-sans text-slate-400 leading-normal pl-3">
                            Schedule work segments only up to {issue.deadlineTime} (Max {formatMinutes(issue.availableTime)}).
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFeasibilityResolutions(prev => ({ ...prev, [taskId]: 'skip' }))}
                          className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            resolution === 'skip'
                              ? 'bg-slate-950 border-slate-700/80 text-slate-400 shadow-[0_0_15px_rgba(255,255,255,0.02)]'
                              : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/70 hover:border-slate-700'
                          }`}
                        >
                          <span className={`text-xs font-bold font-sans flex items-center gap-1.5 ${
                            resolution === 'skip' ? 'text-slate-300' : 'text-slate-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${resolution === 'skip' ? 'bg-slate-300' : 'bg-slate-600'}`} />
                            2. Skip This Task
                          </span>
                          <span className="text-[10px] font-sans text-slate-400 leading-normal pl-3">
                            Completely exclude this task from today's timeline and optimize other tasks.
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-slate-800/60 pt-4">
                <button
                  type="button"
                  onClick={() => setShowFeasibilityModal(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 transition-colors text-xs font-mono uppercase tracking-widest cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setShowFeasibilityModal(false);
                    await executePlanGeneration(feasibilityResolutions);
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-bold tracking-wide text-xs uppercase font-mono transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] cursor-pointer"
                >
                  Resolve &amp; Generate Schedule
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Animated Toast Notification System */}
      <NotificationToast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
