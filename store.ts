import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Task, Tag, Priority, View, AppState, SubTask, FocusState, Recurrence } from './types';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import { breakdownTask } from './lib/openrouter';
import { db } from "./lib/firebase";
import { auth } from "./lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, getDocs, getDoc, doc, setDoc } from "firebase/firestore";
import { query, where, updateDoc } from "firebase/firestore";

const addHistory = async (taskId: string, action: string) => {
  const user = await getCurrentUser(); // ✅ FIX

  if (!user) {
    console.log("No user found");
    return;
  }

  await addDoc(collection(db, "task history"), {
    history_id: crypto.randomUUID(),
    task_id: taskId,
    user_id: user.uid, // ✅ always correct
    action,
    timestamp: new Date()
  });
};
const getCurrentUser = (): Promise<any> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

const addTagToFirebase = async (tagId: string, name: string, color: string) => {
   const user = await getCurrentUser(); // ✅ FIX

  if (!user) {
    console.log("No user found");
    return;
  }
  await addDoc(collection(db, "tags"), {
    tag_id: tagId,
    tag_name: name,
    color: color,
    user_id: user?.uid || "unknown", // ✅ ADD THIS
    created_at: new Date() // ✅ ADD THIS
  });
};
const loadTagsFromFirebase = async () => {
  const snapshot = await getDocs(collection(db, "tags"));

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: data.tag_id,
      name: data.tag_name,
      color: data.color
    };
  });
};
const updateDailyProgress = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const today = new Date().toISOString().split("T")[0];

  try {
    const q = query(
      collection(db, "daily_targets"),
      where("user_id", "==", user.uid),
      where("date", "==", today)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      await addDoc(collection(db, "daily_targets"), {
  target_id: crypto.randomUUID(),
  user_id: user.uid,

  target_date: today, // ✅ renamed
  created_at: new Date(), // ✅ new

  target_task_count: 5, // ✅ goal
  completed_task_count: 1, // ✅ count

  target_status: "not_achieved" // ✅ default
});
      return;
    }

    snapshot.forEach(async (docItem) => {
      const data = docItem.data();

      const newCount = (data.completed_task_count || 0) + 1;
const goal = data.target_task_count || 5;

await updateDoc(docItem.ref, {
  completed_task_count: newCount,
  target_status: newCount >= goal ? "achieved" : "not_achieved" // ✅ logic
});
    });

  } catch (error) {
    console.error("Error updating daily progress:", error);
  }
};
interface ToDoSStore extends AppState {
  searchQuery: string;
  filterTagId: string | null;
  setSearchQuery: (query: string) => void;
  setFilterTagId: (tagId: string | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setAccentColor: (color: string) => void;
  setView: (view: View) => void;
  addTask: (task: Partial<Task>) => void;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  reorderTasks: (newTasks: Task[]) => void; 
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;
  bulkToggle: (ids: string[], completed: boolean) => void;
 addTag: (name: string, color: string) => Promise<void>;
  updateTag: (id: string, name: string, color: string) => void;
  deleteTag: (id: string) => void;
  loadTags: () => Promise<void>;
  setDailyGoal: (goal: number) => void;
  resetData: () => void;
  importData: (data: Partial<AppState>) => void;
  updateStreak: () => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  generateAIActionPlan: (taskId: string) => Promise<void>;
  loadSettings: () => Promise<void>;

  // Focus Timer Actions
  setFocusState: (updates: Partial<FocusState>) => void;
  toggleFocusTimer: () => void;
  resetFocusTimer: () => void;
  tickFocusTimer: () => void;
}

const DEFAULT_TAGS: Tag[] = [
  { id: '1', name: 'Work', color: '#6366f1' },
  { id: '2', name: 'Personal', color: '#10b981' },
  { id: '3', name: 'Fitness', color: '#f59e0b' },
];

const DEFAULT_TASKS: Task[] = [
  {
    id: 'default-task-1',
    title: 'Daily Progress Review and Performance Assessment',
    description: 'Review daily activities, track progress against goals, and assess overall performance. Identify completed tasks, outstanding items, and any challenges encountered. Use insights gained to adjust priorities, improve efficiency, and plan actions for the next day.',
    dueDate: '2026-02-05T12:00:00.000Z',
    priority: Priority.HIGH,
    tags: ['1'],
    completed: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
    position: 0,
    recurrence: null,
    subtasks: [
      {
        id: 'st-1',
        title: 'Review completed tasks and evaluate their impact on productivity.',
        completed: false
      },
      {
        id: 'st-2',
        title: 'Identify any obstacles or roadblocks that hinder progress.',
        completed: false
      },
      {
        id: 'st-3',
        title: 'Assess the effectiveness of your current strategies and adjust as needed.',
        completed: false
      }
    ]
  },
  {
    id: 'default-task-2',
    title: 'Daily Financial Review and Expense Tracking Overview',
    description: 'Review daily financial transactions and track expenses to maintain accurate records. Monitor spending against budgets, identify variances, and highlight key financial insights. Use the review to ensure financial discipline and inform short-term financial decisions.',
    dueDate: '2026-01-29T12:00:00.000Z',
    priority: Priority.MEDIUM,
    tags: ['1'],
    completed: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
    position: 1,
    recurrence: null,
    subtasks: [
      { id: 'st-2-1', title: 'Review completed tasks and evaluate their impact on productivity.', completed: false },
      { id: 'st-2-2', title: 'Identify any obstacles or roadblocks that hinder progress.', completed: false },
      { id: 'st-2-3', title: 'Assess the effectiveness of your current strategies and adjust as needed.', completed: false }
    ]
  }
];

const DEFAULT_FOCUS_STATE: FocusState = {
  timeLeft: 25 * 60,
  isActive: false,
  mode: 'work'
};

const updateAccentCSS = (color: string) => {
  const root = document.documentElement;
  root.style.setProperty('--accent-color', color);
  root.style.setProperty('--accent-color-50', `${color}15`);
  root.style.setProperty('--accent-color-100', `${color}30`);
  root.style.setProperty('--accent-color-200', `${color}50`);
  root.style.setProperty('--accent-color-600', color);
  root.style.setProperty('--accent-color-700', color);
};

export const useStore = create<ToDoSStore>()(
  persist(
    (set, get) => ({
      tasks: DEFAULT_TASKS,
      tags: [],
      activeView: 'inbox',
      theme: 'light',
      accentColor: '#6366f1',
      streak: 0,
      dailyGoal: 5,
      lastCompletedDate: null,
      searchQuery: '',
      filterTagId: null,
      focusState: DEFAULT_FOCUS_STATE,

      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setFilterTagId: (filterTagId) => set({ filterTagId }),

      setTheme: async (theme) => {
  const user = auth.currentUser;
  if (!user) return;

  set({ theme });

  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // ✅ SAVE TO FIREBASE
  await setDoc(
  doc(db, "settings", user.uid),
  {
    setting_id: user.uid,
    user_id: user.uid,
    theme: theme,
    accent_color: get().accentColor,
    daily_goal: get().dailyGoal || 5,
    notifications: true,
    default_priority: "MEDIUM"
  },
);
},

  setAccentColor: async (accentColor) => {
  const user = auth.currentUser;
  if (!user) return;

  set({ accentColor });
  updateAccentCSS(accentColor);

  // ✅ SAVE TO FIREBASE
  await setDoc(
  doc(db, "settings", user.uid),
  {
    setting_id: user.uid,
    user_id: user.uid,
    accent_color: accentColor,
    theme: get().theme,
    daily_goal: get().dailyGoal || 5,
    notifications: true,
    default_priority: "MEDIUM"
  },

);
},

      setView: (activeView) => set({ activeView, filterTagId: null }),

      addTask: async (taskData) => {
const user = await getCurrentUser();

  const maxPos = get().tasks.reduce((max, t) => Math.max(max, t.position), -1);

  const newTask: Task = {
    id: crypto.randomUUID(),
    title: taskData.title || 'Untitled Task',
    description: taskData.description || '',
    dueDate: taskData.dueDate || null,
    priority: taskData.priority || Priority.MEDIUM,
    tags: taskData.tags || [],
    recurrence: taskData.recurrence || null,
    subtasks: [],
    completed: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
    position: maxPos + 1
  };

  // 🔥 SAVE TO FIREBASE
  await addDoc(collection(db, "tasks"), {
    task_id: newTask.id,
  user_id: user?.uid || "unknown",
  title: newTask.title,
  description: newTask.description,
  status: "pending",

  // ✅ IMPORTANT FIELDS
  created_at: new Date(), // ✅ when task created
  completed_at: null,     // ✅ initially null
  due_date: newTask.dueDate
  ? new Date(new Date(newTask.dueDate).setHours(23, 59, 59, 999))
  : null,

  priority: newTask.priority,
  tags: newTask.tags || []
});
  await addHistory(newTask.id, "created");

  // ✅ KEEP YOUR EXISTING STATE UPDATE
  set((state) => ({
    tasks: [newTask, ...state.tasks]
  }));
},
 updateTask: async (id, updates) => {
  await addHistory(id, "updated");

  set((state) => ({
    tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
  }));
},
      reorderTasks: (newTasks) => set((state) => {
        const reorderedIds = new Set(newTasks.map(t => t.id));
        const otherTasks = state.tasks.filter(t => !reorderedIds.has(t.id));
        const updatedOrderedTasks = newTasks.map((t, i) => ({ ...t, position: i }));
        return { tasks: [...updatedOrderedTasks, ...otherTasks] };
      }),
loadTags: async () => {
  const snapshot = await getDocs(collection(db, "tags"));

  const tagsFromDB = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: data.tag_id,
      name: data.tag_name,
      color: data.color
    };
  });
set((state) => ({
  ...state,
  tags: tagsFromDB
}));
  
},
loadSettings: async () => {
  const user = auth.currentUser;
  if (!user) return;

  const docRef = doc(db, "settings", user.uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();

    set({
  theme: data.theme || "light",
  accentColor: data.accent_color || "#22c55e",
  dailyGoal: data.daily_goal || 5
});
  }
},
toggleTask: async (id) => {
  const state = get();
  const taskToToggle = state.tasks.find(t => t.id === id);
  if (!taskToToggle) return;

  const isNowCompleted = !taskToToggle.completed;

  if (isNowCompleted) {
    updateDailyProgress();
  }

  // ✅ Save history BEFORE state update
  await addHistory(id, isNowCompleted ? "completed" : "uncompleted");

  // 🔥 ✅ ADD THIS BLOCK HERE
  const user = auth.currentUser;
  if (user) {
    const q = query(
      collection(db, "tasks"),
      where("task_id", "==", id),
      where("user_id", "==", user.uid)
    );

    const snapshot = await getDocs(q);

    snapshot.forEach(async (docItem) => {
      await updateDoc(docItem.ref, {
        status: isNowCompleted ? "completed" : "pending",
        completed_at: isNowCompleted ? new Date() : null
      });
    });
  }

  let newTasks = [...state.tasks];

  // Recurrence logic
  if (isNowCompleted && taskToToggle.recurrence) {
    const baseDate = taskToToggle.dueDate ? new Date(taskToToggle.dueDate) : new Date();
    let nextDate = new Date(baseDate);

    switch (taskToToggle.recurrence) {
      case 'daily':
        nextDate = addDays(baseDate, 1);
        break;
      case 'weekly':
        nextDate = addWeeks(baseDate, 1);
        break;
      case 'monthly':
        nextDate = addMonths(baseDate, 1);
        break;
    }

    const nextTask: Task = {
      ...taskToToggle,
      id: crypto.randomUUID(),
      completed: false,
      completedAt: null,
      dueDate: nextDate.toISOString(),
      createdAt: new Date().toISOString(),
      recurrence: taskToToggle.recurrence,
      subtasks: taskToToggle.subtasks.map(s => ({ ...s, completed: false })),
      position: -1
    };

    newTasks = [nextTask, ...newTasks];
  }

  newTasks = newTasks.map(t =>
    t.id === id
      ? {
          ...t,
          completed: isNowCompleted,
          completedAt: isNowCompleted ? new Date().toISOString() : null
        }
      : t
  );

  set({ tasks: newTasks });
},

      toggleSubtask: (taskId, subtaskId) => set((state) => ({
        tasks: state.tasks.map(t => t.id === taskId ? {
          ...t,
          subtasks: t.subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s)
        } : t)
      })),

