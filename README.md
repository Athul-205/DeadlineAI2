# 🚀 DeadlineAI

An AI-powered productivity assistant that intelligently organizes tasks, commitments, and deadlines into an optimized daily schedule using Google Gemini.

---

## 🌐 Live Demo

https://deadlineai-589759514016.asia-southeast1.run.app

---

# 📖 Overview

DeadlineAI is an AI-powered productivity assistant designed to help students, professionals, and entrepreneurs efficiently manage their daily workload.

Unlike traditional to-do list applications, DeadlineAI generates an intelligent schedule by considering task deadlines, priorities, estimated durations, and fixed commitments. It also detects scheduling conflicts and helps users make informed decisions when time constraints make a schedule unrealistic.

---

# ✨ Features

## 🧠 AI-Powered Schedule Generation

- Generates an optimized daily schedule using Google Gemini.
- Prioritizes tasks based on deadlines and priority.
- Considers existing commitments before scheduling tasks.
- Automatically inserts breaks between work sessions.
- Explains why tasks were prioritized.

---

## 📅 Task Management

- Add, edit, and delete tasks.
- Set task deadlines and deadline times.
- Specify estimated duration.
- Assign priority levels.
- Assign difficulty levels.
- Categorize tasks.
- Add personal notes.

---

## 📌 Commitment Management

- Add fixed commitments.
- Edit and delete commitments.
- Specify start and end times.
- Prevent scheduling conflicts with tasks.

---

## ⚠️ Neural Temporal Conflict Detection

When a task cannot be completed before its deadline, DeadlineAI automatically detects the conflict and allows users to:

- Skip the task
- Work until the deadline (partial completion)

Tasks whose deadlines have already passed are automatically omitted from the generated schedule.

---

## 🔄 Adaptive Schedule Regeneration

Users can regenerate their schedule at any time after modifying tasks or commitments.

---

## 📊 Analytics Dashboard

- Total tasks
- Completed tasks
- Pending tasks
- Productivity overview
- Category-wise analytics

---

## 🤖 AI Chat Assistant

Interact with an AI assistant for productivity guidance and planning support.

---

## 🎨 Modern User Interface

- Cyberpunk-inspired design
- Glassmorphism UI
- Neon-themed interface
- Responsive layout
- Smooth animations

---

# 🛠️ Technologies Used

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

## Backend

- Node.js
- Express

## Artificial Intelligence

- Google Gemini API (`@google/genai`)

## Libraries

- Motion
- Lucide React
- Recharts

---

# ☁️ Deployment

- Google Cloud Run

---

# 🚀 Getting Started

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/DeadlineAI.git
cd DeadlineAI
```

Install dependencies:

```bash
npm install
```

Create a `.env` file:

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

Run the development server:

```bash
npm run dev
```

---



# 🔮 Future Improvements

- User authentication
- Cloud database integration
- Browser notifications
- Google Calendar integration
- Progressive Web App (PWA)
- Mobile application

---

# 📄 License

This project was developed as a hackathon and portfolio project.
