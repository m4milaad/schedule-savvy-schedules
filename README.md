# <img src="./public/CUKLogo.ico" alt="icon" width="25"> Central University of Kashmir - Acadex

> A comprehensive academic management system with exam scheduling, marks management, attendance tracking, assignments, library, and real-time collaboration.

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://ds-cuk.vercel.app/)
[![Version](https://img.shields.io/badge/version-6.0.0-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)]()
[![React](https://img.shields.io/badge/React-18.3-blue)]()

---

## 🚀 Overview

CUK Acadex is a complete academic management system for Central University of Kashmir. It provides a unified platform for students, teachers, and administrators to manage all aspects of academic life - from exam scheduling and marks to assignments, library, and performance tracking.


## 🗒️ Change Log (v5.0.0 → v6.0.0)

This section summarizes major user-visible improvements delivered between the README `5.0.0` milestone and `6.0.0`.

#### 📱 Mobile Navigation & Dashboard UX
- Full Student Dashboard support in Android builds.
- Repeated fixes for mobile sidebar issues (duplicate sidebar, overlay layering, layout, and toggle behavior).
- Sidebars extended into mobile sheet navigation for cleaner small-screen interaction.
- Dashboard and topbar interaction polish across Student, Teacher, and Admin experiences.

#### 🌐 Offline-First Reliability
- Offline-first service worker integration.
- Capacitor-based offline caching rollout and follow-up fixes.
- Improved offline state feedback through cached-data behavior and synchronization handling.

#### 🔔 Student Notice Experience
- Notice detail popup upgraded with a modern glassmorphism-style reading dialog.
- Improved readability and context in notice detail view.

#### 📅 Date & Form Safety
- Past-date selection prevention introduced in date-picker based flows (e.g., leave/scheduling related forms).

#### 🛠️ Admin & System Usability
- “Load more” enhancements in admin audit logs for better large-history navigation.
- Ongoing seating/dashboard tuning and broader UX refinements in final v6 preparation commits.

#### 🏷️ Version Milestone
- `6.0.0` reflects consolidated UX, offline, and dashboard improvements captured above.
## ✨ Key Features

### 🎓 Student Portal
- **Exam Schedule & Seating**: View exam dates, venues, and assigned seats with real-time updates
- **Marks & Performance**: Track grades, view detailed performance analytics and trends
- **Course Management**: Enroll in courses, view course details and materials
- **Assignments**: Submit assignments, track deadlines, and view feedback
- **Library**: Browse books, check availability, and manage borrowing
- **Resources**: Access learning materials, notes, and study resources
- **Leave Applications**: Apply for leave and track approval status
- **Notices**: Stay updated with announcements and important information

### 👨‍🏫 Teacher Dashboard
- **Marks Management**: Enter and manage student marks with bulk operations
- **Attendance Tracking**: Record and monitor student attendance
- **Assignment Grading**: Create assignments, review submissions, and provide feedback
- **Resource Sharing**: Upload and manage learning materials for students
- **Notice Board**: Post announcements for students and departments
- **Leave Management**: Review and approve student leave requests
- **Apply Leave**: Submit personal leave applications

### 🏛️ Admin Command Center
- **Intelligent Scheduling Engine**: Automated exam timetable generation with constraint satisfaction
- **Conflict Prevention**: Detects and prevents scheduling conflicts automatically
- **Advanced Seating System**: Anti-cheating column-based algorithm for seating arrangements
- **Drag & Drop Interface**: Visual rescheduling with real-time conflict warnings
- **University Data Management**: Complete control over departments, courses, and holidays
- **User Management**: Manage students, teachers, and administrators
- **Bulk Operations**: Excel import/export for efficient data management

### ⚡ Enterprise-Grade Performance
- **Real-Time Sync**: Supabase Realtime pushes updates instantly to all connected clients
- **Secure Operations**: Row-level security and role-based access control
- **Mobile Native**: Native Android application with full student dashboard features (Capacitor)
- **Performance Analytics**: Comprehensive tracking and visualization of academic performance
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Real-time)
- **State Management**: TanStack Query (React Query)
- **Utilities**: ExcelJS, jsPDF, Zod, React Hook Form
- **Mobile**: Capacitor for native Android app

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

- `src/components/admin`: Admin-specific tabs and management tools
- `src/components/teacher`: Teacher tools (marks, attendance, notices, assignments, resources)
- `src/components/student`: Student views (courses, exams, marks, performance, library, leave)
- `src/utils/scheduleAlgorithm.ts`: Core scheduling logic
- `src/utils/seatingAlgorithm.ts`: Seating distribution logic
- `supabase/migrations`: Database schema and RLS policies

## 🎯 Core Modules

### Student Features (Web & Android App)
- Personalized dashboard with all academic information
- Real-time exam schedule and seat assignment notifications
- Comprehensive marks and performance tracking with charts
- Course enrollment and management
- Assignment submission and tracking
- Library book browsing and management
- Resource access for learning materials
- Leave application system
- Notice board for announcements
- Full mobile experience with native Android app

### Teacher Features
- Marks entry and management for assigned courses
- Attendance recording and tracking
- Assignment creation, grading, and feedback
- Resource upload and sharing
- Notice posting for students
- Leave request approval workflow
- Personal leave applications

### Admin Features
- Automated exam scheduling with intelligent algorithms
- Visual seating arrangement with anti-cheating logic
- Department and course management
- User management (students, teachers, admins)
- Holiday and session management
- Bulk data operations via Excel
- System-wide analytics and reporting

## 👨‍💻 Developers

**Milad Ajaz Bhat** | [Portfolio](https://m4milaad.github.io) | mb4milad.bhattt@gmail.com
**Nimra Wani** | [Portfolio](https://nimrawani.vercel.app/) | nimrawani04@gmail.com

## 📄 License

This project is developed for Central University of Kashmir. Licensed under the MIT License.