      generateAIActionPlan: async (taskId) => {
        const task = get().tasks.find(t => t.id === taskId);
        if (!task) return;

        set((state) => ({
          tasks: state.tasks.map(t => t.id === taskId ? { ...t, aiBreakdownRequested: true } : t)
        }));

        try {
          const suggestions = await breakdownTask(task.title, task.description);
          const newSubtasks: SubTask[] = suggestions.map(title => ({
            id: crypto.randomUUID(),
            title,
            completed: false
          }));

          set((state) => ({
            tasks: state.tasks.map(t => t.id === taskId ? {
              ...t,
              subtasks: [...(t.subtasks || []), ...newSubtasks],
              aiBreakdownRequested: false
            } : t)
          }));
        } catch (e) {
          set((state) => ({
            tasks: state.tasks.map(t => t.id === taskId ? { ...t, aiBreakdownRequested: false } : t)
          }));
        }
      },

    deleteTask: async (id) => {
  await addHistory(id, "deleted");

  set((state) => ({
    tasks: state.tasks.filter(t => t.id !== id)
  }));
},

bulkDelete: async (ids) => {
  for (const id of ids) {
    await addHistory(id, "deleted");
  }

  set((state) => ({
    tasks: state.tasks.filter(t => !ids.includes(t.id))
  }));
},

