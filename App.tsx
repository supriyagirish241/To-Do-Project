import React, { useEffect, useMemo, useState, useRef } from 'react';
import { AnimatePresence, motion, Reorder } from 'framer-motion';
import { Sidebar } from './components/layout/Sidebar';
import { TaskItem } from './components/task/TaskItem';
import { TaskInput } from './components/task/TaskInput';
import { FocusMode } from './components/features/focus/FocusMode';
import { Insights } from './components/features/insights/Insights';
import { CalendarView } from './components/features/calendar/CalendarView';
import { HelpView } from './components/features/help/HelpView';
import { Badge } from './components/ui/Badge';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { InputDialog } from './components/ui/InputDialog';
import { AlertDialog } from './components/ui/AlertDialog';
import { useStore } from './store';
import { View, Priority, Task, Recurrence } from './types';
import { isToday, isFuture, format, isValid } from 'date-fns';
import { isOverdue } from './utils/dateUtils';
import {
  Search, Bell, Moon, Sun, CheckCircle2, Menu, ListChecks,
  Trash2, CheckCircle, X, Download, Upload, Zap, Save, Sparkles,
  ArrowRight, Loader2, Plus, Minus, Filter, Edit2, Palette, ChevronRight,
  Calendar, Flag, Check, LayoutList, Repeat, CircleHelp
} from 'lucide-react';
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/features/auth/login";
import Signup from "./components/features/auth/signup";
import ForgotPassword from "./components/features/auth/ForgotPassword";
import { getCurrentUser, logout } from "./api/auth";

// Sound utility with lazy singleton AudioContext
let audioCtx: AudioContext | null = null;
const playSound = (freq = 440, type: OscillatorType = 'sine', duration = 0.2, vol = 0.1) => {
  try {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (!audioCtx) return;

    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.error("Audio play failed", e);
  }
};

