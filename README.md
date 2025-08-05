# Central University of Kashmir - Exam Scheduling System

A comprehensive, production-ready exam scheduling system designed for Central University of Kashmir to efficiently manage and generate optimized exam timetables with advanced constraint handling and drag-and-drop functionality.

## 🎯 Features

### **Smart Scheduling Engine**
- **Gap-based Constraints**: Configurable preparation days between consecutive exams for each semester
- **Multi-Program Support**: Handles both B.Tech (Semesters 1-8) and M.Tech (Semesters 9-12) programs
- **Conflict Detection**: Prevents scheduling conflicts across multiple semesters
- **Holiday Management**: Excludes weekends and custom holidays from exam dates
- **Capacity Management**: Maximum 4 exams per day with semester-wise distribution

### **Interactive Interface**
- **Drag & Drop Rescheduling**: Visual interface to reschedule exams with real-time validation
- **Semester-wise Organization**: Separate management for odd/even semesters
- **Real-time Feedback**: Instant validation of scheduling constraints
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Dark/Light Theme**: Beautiful animated theme switching with system preference detection

### **Administrative Tools**
- **Comprehensive Data Management**: Schools, departments, courses, teachers, venues, sessions, holidays, and students
- **Bulk Import/Export**: Excel-based data import and export functionality
- **User Management**: Secure admin user creation and management with bcrypt password hashing
- **Custom Gap Settings**: Configure preparation days per course or use system defaults
- **Schedule Persistence**: Save and retrieve generated schedules

### **Export Capabilities**
- **Excel Export**: Download complete schedules in Excel format
- **Detailed Reports**: Include gap information, first paper indicators, and program details
- **Print-friendly Layouts**: Optimized for printing and sharing

### **Mobile Application**
- **Android App**: Native mobile app for students to view exam schedules
- **Real-time Sync**: Always shows current schedule from database
- **Offline Capability**: Cached data when offline
- **Push Notifications**: Exam reminders and updates

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn package manager
- Supabase account for database

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/cuk-official/exam-schedule-system.git
   cd exam-schedule-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Update .env with your Supabase credentials
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up the database**
   - Import the provided SQL schema into your Supabase project
   - Run the migration files in the `supabase/migrations` folder

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open your browser and navigate to `http://localhost:8080`
   - The application will be running with hot-reload enabled

## 📋 Usage Guide

### **For Students**

1. **Create Account**
   - Register with university email
   - Select "Student" account type
   - Enter enrollment number
   - Choose department

2. **View Schedule**
   - Access personal exam schedule
   - Filter by semester
   - View exam details and venues

3. **Mobile App**
   - Download the Android APK
   - View schedules offline
   - Get push notifications

### **For Administrators**

1. **Access Admin Panel**
   - Navigate to `/admin-login`
   - Login with administrator credentials
   - Access comprehensive dashboard

2. **Manage University Data**
   - **Schools**: Add and manage schools
   - **Departments**: Organize departments under schools
   - **Courses**: Create course catalog with credits and types
   - **Teachers**: Manage faculty information
   - **Venues**: Set up exam venues with capacity
   - **Sessions**: Configure academic sessions
   - **Holidays**: Set holidays to exclude from scheduling
   - **Students**: Manage student records

3. **Bulk Data Management**
   - Download Excel templates for bulk uploads
   - Import data with validation
   - Export current data for backup or sharing

4. **User Management**
   - Create additional admin accounts
   - Manage user permissions
   - Secure password management with bcrypt

### **For Schedule Generation**

1. **Configure Settings**
   - Select semester type (Odd/Even)
   - Set exam date range
   - Configure default gap days (preparation time)
   - Add holidays to exclude from scheduling

2. **Select Courses**
   - Choose courses for each semester
   - Review gap settings for each course
   - Use "Select All" for quick selection

3. **Generate Schedule**
   - Click "Generate Schedule" to create optimized timetable
   - Review generated schedule with visual indicators
   - Use drag-and-drop to make manual adjustments

4. **Export Results**
   - Save schedule to database
   - Download Excel report
   - Share with stakeholders

## 🏗️ System Architecture

### **Technology Stack**
- **Frontend**: React 18 with TypeScript
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth + Custom Admin Auth
- **Build Tool**: Vite
- **State Management**: React Hooks + TanStack Query
- **Drag & Drop**: react-beautiful-dnd
- **Excel Processing**: xlsx library
- **Mobile**: Capacitor for Android app

### **Database Schema**
- **schools**: University schools/faculties
- **departments**: Academic departments
- **courses**: Course catalog with metadata
- **teachers**: Faculty information
- **venues**: Exam venues with capacity
- **sessions**: Academic sessions/years
- **holidays**: Holiday calendar
- **students**: Student records
- **datesheets**: Generated exam schedules
- **admin_users**: Administrative access control
- **profiles**: User profiles for authentication

### **Key Components**
- **Schedule Generator**: Core algorithm for constraint-based scheduling
- **Drag & Drop Interface**: Interactive schedule modification
- **Admin Dashboard**: Comprehensive data management
- **Export System**: Excel and report generation
- **Mobile App**: Android application for students

## 🔧 Configuration

### **Gap Configuration**
```typescript
// Default gap days between exams (configurable)
defaultGapDays: 2

// Per-course gap override
course.gap_days: 1-10 days

// First paper rule: No gap required for first exam of each semester
```