      bulkToggle: (ids, completed) => set((state) => ({
        tasks: state.tasks.map(t => ids.includes(t.id) ? {
          ...t,
          completed,
          completedAt: completed ? new Date().toISOString() : null
        } : t)
      })),

      addTag: async (name, color) => {
  const tagId = crypto.randomUUID(); // ✅ one ID for both

  // 🔥 Save to Firebase
  await addTagToFirebase(tagId, name, color);

  // 🔥 Save in Zustand (local state)
  set((state) => ({
    tags: [...state.tags, { id: tagId, name, color }]
  }));
},

      updateTag: (id, name, color) => set((state) => ({
        tags: state.tags.map(t => t.id === id ? { ...t, name, color } : t)
      })),

      deleteTag: (id) => set((state) => ({
        tags: state.tags.filter(t => t.id !== id),
        tasks: state.tasks.map(t => ({
          ...t,
          tags: t.tags.filter(tid => tid !== id)
        }))
      })),

      setDailyGoal: async (dailyGoal) => {
  const user = auth.currentUser;
  if (!user) return;

  set({ dailyGoal });

  await setDoc(
    doc(db, "settings", user.uid),
    {
      daily_goal: dailyGoal
    },
    { merge: true }
  );
},

      // Focus Timer Logic
      setFocusState: (updates) => set((state) => ({
        focusState: { ...state.focusState, ...updates }
      })),

