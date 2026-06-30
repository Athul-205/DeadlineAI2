# Project Documentation: DeadlineAI

---

## 1. Problem Statement Selected

### The Challenge
Students, professionals, and entrepreneurs frequently miss deadlines, assignments, meetings, bill payments, interviews, and important commitments. Existing productivity tools often rely on passive reminders that are easy to ignore and do little to help users actually complete their tasks.

### Core Problems Identified
* **Passive Engagement**: Standard calendar notifications are easy to dismiss, snooze, or swipe away, leading to zero action.
* **Lack of Adaptive Structuring**: Static task lists do not automatically restructure themselves when a user falls behind, leading to a pile-up of tasks and cognitive overload.
* **Burnout and Fatigue**: Users fail to space out difficult tasks, resulting in high intensity work without rest, leading to fatigue and abandoned schedules.
* **Poor Prioritization**: Task lists lack context about deadlines, difficulty, or personal energy levels, meaning critical assignments are often pushed to the end of the day.

---

## 2. Solution Overview

**DeadlineAI** is an advanced cybernetic, AI-powered productivity companion that moves beyond passive notification to proactively assist users in planning, prioritizing, and completing tasks. It acts as an adaptive, neuro-temporal scheduling coach that dynamic-routes every minute of the user's day, transforming flat task lists into an optimized, living timeline.

### How it Works
1. **Adaptive Scheduling Engine**: The user inputs their tasks (with duration, difficulty, and priority) and fixed commitments. DeadlineAI schedules everything dynamically, placing fixed slots first and packing pending tasks around them.
2. **Proactive Progress Loop**: Whenever a scheduled task block completes, the system proactively prompts the user to verify if they finished. 
3. **Neuro-Temporal Recalculation**: If a task is not complete, the system asks the user how much additional time is required, dynamically regenerates the remaining timeline, and restructures the rest of the day to keep momentum.
4. **Futuristic Cybernetic Atmosphere**: DeadlineAI utilizes a high-contrast dark cyberpunk theme designed for high focus and visual clarity, reinforcing discipline and motivation.

---

## 3. Key Features

### 📅 Live Neuro-Temporal Planner
* View a beautifully styled, chronological timeline containing tasks, fixed commitments, breaks, and focus sessions.
* Features real-time indicators showing active, completed, and pending blocks.

### 🤖 Instant AI Timeline Generation
* With a single click, the AI reads your pending tasks, preferences, and locked commitments to compile an optimal daily schedule.
* Intelligently spaces tasks with restorative breaks tailored to your chosen work mode.

### 🧠 Proactive Neural Progress Synchronization (Completion Prompt)
* **Active Status Feedback**: Automatically detects when a scheduled block's end-time has passed.
* **Interactive Synchronization Dialog**: Triggers a glowing, non-blocking sync widget asking: *"Did you complete this task?"*
* **Dynamic Time Adjuster**: If the user needs more time, they can select predefined (15, 30, 45 mins) or custom durations. The remaining schedule is immediately re-sent to the backend for real-time recalculation, keeping the day realistic.

### ⚡ Cybernetic Intensity Settings
* **Adaptive Work Modes**: Choose between **Work** (standard), **Study** (more breaks, lower intensity), and **Exam** (high intensity, focused sprint sessions).
* **Focus & Break Control**: Directly configure target focus session durations and rest cycles.
* **Productivity Goals**: Input your core mission to steer the AI's schedule generation priorities and motivation styles.

### 📋 Task & Commitment Managers
* Interactive panels to add, modify, delete, and organize tasks and fixed commitments.
* Tasks are categorized with difficulty levels (Easy, Medium, Hard), priority ratings (Low, Medium, High), and estimated durations.

### 📈 Real-Time Analytics & Logs
* Track productivity streaks, task completion rates, and average focus durations.
* Interactive data charts visualizing daily task distribution, difficulty profiles, and category layouts.

---

## 4. Technologies Used

* **Frontend Framework**: React 18+ with TypeScript for robust component structuring and full type safety.
* **Build System**: Vite for rapid module bundling and responsive loading.
* **Style Engine**: Tailwind CSS for high-fidelity, utility-first UI design.
* **Animations**: `motion/react` for elegant sidebars, interactive micro-transitions, and fade-in container effects.
* **Iconography**: `lucide-react` for streamlined, uniform vector icon representation.
* **Data Visualization**: `recharts` for dynamic, beautiful charts and productivity reporting.
* **Backend Server**: Express (Node.js) with standard persistent JSON storage matching local container runtime configurations.

---

## 5. Google Technologies Utilized

### 🤖 Google Gemini AI Engine
* **Model**: Powered by the advanced **Gemini 2.5/3.5 models** via the modern `@google/genai` SDK.
* **Strict Schema Enforcement**: Utilizing structured JSON responses and strict Gemini API schemas to generate deterministic daily timeline objects (incorporating start/end times, durations, priority, and original ID mapping).
* **Advanced Cognitive Planning Prompting**: The engine analyzes:
  * Proximity of task deadlines (urgency).
  * Task priority and estimated energy required (matching difficult tasks with peak energy hours).
  * Restorative break spacing and work mode parameters.
  * Overload warning calculations and conflict-resolution recommendations.
  * Custom cyberpunk coaching explanations for why specific times were selected.

---
