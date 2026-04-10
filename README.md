# <img src="./public/CUKLogo.ico" alt="icon" width="25"> Central University of Kashmir - Acadex

> A comprehensive academic management system with exam scheduling, marks management, attendance tracking, assignments, library, and real-time collaboration.

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://ds-cuk.vercel.app/)
[![Version](https://img.shields.io/badge/version-6.5.0-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)]()
[![React](https://img.shields.io/badge/React-18.3-blue)]()

---

## 🚀 Overview

CUK Acadex is a complete academic management system for Central University of Kashmir. It provides a unified platform for students, teachers, and administrators to manage all aspects of academic life - from exam scheduling and marks to assignments, library, and performance tracking.


## 🗒️ Change Log (v6.0.0 → v6.5.0)

This section summarizes major user-visible improvements delivered between v6.0.0 and v6.5.0.

#### 🤖 AI-Powered Chatbot Assistant (NeMoX)
- **Intelligent RAG System**: Hybrid retrieval-augmented generation with Supabase pgvector
- **Advanced AI Model**: Upgraded to Llama 3.3 70B (23x larger, GPT-4 level quality)
- **Context-Aware**: Understands department queries, admission questions, and faculty information
- **Source Citations**: Every answer includes clickable source links for verification

#### 📱 Native Android App (Kotlin)
- **Complete Rewrite**: Migrated from Capacitor to native Kotlin WebView implementation
- **Enhanced Performance**: Faster load times and smoother navigation
- **Improved Security**: Hardened web bootstrap with WebViewAssetLoader
- **Better Offline Support**: Native caching and offline-first architecture
- **APK Signing**: Production-ready signed APK builds
- **Auth Integration**: Seamless authentication flow for Android users

#### 🔄 Routing & Navigation Improvements
- **Simplified Routes**: Clean URL structure (/ for auth, /student-dashboard for students)
- **Android-Optimized**: Fixed auth redirects and deep linking for Android app
- **App URL Helper**: Unified URL handling across web and mobile platforms
- **Better UX**: Improved navigation flow and reduced redirect loops

#### 🛠️ Technical Infrastructure
- **Supabase Integration**: Full pgvector support for semantic search
- **RAG Pipeline**: 3-step data pipeline (scrape → ingest → sync)
- **Python Scraper**: Comprehensive CUK website scraper with Playwright support
- **Query Optimization**: Multi-query retrieval with deduplication
- **Enhanced Embeddings**: sentence-transformers/all-MiniLM-L6-v2 for vector search

#### 🐛 Bug Fixes & Stability
- **TypeScript Improvements**: Fixed type errors and improved type safety
- **Assignment Bug Fixes**: Resolved issues with assignment submissions
- **Sidebar Fixes**: Fixed toggle behavior and mobile sidebar issues
- **Supabase Integration**: Improved Capacitor compatibility
- **Build Optimizations**: Resolved TS build errors and improved compilation

#### 🏷️ Version Milestone
- `v6.5.0` reflects the addition of AI chatbot, native Android app, and comprehensive infrastructure improvements

---
## ✨ Key Features

### 🎓 Student Portal
- **AI Chatbot Assistant (NeMoX)**: Get instant answers about admissions, faculty, departments, and university information
- **Exam Schedule & Seating**: View exam dates, venues, and assigned seats with real-time updates
- **Marks & Performance**: Track grades, view detailed performance analytics and trends
- **Course Management**: Enroll in courses, view course details and materials
- **Assignments**: Submit assignments, track deadlines, and view feedback
- **Library**: Browse books, check availability, and manage borrowing
- **Resources**: Access learning materials, notes, and study resources
- **Leave Applications**: Apply for leave and track approval status
- **Notices**: Stay updated with announcements and important information

### 👨‍🏫 Teacher Dashboard
- **AI Chatbot Assistant**: Quick access to university information and faculty contacts
- **Marks Management**: Enter and manage student marks with bulk operations
- **Attendance Tracking**: Record and monitor student attendance
- **Assignment Grading**: Create assignments, review submissions, and provide feedback
- **Resource Sharing**: Upload and manage learning materials for students
- **Notice Board**: Post announcements for students and departments
- **Leave Management**: Review and approve student leave requests
- **Apply Leave**: Submit personal leave applications

### 🏛️ Admin Command Center
- **AI Chatbot Assistant**: Access comprehensive university data and analytics
- **Intelligent Scheduling Engine**: Automated exam timetable generation with constraint satisfaction
- **Conflict Prevention**: Detects and prevents scheduling conflicts automatically
- **Advanced Seating System**: Anti-cheating column-based algorithm for seating arrangements
- **Drag & Drop Interface**: Visual rescheduling with real-time conflict warnings
- **University Data Management**: Complete control over departments, courses, and holidays
- **User Management**: Manage students, teachers, and administrators
- **Bulk Operations**: Excel import/export for efficient data management

### ⚡ Enterprise-Grade Performance
- **AI-Powered Assistant**: Llama 3.3 70B model with RAG for intelligent responses
- **Real-Time Sync**: Supabase Realtime pushes updates instantly to all connected clients
- **Secure Operations**: Row-level security and role-based access control
- **Mobile Native**: Native Android application with Kotlin WebView shell
- **Performance Analytics**: Comprehensive tracking and visualization of academic performance
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Offline-First**: Service worker caching for reliable offline access

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Real-time, pgvector)
- **AI/ML**: Python, Llama 3.3 70B, sentence-transformers, FAISS, OpenRouter
- **State Management**: TanStack Query (React Query)
- **Utilities**: ExcelJS, jsPDF, Zod, React Hook Form
- **Mobile**: Kotlin + Android WebView shell for native app packaging
- **Scraping**: Playwright, BeautifulSoup4, httpx

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
npm run android:copy   # Build + copy web assets into Android project
npm run android:build  # Build release APK
```

## 🏗 Project Structure

- `src/components/admin`: Admin-specific tabs and management tools
- `src/components/teacher`: Teacher tools (marks, attendance, notices, assignments, resources)
- `src/components/student`: Student views (courses, exams, marks, performance, library, leave)
- `src/utils/scheduleAlgorithm.ts`: Core scheduling logic
- `src/utils/seatingAlgorithm.ts`: Seating distribution logic
- `supabase/migrations`: Database schema and RLS policies

## 🎯 Core Modules

### 🤖 AI Chatbot Assistant (NeMoX)
- **Intelligent Q&A System**: Answers questions about CUK admissions, faculty, departments, courses, and policies
- **Advanced RAG Pipeline**: Retrieval-augmented generation with Supabase pgvector for semantic search
- **Smart Query Processing**: Automatic query expansion and department detection
- **High Accuracy**: 95% accuracy in extracting contact information (emails, phones, names)
- **Comprehensive Knowledge**: 3,500+ chunks from 150+ pages and 300+ PDFs
- **Source Attribution**: Every answer includes clickable source links for verification
- **Real-time Updates**: Skeleton loading UI with streaming response support
- **Multi-role Access**: Available to students, teachers, and administrators

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
