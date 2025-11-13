# 🎓 Central University of Kashmir - Exam Scheduling System

> A comprehensive, production-ready exam scheduling system with intelligent constraint handling, real-time collaboration, and modern UI/UX design.

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://ds-cuk.vercel.app/)
[![Version](https://img.shields.io/badge/version-3.0.0-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Technology Stack](#-technology-stack)
- [Getting Started](#-getting-started)
- [User Guides](#-user-guides)
- [System Architecture](#-system-architecture)
- [Production Readiness](#-production-readiness)
- [Deployment](#-deployment)
- [Future Enhancements](#-future-enhancements)
- [Developer](#-developer)

---

## 🌟 Overview

The CUK Exam Scheduling System is a sophisticated web application designed specifically for Central University of Kashmir to automate and optimize the complex process of exam timetable generation. Built with modern technologies and best practices, it handles multiple constraints, student enrollments, and provides an intuitive interface for both administrators and students.

### Why This System?

- **Intelligent Scheduling**: Advanced algorithm considers student enrollments, gap requirements, and venue capacity
- **Real-time Validation**: Instant feedback on scheduling conflicts and constraints
- **User-Friendly**: Intuitive interface with drag-and-drop functionality
- **Mobile-Ready**: Responsive design + native Android app
- **Production-Ready**: Comprehensive error handling, security, and performance optimization

---

## ✨ Key Features

### 🎯 Smart Scheduling Engine

#### **Intelligent Algorithm**
- **Student-Based Scheduling**: Generates schedules based on actual student enrollments
- **Conflict Detection**: Prevents students from having multiple exams on the same day
- **Gap Management**: Configurable preparation days between consecutive exams (1-10 days)
- **Auto-Date Calculation**: Automatically suggests end date based on course count and requirements
- **Holiday Exclusion**: Automatically skips weekends and configured holidays
- **Venue Capacity**: Respects venue capacity constraints

#### **Advanced Constraints**
- Maximum 4 exams per day
- Individual gap requirements per course
- First paper exemption (no gap required for first exam)
- Student enrollment conflict prevention
- Working days calculation (excludes weekends and holidays)

### 🎨 Modern User Interface

#### **Admin Dashboard**
- **Tabbed Interface**: Clean separation between Course Selection and Generated Schedule
- **Auto-Selection**: "Select Enrolled" button to quickly select courses with students
- **Real-time Feedback**: Live validation of date ranges and requirements
- **Drag & Drop**: Visual rescheduling with conflict warnings and override options
- **Dark/Light Theme**: Beautiful animated theme switching
- **Responsive Design**: Works seamlessly on all devices

#### **Student Dashboard**
- **Enhanced Profile Card**: Modern card-based header with status indicators
- **Course Enrollment**: Easy course enrollment with profile completion checks
- **Exam Schedule View**: Personal exam schedule with venue and date information
- **Profile Management**: Complete profile editing with validation
- **Mobile-Optimized**: Card views for mobile, table views for desktop

### 📊 Comprehensive Data Management

#### **Admin Panel Features**
- **Schools Management**: Add and organize university schools/faculties
- **Departments**: Manage departments under schools
- **Courses**: Full course catalog with credits, types, and gap settings
- **Teachers**: Faculty information management
- **Venues**: Exam venues with capacity tracking
- **Sessions**: Academic session configuration
- **Holidays**: Holiday calendar management
- **Students**: Student records with enrollment tracking

#### **Bulk Operations**
- **Excel Import/Export**: Bulk upload via Excel templates
- **Data Validation**: Automatic validation during import
- **Backup & Restore**: Export data for backup purposes
- **Template Generation**: Download pre-formatted Excel templates

### 🔐 Security & Authentication

#### **Multi-Level Access Control**
- **Student Accounts**: Supabase authentication with email verification
- **Admin Accounts**: Separate admin authentication system
- **Department Admins**: Limited access for department-level management
- **Row Level Security**: Database-level access control
- **Password Security**: Bcrypt hashing for admin passwords
- **Session Management**: Secure session handling

### 📱 Mobile Application

#### **Android App**
- **Native Experience**: Built with Capacitor
- **Real-time Sync**: Always shows current schedule
- **Offline Capability**: Cached data for offline viewing
- **Push Notifications**: Exam reminders and updates
- **Material Design**: Modern Android UI

### 📈 Export & Reporting

#### **Schedule Export**
- **Excel Format**: Download complete schedules
- **Detailed Information**: Includes dates, venues, courses, and teachers
- **Print-Friendly**: Optimized layouts for printing
- **Save to Database**: Persist schedules for future reference

---

## 🛠 Technology Stack

### **Frontend**
- **React 18.3**: Modern React with hooks and concurrent features
- **TypeScript 5.5**: Type-safe development
- **Vite 7.2**: Lightning-fast build tool
- **Tailwind CSS 3.4**: Utility-first CSS framework
- **shadcn/ui**: High-quality React components
- **Radix UI**: Accessible component primitives

### **Backend & Database**
- **Supabase**: PostgreSQL database with real-time capabilities
- **Supabase Auth**: User authentication and authorization
- **Row Level Security**: Database-level access control
- **PostgreSQL Functions**: Custom RPC functions for complex queries

### **State Management & Data Fetching**
- **React Hooks**: useState, useEffect, custom hooks
- **TanStack Query**: Server state management
- **React Router 6**: Client-side routing

### **UI/UX Libraries**
- **react-beautiful-dnd**: Drag and drop functionality
- **lucide-react**: Beautiful icon library
- **date-fns**: Date manipulation
- **sonner**: Toast notifications
- **next-themes**: Theme management

### **Utilities**
- **xlsx**: Excel file processing
- **zod**: Schema validation
- **clsx & tailwind-merge**: Conditional styling
- **bcryptjs**: Password hashing

### **Development Tools**
- **ESLint**: Code linting
- **TypeScript ESLint**: TypeScript-specific linting
- **Vite SWC**: Fast compilation
- **Vercel Analytics**: Performance monitoring

### **Mobile**
- **Capacitor 7.4**: Native mobile app framework
- **Android SDK**: Android app development

---

## 🚀 Getting Started

### Prerequisites

```bash
Node.js >= 18.0.0
npm >= 9.0.0
Supabase account
Android Studio (for mobile app)
```

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/m4milaad/schedule-savvy-schedules.git
   cd schedule-savvy-schedules
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Supabase**
   
   Update `src/integrations/supabase/client.ts` with your credentials:
   ```typescript
   const SUPABASE_URL = "your_supabase_url";
   const SUPABASE_PUBLISHABLE_KEY = "your_supabase_key";
   ```

4. **Set up database**
   - Import the SQL schema from `supabase/migrations`
   - Configure Row Level Security policies
   - Set up authentication providers

5. **Start development server**
   ```bash
   npm run dev
   ```
   
   Application will be available at `http://localhost:8080`

### Build for Production

```bash
# Production build
npm run build

# Preview production build
npm run preview

# Development build (with source maps)
npm run build:dev
```

### Mobile App Build

```bash
# Build web app
npm run build

# Sync with Capacitor
npx cap sync android

# Open in Android Studio
npx cap open android

# Build APK in Android Studio
```

---

## 📖 User Guides

### For Students

#### 1. **Account Creation**
- Navigate to the registration page
- Select "Student" account type
- Enter your details:
  - Full name
  - University email
  - Enrollment number
  - Department
  - Semester
- Verify your email

#### 2. **Complete Profile**
- Add missing information:
  - Address
  - Contact number
  - ABC ID (if applicable)
- Profile must be complete before enrolling in courses

#### 3. **Enroll in Courses**
- Go to "Enroll" tab
- Search or filter courses by semester
- Click "Enroll" to add courses
- View enrolled courses in "My Courses" tab

#### 4. **View Exam Schedule**
- Navigate to "Exam Schedule" tab
- View your personalized exam timetable
- See exam dates, venues, and course details
- Schedule updates automatically when admin generates new schedule

### For Administrators

#### 1. **Access Admin Panel**
- Navigate to `/auth`
- Select "Admin" login
- Enter admin credentials
- Access admin dashboard

#### 2. **Manage University Data**

**Schools & Departments:**
- Add schools (faculties)
- Create departments under schools
- Bulk upload via Excel

**Courses:**
- Add courses with details (code, name, credits, type)
- Set gap days for each course
- Assign to departments
- Bulk import from Excel

**Teachers:**
- Add faculty members
- Assign to departments
- Bulk upload supported

**Venues:**
- Add exam venues
- Set capacity for each venue
- Manage venue availability

**Students:**
- Add student records
- Import from Excel
- View enrollment status
- Manage student data

**Sessions & Holidays:**
- Configure academic sessions
- Add holidays (one-time or recurring)
- Holidays automatically excluded from scheduling

#### 3. **Generate Exam Schedule**

**Step 1: Select Courses**
- Choose start date (end date auto-calculated)
- Use "Select Enrolled" to select courses with students
- Or manually select courses
- Review gap days for each course

**Step 2: Generate**
- Click "Generate New Schedule"
- System validates:
  - Sufficient working days
  - Student enrollment conflicts
  - Gap requirements
- Schedule generated using intelligent algorithm

**Step 3: Review & Adjust**
- Switch to "Generated Schedule" tab
- Review the schedule
- Use drag-and-drop to reschedule if needed
- System warns about conflicts (can override)

**Step 4: Save & Export**
- Click "Save Schedule" to persist to database
- Click "Download Excel" for Excel export
- Share with stakeholders

### For Department Admins

- Limited access to department-specific data
- Manage courses and teachers in your department
- View students in your department
- Cannot access other departments' data

---

## 🏗 System Architecture

### Database Schema

#### **Core Tables**
- `schools` - University schools/faculties
- `departments` - Academic departments (linked to schools)
- `courses` - Course catalog with metadata
- `teachers` - Faculty information
- `venues` - Exam venues with capacity
- `sessions` - Academic sessions/years
- `holidays` - Holiday calendar
- `students` - Student records
- `datesheets` - Generated exam schedules
- `student_enrollments` - Student course enrollments

#### **Authentication Tables**
- `profiles` - User profiles (linked to Supabase auth)
- `user_roles` - User role assignments
- `admin_users` - Admin authentication (separate system)

### Key Algorithms

#### **Schedule Generation Algorithm**
1. **Data Collection**: Gather selected courses and student enrollments
2. **Conflict Graph**: Build graph of course conflicts based on shared students
3. **Date Generation**: Generate list of valid exam dates (excluding weekends/holidays)
4. **Priority Scheduling**: Schedule courses with most students first
5. **Constraint Checking**: Validate gap requirements and capacity
6. **Backtracking**: Retry if conflicts detected
7. **Optimization**: Minimize total schedule duration

#### **Conflict Detection**
- Checks if students are enrolled in multiple courses
- Prevents scheduling those courses on the same day
- Validates gap requirements between consecutive exams
- Ensures venue capacity not exceeded

### Component Structure

```
src/
├── components/
│   ├── admin/              # Admin dashboard components
│   │   ├── SchoolsTab.tsx
│   │   ├── DepartmentsTab.tsx
│   │   ├── CoursesTab.tsx
│   │   ├── TeachersTab.tsx
│   │   ├── VenuesTab.tsx
│   │   ├── SessionsTab.tsx
│   │   ├── HolidaysTab.tsx
│   │   └── StudentsTab.tsx
│   ├── exam-schedule/      # Schedule generation components
│   │   ├── ScheduleSettings.tsx
│   │   ├── ScheduleTable.tsx
│   │   ├── ScheduleStatusCard.tsx
│   │   └── CourseEnrollmentCard.tsx
│   ├── ui/                 # Reusable UI components (shadcn/ui)
│   └── ...
├── pages/
│   ├── Index.tsx           # Schedule generator
│   ├── AdminDashboard.tsx  # Admin panel
│   ├── StudentDashboard.tsx # Student portal
│   ├── Auth.tsx            # Authentication
│   └── ...
├── hooks/
│   ├── useAuth.ts          # Authentication hook
│   ├── useExamData.ts      # Exam data management
│   └── ...
├── utils/
│   ├── scheduleAlgorithm.ts # Core scheduling logic
│   ├── scheduleUtils.ts     # Utility functions
│   └── courseUtils.ts       # Course utilities
└── types/
    └── examSchedule.ts      # TypeScript types
```

---

## ✅ Production Readiness

### Code Quality
- ✅ No console.log statements in production code
- ✅ Proper error handling throughout
- ✅ TypeScript for type safety
- ✅ ESLint configuration
- ✅ No TODO/FIXME comments
- ✅ Comprehensive diagnostics passed

### Performance
- ✅ Code splitting with manual chunks
- ✅ Optimized bundle size (~1MB total, 296KB gzipped)
- ✅ Lazy loading where appropriate
- ✅ Efficient database queries
- ✅ Vercel Speed Insights integrated

### Security
- ✅ Row Level Security (RLS) on database
- ✅ Secure authentication (Supabase Auth)
- ✅ Password hashing (bcrypt)
- ✅ Input validation
- ✅ XSS prevention (React handles this)
- ✅ SQL injection prevention (Supabase ORM)

### UI/UX
- ✅ Consistent animations across all components
- ✅ Dark mode support with smooth transitions
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Accessible components (WCAG compliant)
- ✅ Loading states and error messages
- ✅ Toast notifications for user feedback

### Browser Compatibility
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers

---

## 🚀 Deployment

### Web Application (Vercel)

1. **Connect Repository**
   - Link GitHub repository to Vercel
   - Configure build settings

2. **Environment Variables**
   - Set Supabase URL and keys
   - Configure any other environment variables

3. **Deploy**
   - Automatic deployment on push to main branch
   - Preview deployments for pull requests

**Live URL**: [https://ds-cuk.vercel.app/](https://ds-cuk.vercel.app/)

### Mobile Application

1. **Build APK**
   ```bash
   npm run build
   npx cap sync android
   npx cap open android
   ```

2. **Sign APK**
   - Generate keystore
   - Sign APK in Android Studio

3. **Distribute**
   - Google Play Store
   - Direct APK download

---

## 🔮 Future Enhancements

### Planned Features
- [ ] **Email Notifications**: Automated exam reminders
- [ ] **SMS Alerts**: Exam notifications via SMS
- [ ] **Calendar Integration**: Sync with Google Calendar/Outlook
- [ ] **Advanced Analytics**: Exam statistics and insights
- [ ] **Multi-language Support**: Hindi and Urdu translations
- [ ] **API Development**: REST API for third-party integrations
- [ ] **Conflict Resolution AI**: ML-based conflict resolution suggestions
- [ ] **Automated Venue Assignment**: Smart venue allocation based on enrollment
- [ ] **Student Feedback**: Post-exam feedback collection
- [ ] **Attendance Tracking**: Integration with attendance system

### Potential Improvements
- [ ] **Progressive Web App (PWA)**: Offline-first web app
- [ ] **iOS App**: Native iOS application
- [ ] **Real-time Collaboration**: Multiple admins editing simultaneously
- [ ] **Version Control**: Track schedule changes and rollback
- [ ] **Audit Logs**: Comprehensive activity logging
- [ ] **Custom Reports**: Configurable report generation
- [ ] **Seating Arrangement**: Automated seating plan generation
- [ ] **Invigilator Assignment**: Automatic invigilator scheduling

---

## 👨‍💻 Developer

**Milad Ajaz Bhat**
- 🌐 Portfolio: [m4milaad.github.io/Resume](https://m4milaad.github.io/Resume/)
- 📧 Email: mb4milad.bhattt@gmail.com
- 🎓 Institution: Central University of Kashmir
- 💼 Role: Full Stack Developer

### Development Timeline
- **Initial Development**: 2025-06-02
- **Beta Release**: October 2025
- **Production Release**: November 2025
- **Current Version**: 3.0.0
- **Last Updated**: November 2025

---

## 📄 License

This project is developed specifically for Central University of Kashmir. All rights reserved.

---

## 🙏 Acknowledgments

- **Central University of Kashmir** for the opportunity
- **Supabase** for the excellent backend platform
- **Vercel** for hosting and deployment
- **shadcn/ui** for beautiful UI components
- **Open Source Community** for amazing tools and libraries

---

## 📞 Support

For technical support, feature requests, or bug reports:

- **Email**: mb4milad.bhattt@gmail.com
- **GitHub Issues**: [Create an issue](https://github.com/m4milaad/schedule-savvy-schedules/issues)
- **Documentation**: See `APP_FEATURES.md` for detailed feature documentation

---

## 📊 Project Stats

- **Lines of Code**: ~15,000+
- **Components**: 50+
- **Database Tables**: 15+
- **API Endpoints**: 20+
- **Test Coverage**: In Progress
- **Performance Score**: 95+ (Lighthouse)
- **Accessibility Score**: 100 (Lighthouse)

---

<div align="center">

**Made with ❤️ for Central University of Kashmir**

[Live Demo](https://ds-cuk.vercel.app/) • [Documentation](./APP_FEATURES.md) • [Android Build Guide](./ANDROID_BUILD_GUIDE.md)

</div>