const App: React.FC = () => {
  const {
    activeView, tasks, tags, setView, theme, setTheme, accentColor, setAccentColor,
    updateStreak, streak, dailyGoal, setDailyGoal, bulkDelete, bulkToggle, importData,
    updateTask, reorderTasks, toggleSubtask, generateAIActionPlan, deleteTask, // Added deleteTask
    searchQuery, setSearchQuery, filterTagId, setFilterTagId, updateTag, deleteTag,
    addTag, focusState, tickFocusTimer, setFocusState,  loadTags, loadSettings
  } = useStore();

console.log("TAGS:", tags);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showGoalCelebration, setShowGoalCelebration] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [user, setUser] = useState<any>(null);


  // Dialog States
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDanger?: boolean;
    confirmLabel?: string;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

  const [inputDialog, setInputDialog] = useState<{
    isOpen: boolean;
    title: string;
    placeholder?: string;
    onSubmit: (value: string) => void;
  }>({ isOpen: false, title: '', onSubmit: () => { } });

  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({ isOpen: false, title: '', message: '' });

  // Subtask Editing State
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [tempSubtaskTitle, setTempSubtaskTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevCompletedCountRef = useRef(tasks.filter(t => t.completed).length);

  // Global Timer Tick Effect
  useEffect(() => {
    if (!focusState.isActive) return;
    const interval = setInterval(tickFocusTimer, 1000);
    return () => clearInterval(interval);
  }, [focusState.isActive, tickFocusTimer]);

  // Global Timer Completion Check Effect
  useEffect(() => {
    if (focusState.isActive && focusState.timeLeft === 0) {
      setFocusState({ isActive: false });
      playSound(880, 'square', 0.5, 0.2);
      setTimeout(() => playSound(587, 'sine', 0.8, 0.2), 600);

      if (focusState.mode === 'work') {
        setFocusState({ mode: 'break', timeLeft: 5 * 60 });
      } else {
        setFocusState({ mode: 'work', timeLeft: 25 * 60 });
      }
    }
  }, [focusState.isActive, focusState.timeLeft, focusState.mode, setFocusState]);

  // Task Completion Sound Logic
  useEffect(() => {
    const currentCompleted = tasks.filter(t => t.completed).length;
    if (currentCompleted > prevCompletedCountRef.current) {
      playSound(1200, 'sine', 0.1, 0.05); // Subtle success ping
      setTimeout(() => playSound(1800, 'sine', 0.15, 0.05), 100);
    }
    prevCompletedCountRef.current = currentCompleted;
  }, [tasks]);

  // Responsive Sidebar Logic
  useEffect(() => {
    const handleResize = () => {
      // Only auto-close on mobile, don't force open on desktop to respect user toggle
      if (window.innerWidth < 1024 && sidebarOpen) {
        setSidebarOpen(false);
      }
      if (window.innerWidth >= 1024 && !sidebarOpen) {
        // Optional: decide if we want to auto-open on resize to desktop. 
        // For now, let's allow it to be consistent with initial state, 
        // but checking if it was user-initiated might be better. 
        // Keeping it simple: if you resize to desktop, sidebar opens.
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (editingSubtaskId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingSubtaskId]);
  useEffect(() => {
  getCurrentUser().then((u) => setUser(u));
}, []);
  useEffect(() => {
  if (user) {
    loadTags();   // ✅ only after login
  }
}, [user]);
useEffect(() => {
  console.log("TAGS:", tags);
}, [tags]);
  const handleMobileNav = () => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleExport = () => {
    const data = {
      tasks: useStore.getState().tasks,
      tags: useStore.getState().tags,
      theme: useStore.getState().theme,
      accentColor: useStore.getState().accentColor,
      streak: useStore.getState().streak,
      dailyGoal: useStore.getState().dailyGoal,
      lastCompletedDate: useStore.getState().lastCompletedDate,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `todos-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        importData(data);
        setAlertDialog({
          isOpen: true,
          title: 'Import Successful',
          message: 'Your data has been successfully imported!'
        });
      } catch (err) {
        setAlertDialog({
          isOpen: true,
          title: 'Import Failed',
          message: 'Failed to import data. Please check the file format.'
        });
      }
    };
    reader.readAsText(file);
  };

  const handleAIActionPlan = async () => {
    if (!editingTask) return;
    await generateAIActionPlan(editingTask.id);
    const updatedTask = useStore.getState().tasks.find(t => t.id === editingTask.id);
    if (updatedTask) {
      setEditingTask(updatedTask);
    }
  };

  // Subtask Handlers
  const handleAddSubtask = () => {
    if (!editingTask) return;
    const newId = crypto.randomUUID();
    const newSubtask = { id: newId, title: '', completed: false };
    const updated = { ...editingTask, subtasks: [...(editingTask.subtasks || []), newSubtask] };
    setEditingTask(updated);
    setEditingSubtaskId(newId);
    setTempSubtaskTitle('');
  };

  const handleStartEditSubtask = (sub: { id: string, title: string }) => {
    setEditingSubtaskId(sub.id);
    setTempSubtaskTitle(sub.title);
  };

  const handleSaveSubtask = (id: string) => {
    if (!editingTask) return;

    let newSubtasks = [...(editingTask.subtasks || [])];

    if (!tempSubtaskTitle.trim()) {
      newSubtasks = newSubtasks.filter(s => s.id !== id);
    } else {
      newSubtasks = newSubtasks.map(s => s.id === id ? { ...s, title: tempSubtaskTitle.trim() } : s);
    }

    const updated = { ...editingTask, subtasks: newSubtasks };
    setEditingTask(updated);
    updateTask(editingTask.id, updated);
    setEditingSubtaskId(null);
    setTempSubtaskTitle('');
  };

  const handleKeyDownSubtask = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleSaveSubtask(id);
    }
  };

  const completedToday = useMemo(() =>
    tasks.filter(t => {
      if (!t.completed || !t.completedAt) return false;
      const d = new Date(t.completedAt);
      return isValid(d) && isToday(d);
    }).length
    , [tasks]);

  useEffect(() => {
    if (completedToday >= dailyGoal && dailyGoal > 0) {
      const hasCelebratedToday = localStorage.getItem(`celebrated-${format(new Date(), 'yyyy-MM-dd')}`);
      if (!hasCelebratedToday) {
        setShowGoalCelebration(true);
        localStorage.setItem(`celebrated-${format(new Date(), 'yyyy-MM-dd')}`, 'true');
        setTimeout(() => setShowGoalCelebration(false), 5000);
      }
    }
  }, [completedToday, dailyGoal]);

  useEffect(() => {
    updateStreak();
  }, [tasks, updateStreak]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();

      // Close modal on navigation shortcut
      if (['i', 't', 'f', 's'].includes(key)) {
        setEditingTask(null);
      }

      if (key === 'i') setView('inbox');
      if (key === 't') setView('today');
      if (key === 'f') setView('focus');
      if (key === 's') setView('settings');
      if (key === 'b') setSidebarOpen(prev => !prev);

      if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
          searchInput.focus();
        } else {
          // If search input isn't rendered (e.g. in Settings/Help), go to inbox first
          setEditingTask(null);
          setView('inbox');
          setTimeout(() => document.getElementById('search-input')?.focus(), 50);
        }
      }

      if (e.key === 'Escape') {
        setSelectionMode(false);
        setSelectedIds([]);
        setEditingTask(null);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setView, setSearchQuery]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredTasks = useMemo(() => {
    let result = tasks;

    switch (activeView) {
      case 'today':
        result = result.filter(t => {
          if (t.completed || !t.dueDate) return false;
          const d = new Date(t.dueDate);
          return isValid(d) && isToday(d);
        });
        break;
      case 'upcoming':
        result = result.filter(t => {
          if (t.completed || !t.dueDate) return false;
          const d = new Date(t.dueDate);
          return isValid(d) && (isFuture(d) || isToday(d));
        });
        break;
      case 'overdue':
        result = result.filter(t => !t.completed && isOverdue(t.dueDate));
        break;
      case 'completed':
        result = result.filter(t => t.completed);
        break;
      case 'inbox':
      default:
        result = result.filter(t => !t.completed);
    }

    if (filterTagId) {
      result = result.filter(t => t.tags?.includes(filterTagId));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [tasks, activeView, filterTagId, searchQuery]);

  const sortedTasks = useMemo(() => {
    if (activeView === 'completed') {
      return [...filteredTasks].sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
    }
    if (activeView === 'overdue') {
      return [...filteredTasks].sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
    }
    return [...filteredTasks].sort((a, b) => a.position - b.position);
  }, [filteredTasks, activeView]);

  const handleReorder = (newOrderedList: Task[]) => {
    reorderTasks(newOrderedList);
  };

  const activeTagName = useMemo(() => {
    if (!filterTagId) return null;
    return tags.find(t => t.id === filterTagId)?.name;
  }, [filterTagId, tags]);

  const renderContent = () => {
    if (activeView === 'focus') return <FocusMode />;
    if (activeView === 'insights') return <Insights />;
    if (activeView === 'help') return <HelpView />;
    if (activeView === 'settings') return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 max-w-2xl mx-auto dark:text-neutral-200 pb-32">
        <header className="mb-10">
          <h1 className="text-3xl font-black tracking-tight mb-2">Settings</h1>
          <p className="text-neutral-500">Configure your local productivity engine.</p>
         <button
 className="lg:hidden p-2 mr-2 rounded-xl hover:bg-white/10"
  onClick={() => setSidebarOpen(true)}
>
  <Menu size={24} />
</button>
        </header>

        <div className="space-y-8">
          <section className="bg-white dark:bg-neutral-800 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-700 p-8 shadow-sm">
            <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-8">Interface & Theme</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-5 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-100 text-amber-500'}`}>
                    {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
                  </div>
                  <div>
                    <p className="font-bold text-sm">Appearance Mode</p>
                    <p className="text-xs text-neutral-500">Switch between light and dark.</p>
                  </div>
                </div>
                <button
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  className={`w-12 h-6 rounded-full transition-colors relative ${theme === 'dark' ? 'bg-accent' : 'bg-neutral-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${theme === 'dark' ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="p-5 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 bg-accent/10 text-accent rounded-xl flex items-center justify-center">
                    <Palette size={20} />
                  </div>
                  <p className="font-bold text-sm">System Accent</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#ef4444'].map(color => (
                    <button
                      key={color}
                      onClick={() => setAccentColor(color)}
                      className={`w-10 h-10 rounded-xl border-2 transition-all ${accentColor === color ? 'scale-110 border-white ring-2 ring-accent' : 'border-transparent opacity-60 hover:opacity-100'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-neutral-800 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-700 p-8 shadow-sm">
            <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-8">Momentum Goal</h3>
            <div className="p-5 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <p className="font-bold text-sm">Daily Target</p>
                <Badge variant="primary" className="px-3 py-1 font-black">{dailyGoal} TASKS</Badge>
              </div>
              <input
                type="range" min="1" max="15" step="1"
                value={dailyGoal}
                onChange={(e) => setDailyGoal(parseInt(e.target.value))}
                className="w-full accent-accent h-2 rounded-full"
              />
            </div>
          </section>

          <section className="bg-white dark:bg-neutral-800 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-700 p-8 shadow-sm">
            <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-8">Tag Management</h3>
            <div className="space-y-3">
              {tags.map(tag => (
                <div key={tag.id} className="flex items-center gap-4 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-700 group">
                  <input
                    type="color"
                    value={tag.color}
                    onChange={(e) => updateTag(tag.id, tag.name, e.target.value)}
                    className="w-8 h-8 rounded-lg overflow-hidden border-none cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={tag.name}
                    onChange={(e) => updateTag(tag.id, e.target.value, tag.color)}
                    className="flex-1 bg-transparent border-none outline-none font-bold text-sm text-neutral-700 dark:text-neutral-200"
                  />
                  <button
                    onClick={() => setConfirmDialog({
                      isOpen: true,
                      title: 'Delete Tag?',
                      message: `Are you sure you want to delete "${tag.name}"? Tasks with this tag will not be deleted.`,
                      isDanger: true,
                      confirmLabel: 'Delete',
                      onConfirm: () => deleteTag(tag.id)
                    })}
                    className="p-2 text-neutral-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  setInputDialog({
                    isOpen: true,
                    title: 'New Tag Name',
                    placeholder: 'e.g., Work, Personal...',
                    onSubmit: (name) => addTag(name, accentColor)
                  });
                }}
                className="w-full py-4 border-2 border-dashed border-neutral-100 dark:border-neutral-700 rounded-2xl text-neutral-400 text-xs font-black uppercase tracking-widest hover:border-accent hover:text-accent transition-all"
              >
                <Plus size={16} className="inline mr-2" /> Add New Tag
              </button>
            </div>
          </section>

          <section className="bg-white dark:bg-neutral-800 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-700 p-8 shadow-sm">
            <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-8">Support</h3>
            <button
              onClick={() => setView('help')}
              className="w-full flex items-center justify-between p-5 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-accent/10 text-accent rounded-xl flex items-center justify-center">
                  <CircleHelp size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm">Help & Documentation</p>
                  <p className="text-xs text-neutral-500">Learn how to use features and shortcuts.</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-neutral-400" />
            </button>
          </section>

          <section className="bg-white dark:bg-neutral-800 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-700 p-8 shadow-sm">
            <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-8">Data Controls</h3>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={handleExport} className="flex items-center justify-center gap-3 py-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-xs font-black uppercase tracking-widest">
                <Download size={18} /> Export Data
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-3 py-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-xs font-black uppercase tracking-widest">
                <Upload size={18} /> Import Data
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".json" />
            </div>
            <button
              onClick={() => setConfirmDialog({
                isOpen: true,
                title: 'Destroy All Data?',
                message: 'This action cannot be undone. All your tasks, tags, and streaks will be permanently deleted.',
                isDanger: true,
                confirmLabel: 'Destroy Everything',
                onConfirm: () => useStore.getState().resetData()
              })}
              className="w-full mt-4 py-4 bg-rose-50 dark:bg-rose-900/10 text-rose-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-colors"
            >
              Destroy All Data
            </button>
          </section>
        </div>
      </motion.div>
    );

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto px-3 sm:px-6 py-6 sm:py-12">
        <header className="mb-12 flex flex-col gap-6">
           <button
    className="lg:hidden p-2 mr-2"
    onClick={() => setSidebarOpen(true)}
  >
    <Menu size={24} />
  </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-neutral-900 dark:text-white tracking-tight capitalize">
                {filterTagId ? activeTagName : (activeView === 'inbox' ? 'My Tasks' : activeView)}
              </h1>
              <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                {sortedTasks.length} task{sortedTasks.length !== 1 ? 's' : ''} {activeView === 'completed' ? 'archived' : 'active'}.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
                className={`p-3 rounded-xl transition-all ${viewMode === 'calendar' ? 'bg-accent text-white shadow-lg' : 'text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                aria-label="Toggle view"
                title={viewMode === 'list' ? "Switch to Calendar" : "Switch to List"}
              >
                {viewMode === 'calendar' ? <LayoutList size={22} /> : <Calendar size={22} />}
              </button>

             {viewMode === 'list' && (
  <>
    <button
      onClick={() => {
        setSelectionMode(!selectionMode);
        setSelectedIds([]);
      }}
      className={`p-3 rounded-xl transition-all ${
        selectionMode
          ? 'bg-accent text-white shadow-lg'
          : 'text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
      }`}
      aria-label="Selection mode"
    >
      <ListChecks size={22} />
    </button>

    {user ? (
      <button
        onClick={async () => {
          await logout();
          setUser(null);
          window.location.href = "/login";
        }}
        className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold"
      >
        Logout
      </button>
    ) : (
      <button
        onClick={() => (window.location.href = "/login")}
        className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-bold"
      >
        Login
      </button>
    )}
  </>
)}
            </div>
          </div>

          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-accent transition-colors" size={20} />
            <input
              id="search-input"
              type="text"
              placeholder="Search tasks, tags, or focus areas... (Press / to focus)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full 
bg-white/70 dark:bg-white/5 
backdrop-blur-xl 
border border-neutral-200 dark:border-white/10 
rounded-3xl py-5 pl-12 sm:pl-14 pr-4 
outline-none focus:ring-4 focus:ring-accent/10 
focus:border-accent transition-all text-sm font-semibold 
shadow-sm hover:shadow-md"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-rose-500 transition-colors">
                <X size={18} />
              </button>
            )}
          </div>
        </header>

        <div className="space-y-8 pb-32">
          <TaskInput />
          {viewMode === 'calendar' ? (
            <CalendarView
              tasks={filteredTasks}
              onEdit={setEditingTask}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          ) : (
            <div className="space-y-4">
              {!selectionMode && activeView !== 'completed' && activeView !== 'overdue' && !searchQuery && !filterTagId ? (
                <Reorder.Group axis="y" values={sortedTasks} onReorder={handleReorder} className="space-y-4">
                  {sortedTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      draggable={true}
                      onEdit={setEditingTask}
                      onDelete={(id) => setConfirmDialog({
                        isOpen: true,
                        title: 'Delete Task?',
                        message: 'Are you sure you want to delete this task?',
                        isDanger: true,
                        confirmLabel: 'Delete',
                        onConfirm: () => deleteTask(id)
                      })}
                    />
                  ))}
                </Reorder.Group>
              ) : (
                <AnimatePresence mode="popLayout">
                  {sortedTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      selectionMode={selectionMode}
                      isSelected={selectedIds.includes(task.id)}
                      onSelect={toggleSelection}
                      onEdit={setEditingTask}
                      onDelete={(id) => setConfirmDialog({
                        isOpen: true,
                        title: 'Delete Task?',
                        message: 'Are you sure you want to delete this task?',
                        isDanger: true,
                        confirmLabel: 'Delete',
                        onConfirm: () => deleteTask(id)
                      })}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          )}

          {sortedTasks.length === 0 && viewMode === 'list' && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-24 text-center">
              <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 text-neutral-300 dark:text-neutral-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <Filter size={40} />
              </div>
              <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">No matches found</h3>
              <p className="text-neutral-400 mt-2 max-w-xs mx-auto">Try clearing your filters or changing your search query.</p>
              {(searchQuery || filterTagId) && (
                <button
                  onClick={() => { setSearchQuery(''); setFilterTagId(null); }}
                  className="mt-6 px-6 py-3 bg-accent/5 hover:bg-accent/10 text-accent rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  Reset all filters
                </button>
              )}
            </motion.div>
          )}
        </div>

        {selectionMode && selectedIds.length > 0 && viewMode === 'list' && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-10 left-0 lg:left-64 right-0 z-50 flex justify-center pointer-events-none">
            <div className="flex items-center gap-6 bg-neutral-900 dark:bg-neutral-800 text-white px-10 py-6 rounded-[2.5rem] shadow-2xl border border-neutral-700 pointer-events-auto">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Selected</span>
                <span className="text-sm font-black">{selectedIds.length} Tasks</span>
              </div>
              <div className="h-8 w-[1px] bg-neutral-700 mx-2" />
              <div className="flex items-center gap-4">
                <button onClick={() => { bulkToggle(selectedIds, true); setSelectionMode(false); }} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-2xl transition-all text-xs font-black uppercase tracking-widest">
                  <CheckCircle size={18} /> Finish
                </button>
                <button onClick={() => setConfirmDialog({
                  isOpen: true,
                  title: 'Delete Tasks?',
                  message: `Are you sure you want to permanently delete ${selectedIds.length} tasks?`,
                  isDanger: true,
                  confirmLabel: 'Delete',
                  onConfirm: () => { bulkDelete(selectedIds); setSelectionMode(false); }
                })} className="flex items-center gap-2 px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-2xl transition-all text-xs font-black uppercase tracking-widest">
                  <Trash2 size={18} /> Delete
                </button>
                <button onClick={() => { setSelectionMode(false); setSelectedIds([]); }} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-neutral-400">
                  <X size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    );
  };

   return(
     <Routes>

    {/* 🔐 Auth Pages */}
    <Route
  path="/login"
  element={user ? <Navigate to="/" replace /> : <Login />}
/>
    <Route path="/signup" element={<Signup />} />
    <Route path="/forgot" element={<ForgotPassword />} />

    {/* 🏠 Main App */}
    <Route
      path="/"
      element={
  user ? (
    <div className="flex h-screen w-full overflow-hidden bg-white dark:bg-[#0b0f1a]">
          {/* Sidebar */}
      {sidebarOpen && (
  <div
  className="fixed inset-0 bg-black/40 z-40 lg:hidden"
  onClick={() => setSidebarOpen(false)}
/>
)}

{/* Sidebar */}
<div
  className={`fixed top-0 left-0 h-full 
  w-[280px] sm:w-[300px] lg:w-64
backdrop-blur-xl 
bg-white dark:bg-white/10 
border-r border-neutral-200 dark:border-white/10 z-50 transform transition-transform duration-300
  ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
  lg:translate-x-0 lg:static`}
>
  <Sidebar />
</div>

          {/* Main Content */}
         <main className="flex-1 overflow-y-auto w-full relative z-10 px-2 sm:px-4">
            {renderContent()}
          </main>
          <AlertDialog
  isOpen={alertDialog.isOpen}
  onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
  title={alertDialog.title}
  message={alertDialog.message}
/>

<ConfirmDialog
  isOpen={confirmDialog.isOpen}
  onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
  onConfirm={confirmDialog.onConfirm}
  title={confirmDialog.title}
  message={confirmDialog.message}
/>

<InputDialog
  isOpen={inputDialog.isOpen}
  onClose={() => setInputDialog({ ...inputDialog, isOpen: false })}
  onSubmit={inputDialog.onSubmit}
  title={inputDialog.title}
/>

        </div>
       ) : (
    <Navigate to="/login" replace />
  )
}
    />

  </Routes>
  );
  
};

export default App;