# Central University of Kashmir - Exam Scheduling System

A comprehensive exam scheduling system designed for Central University of Kashmir to efficiently manage and generate optimized exam timetables with advanced constraint handling and drag-and-drop functionality.

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

### **Administrative Tools**
- **Course Management**: Add, edit, and delete course-teacher combinations
- **Bulk Import/Export**: Excel-based data import and export functionality
- **Custom Gap Settings**: Configure preparation days per course or use system defaults
- **Schedule Persistence**: Save and retrieve generated schedules

### **Export Capabilities**
- **Excel Export**: Download complete schedules in Excel format
- **Detailed Reports**: Include gap information, first paper indicators, and program details
- **Print-friendly Layouts**: Optimized for printing and sharing

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn package manager

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

3. **Set up environment variables**
   ```bash
   # Database configuration is pre-configured for the CUK system
   # No additional setup required for basic usage
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Open your browser and navigate to `http://localhost:8080`
   - The application will be running with hot-reload enabled

## 📋 Usage Guide

### **For Administrators**

1. **Access Admin Panel**
   - Click "Admin Panel" button on the homepage
   - Login with administrator credentials

2. **Manage Course Data**
   - Add individual courses or bulk import via Excel
   - Set custom gap days for specific courses
   - Configure semester assignments and program types

3. **Bulk Data Management**
   - Download Excel template for bulk uploads
   - Import course data with validation
   - Export current data for backup or sharing

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
- **Build Tool**: Vite
- **State Management**: React Hooks
- **Drag & Drop**: react-beautiful-dnd
- **Excel Processing**: xlsx library

### **Database Schema**
- **course_teacher_codes**: Course and teacher information with gap settings
- **exam_schedules**: Generated exam schedules with constraints
- **admin_users**: Administrative access control

### **Key Components**
- **Schedule Generator**: Core algorithm for constraint-based scheduling
- **Drag & Drop Interface**: Interactive schedule modification
- **Admin Dashboard**: Course and data management
- **Export System**: Excel and report generation

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
- **Regular Days**: 12:00 PM - 3:00 PM
- **Fridays**: 11:00 AM - 2:00 PM

## 📊 Data Management

### **Excel Import Format**
| Course Code | Teacher Code | Semester | Course Name | Teacher Name |
|-------------|--------------|----------|-------------|--------------|
| BT-101      | AH          | 1        | Business Tech | Ahmad Hassan |

### **Supported Operations**
- Bulk course import/export
- Schedule backup and restore
- Data validation and error reporting
- Template generation for easy data entry

## 🛡️ Security Features

- **Admin Authentication**: Secure login system for administrative access
- **Data Validation**: Input validation and constraint checking
- **Session Management**: Secure session handling
- **Access Control**: Role-based access to administrative functions

## 🎨 User Interface

### **Design Principles**
- **Intuitive Navigation**: Clear, logical flow for all user types
- **Visual Feedback**: Real-time validation and status indicators
- **Responsive Layout**: Optimized for all screen sizes
- **Accessibility**: WCAG-compliant design patterns

### **Color Coding**
- **B.Tech Semesters**: Red (1-2), Blue (3-4), Green (5-6), Purple (7-8)
- **M.Tech Semesters**: Orange (9-12)
- **Status Indicators**: Success (green), Warning (yellow), Error (red)

## 🔄 Development Workflow

### **Available Scripts**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### **Development Guidelines**
- Follow TypeScript best practices
- Use component-based architecture
- Implement proper error handling
- Write descriptive commit messages
- Test thoroughly before deployment

## 📈 Performance Optimization

- **Code Splitting**: Lazy loading for optimal performance
- **Caching**: Efficient data caching strategies
- **Bundle Optimization**: Minimized production builds
- **Database Indexing**: Optimized queries for large datasets

## 🤝 Contributing

This system is specifically designed for Central University of Kashmir. For modifications or enhancements:

1. Follow the existing code structure and patterns
2. Ensure all changes maintain backward compatibility
3. Test thoroughly with realistic data sets
4. Document any new features or configuration options

## 📞 Support

For technical support or feature requests related to the Central University of Kashmir Exam Scheduling System, please contact the development team.

## 👨‍💻 Developer

**Developed by**: [Milad Ajaz Bhat](https://m4milaad.github.io/Resume/)

---

*This system is specifically designed for Central University of Kashmir's academic scheduling needs, incorporating institutional requirements and constraints for optimal exam timetable generation.*