      toggleFocusTimer: () => set((state) => ({
        focusState: { ...state.focusState, isActive: !state.focusState.isActive }
      })),

      tickFocusTimer: () => set((state) => {
        const { timeLeft, isActive } = state.focusState;
        if (!isActive || timeLeft <= 0) return {};
        return {
          focusState: { ...state.focusState, timeLeft: timeLeft - 1 }
        };
      }),

      resetFocusTimer: () => set((state) => ({
        focusState: {
          ...state.focusState,
          isActive: false,
          timeLeft: state.focusState.mode === 'work' ? 25 * 60 : 5 * 60
        }
      })),

      resetData: () => set({
        tasks: DEFAULT_TASKS,
        tags: [],
        activeView: 'inbox',
        streak: 0,
        lastCompletedDate: null,
        theme: 'light',
        accentColor: '#6366f1',
        searchQuery: '',
        filterTagId: null,
        focusState: DEFAULT_FOCUS_STATE
      }),

      importData: (data) => set((state) => ({
        ...state,
        ...data,
        tasks: data.tasks || state.tasks,
        tags: data.tags || state.tags,
      })),

      updateStreak: () => {
        const state = get();
        const today = format(new Date(), 'yyyy-MM-dd');

        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterday = format(yesterdayDate, 'yyyy-MM-dd');

        const tasksCompletedToday = state.tasks.filter(t =>
          t.completed && t.completedAt && format(new Date(t.completedAt), 'yyyy-MM-dd') === today
        ).length;

        if (state.lastCompletedDate !== today && state.lastCompletedDate !== yesterday && tasksCompletedToday < state.dailyGoal) {
          if (state.streak > 0) set({ streak: 0 });
          return;
        }

        if (tasksCompletedToday >= state.dailyGoal) {
          if (state.lastCompletedDate !== today) {
            set((state) => ({
              streak: state.streak + 1,
              lastCompletedDate: today
            }));
          }
        }
      },

    }),
    {
      name: 'todos-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.theme === 'dark') document.documentElement.classList.add('dark');
          updateAccentCSS(state.accentColor || '#6366f1');
        }
      }
    }
  )
);