### **Scheduling Constraints**
- Maximum 4 exams per day
- One exam per semester per day
- Configurable gap days between consecutive exams
- Weekend and holiday exclusions
- Program-specific semester handling

### **Time Slots**
- **Regular Days**: 12:00 PM - 2:30 PM
- **Fridays**: 11:00 AM - 1:30 PM

## 📊 Data Management

### **Excel Import Format**
| Field | Description | Required |
|-------|-------------|----------|
| Course Code | Unique course identifier | Yes |
| Course Name | Full course name | Yes |
| Teacher Name | Faculty member name | Yes |
| Semester | Semester number (1-12) | Yes |
| Program Type | B.Tech or M.Tech | Yes |

### **Supported Operations**
- Bulk course import/export
- Schedule backup and restore
- Data validation and error reporting
- Template generation for easy data entry

## 🛡️ Security Features

- **Supabase Authentication**: Secure user registration and login
- **Admin Authentication**: Separate admin login system with bcrypt password hashing
- **Row Level Security**: Database-level access control
- **Session Management**: Secure session handling
- **Role-based Access**: Different permissions for students, admins, and department admins
- **Data Validation**: Input validation and constraint checking

## 🎨 User Interface

### **Design Principles**
- **Intuitive Navigation**: Clear, logical flow for all user types
- **Visual Feedback**: Real-time validation and status indicators
- **Responsive Layout**: Optimized for all screen sizes
- **Accessibility**: WCAG-compliant design patterns
- **Dark/Light Theme**: Animated theme switching with smooth transitions

### **Color Coding**
- **B.Tech Semesters**: Red (1-2), Blue (3-4), Green (5-6), Purple (7-8)
- **M.Tech Semesters**: Orange (9-12)
- **Status Indicators**: Success (green), Warning (yellow), Error (red)

## 🔄 Development Workflow

### **Available Scripts**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run build:dev    # Build for development
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### **Development Guidelines**
- Follow TypeScript best practices
- Use component-based architecture
- Implement proper error handling
- Write descriptive commit messages
- Test thoroughly before deployment

## 📱 Mobile App Development

### **Android Build**
```bash
# Build web app
npm run build

# Sync with Capacitor
npx cap sync android

# Open in Android Studio
npx cap open android
```

### **Features**
- Native Android application
- Real-time data synchronization
- Offline capability
- Push notifications
- Material Design UI

## 📈 Performance Optimization

- **Code Splitting**: Lazy loading for optimal performance
- **Caching**: Efficient data caching strategies with TanStack Query
- **Bundle Optimization**: Minimized production builds
- **Database Indexing**: Optimized queries for large datasets
- **Image Optimization**: Proper favicon and asset management

## 🚀 Deployment

### **Web Application**
- Deploy to Netlify, Vercel, or any static hosting
- Configure environment variables
- Set up custom domain

### **Mobile Application**
- Build APK using Android Studio
- Sign with production keystore
- Distribute via Google Play Store or direct APK

## 🤝 Contributing

This system is specifically designed for Central University of Kashmir. For modifications or enhancements:

1. Follow the existing code structure and patterns
2. Ensure all changes maintain backward compatibility
3. Test thoroughly with realistic data sets
4. Document any new features or configuration options
5. Follow the component separation principles

## 📞 Support

For technical support or feature requests related to the Central University of Kashmir Exam Scheduling System:

- **Developer**: [Milad Ajaz Bhat](https://m4milaad.github.io/Resume/)
- **Email**: mb4milad.bhattt@gmail.com
- **University**: Central University of Kashmir

## 🔐 Admin Setup

### **Creating Admin Users**
1. Generate bcrypt hash for password:
   ```javascript
   const bcrypt = require('bcryptjs');
   bcrypt.hash('your_password', 10, (err, hash) => {
     console.log('Hash:', hash);
   });
   ```

2. Insert into database:
   ```sql
   INSERT INTO admin_users (username, password_hash, full_name, email, is_active)
   VALUES ('admin', 'generated_hash_here', 'Administrator', 'admin@cukashmir.ac.in', true);
   ```

## 📋 Database Schema

### **Core Tables**
- `schools` - University schools/faculties
- `departments` - Academic departments
- `courses` - Course catalog
- `teachers` - Faculty information
- `students` - Student records
- `venues` - Exam venues
- `sessions` - Academic sessions
- `holidays` - Holiday calendar
- `datesheets` - Exam schedules
- `admin_users` - Admin authentication
- `profiles` - User profiles

### **Authentication Tables**
- `profiles` - User profiles linked to Supabase auth
- `admin_users` - Separate admin authentication system

## 🎯 Future Enhancements

- **Advanced Analytics**: Exam statistics and reporting
- **Email Notifications**: Automated exam reminders
- **Calendar Integration**: Sync with Google Calendar
- **API Development**: REST API for third-party integrations
- **Multi-language Support**: Hindi and Urdu language options

---

**Developed by**: [Milad Ajaz Bhat](https://m4milaad.github.io/Resume/)  
**Institution**: Central University of Kashmir  
**Version**: 2.0.0  
**Last Updated**: January 2025

*This system is specifically designed for Central University of Kashmir's academic scheduling needs, incorporating institutional requirements and constraints for optimal exam timetable generation.*