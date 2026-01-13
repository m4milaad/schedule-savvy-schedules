# <img src="./public/CUKLogo.ico" alt="icon" width="25"> Central University of Kashmir - Exam Scheduling System

> A comprehensive exam scheduling system with intelligent constraint handling, real-time collaboration, and modern UI/UX design.

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://ds-cuk.vercel.app/)
[![Version](https://img.shields.io/badge/version-5.1.0-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)]()
[![React](https://img.shields.io/badge/React-18.3-blue)]()

---

## 🚀 Overview

The CUK Exam Scheduling System automates exam timetable generation for Central University of Kashmir. It handles complex constraints, student enrollments, and provides an intuitive interface for admins, teachers, and students.

## ✨ Key Features

### 🧠 Intelligent Scheduling Engine
- **Constraint Satisfaction**: Algorithm considers student enrollments, customizable gaps (1-10 days), and venue capacities.
- **Conflict Prevention**: Automatically detects and prevents same-day exams for individual students.
- **Drag & Drop Rescheduling**: Visual interface for manual adjustments with real-time conflict warnings.

### 🏛️ Advanced Seating System
- **Anti-Cheating Logic**: "Column-based" algorithm alternates subjects to prevent students from the same course sitting together.
- **Visual Grid**: Interactive drag-and-drop seating arrangement with cross-venue support.
- **PDF Export**: Generate professional, color-coded seating charts and attendance sheets instantly.

### 🎓 Role-Based Ecosystem
- **Admin Command Center**: Complete control over university data, holidays, and schedule generation.
- **Teacher Dashboard**: Dedicated tabs for managing Marks, Attendance, Assignments, and Notices.
- **Student Portal**: Personalized views for exam dates, seat numbers, resources, and performance analytics.

### ⚡ Enterprise-Grade Performance
- **Real-Time Sync**: Supabase Realtime pushes updates (datesheets, notices) instantly to all connected clients.
- **Secure Bulk Operations**: Secure Excel import/export (via ExcelJS) for students, marks, and course data.
- **Mobile Native**: Fully responsive design paired with a native Android application (Capacitor).

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui.
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Real-time).
- **State Management**: TanStack Query (React Query).
- **Utilities**: ExcelJS, jsPDF, Zod, Capacitor.

## 🏁 Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- Supabase project credentials

### Installation & Development
1. **Clone the repo**
   ```bash
   git clone https://github.com/m4milaad/schedule-savvy-schedules.git
   cd schedule-savvy-schedules
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Environment Setup**
   Create a `.env` file with your Supabase keys:
   ```env
   VITE_SUPABASE_URL=your_url
   VITE_SUPABASE_ANON_KEY=your_key
   ```
4. **Run development server**
   ```bash
   npm run dev
   ```

### Build & Deploy
```bash
npm run build          # Production build
npm run preview        # Preview build locally
npx cap sync android   # Sync with Android (Capacitor)
```

## 🏗 Project Structure

- `src/components/admin`: Admin-specific tabs and management tools.
- `src/components/teacher`: Teacher tools (marks, attendance, notices).
- `src/components/student`: Student views and enrollment.
- `src/utils/scheduleAlgorithm.ts`: Core scheduling logic.
- `src/utils/seatingAlgorithm.ts`: Seating distribution logic.
- `supabase/migrations`: Database schema and RLS policies.

## 👨‍💻 Developers

**Milad Ajaz Bhat** | [Portfolio](https://m4milaad.github.io) | mb4milad.bhattt@gmail.com
**Nimra Wani** | [Portfolio](https://nimrawani.vercel.app/) | nimrawani04@gmail.com

## 📄 License

This project is developed for Central University of Kashmir. Licensed under the MIT License.
