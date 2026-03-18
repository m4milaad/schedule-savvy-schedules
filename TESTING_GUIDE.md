# CUK Acadex - Comprehensive Testing Guide

This guide provides detailed procedures for testing the application's key features with real credentials and data flows.

---

## 1. REAL CREDENTIALS VALIDATION & SUPABASE CONNECTION

### Prerequisites
- Supabase project URL and anon/public key configured in `.env`
- Real user accounts (student, teacher, admin, department_admin)
- Sample data in database (courses, enrollments, etc.)

### Test Cases

#### 1.1 Authentication Flow
- [ ] **Sign Up - Student**
  - Go to `/auth`
  - Click "Sign Up" tab
  - Select "Student" as account type
  - Enter full name, email (@cukashmir.ac.in), password (min 8 chars, uppercase, lowercase, number, special char)
  - Enter enrollment number
  - Submit → Should show "Account Created - Pending Approval"
  - Check email for confirmation
  - Verify user appears in Supabase `profiles` table with `user_type: 'student'`

- [ ] **Sign Up - Teacher**
  - Select "Teacher" as account type
  - Select department from dropdown
  - Complete registration
  - Should show pending approval message
  - Verify admin receives notification (check audit logs)

- [ ] **Sign Up - Department Admin**
  - Select "Department Admin"
  - Select department
  - Verify pending approval workflow

- [ ] **Sign In - Valid Credentials**
  - Sign in with valid admin credentials
  - Verify redirect to `/admin-dashboard`
  - Check JWT token stored in localStorage

- [ ] **Sign In - Invalid Credentials**
  - Test with wrong password → Show error toast
  - Test with non-existent email → Show error toast
  - Verify no token stored on failure

#### 1.2 Data Flow Validation

##### Course Selection & Schedule Generation
- [ ] **Login as Admin**
  - Navigate to `/schedule-generator`
  - Verify `courseTeachers` data loads from database
  - Check enrollment counts display correctly
  - Select courses with enrolled students
  - Set date range (start date, auto-calculated end date)
  - Click "Generate Schedule"

- [ ] **Schedule Generation Algorithm**
  - Verify schedule is generated without conflicts
  - Check that courses with shared students are not on same day
  - Verify gap day requirements are respected
  - Check semester-wise scheduling
  - Confirm venues are assigned

- [ ] **Save Schedule**
  - Click "Save Schedule"
  - Verify data written to `datesheets` table
  - Verify individual exam entries in `exam_schedules` table
  - Check toast shows success message

- [ ] **Audit Log Entry**
  - Navigate to `/admin-logs`
  - Search for "schedule" or "datesheets"
  - Verify INSERT/UPDATE entries with:
    - User: Admin full name and email
    - Action: INSERT or UPDATE
    - Table: `datesheets` or `exam_schedules`
    - Description: Detailed changes

##### Drag-and-Drop Editing
- [ ] **Manual Drag-and-Drop Test**
  - Generate a schedule
  - Drag an exam from one date to another
  - Verify visual feedback during drag
  - Drop on target date
  - Check for conflict validation:
    - Same day max 4 exams check
    - Student overlap check
    - Gap day requirement check
  - If conflict, verify "Override" option appears
  - After successful move, verify toast confirms
  - Save schedule and check database reflects changes

##### Student Conflict Detection
- [ ] **Enrollment-Based Conflicts**
  - Ensure two courses share at least one student
  - Schedule both on same day → Should show conflict error
  - Error message should show number of conflicting students
  - Move one exam → Should work if no conflicts

#### 1.3 Multi-Role Testing

- [ ] **Student Dashboard**
  - Login as student
  - Navigate to `/` (StudentDashboard)
  - Verify enrolled courses display
  - Check exam schedule shows assigned exams
  - Verify seat assignments (if available)
  - Test "My Performance" tab - should show marks/attendance

- [ ] **Teacher Dashboard**
  - Login as teacher
  - Navigate to `/teacher-dashboard`
  - Verify assigned courses display
  - Check attendance taking functionality
  - Test marks entry
  - Verify notices can be created
  - Check leave application workflow

- [ ] **Department Admin**
  - Login as department admin
  - Access `/admin-dashboard` (limited permissions)
  - Verify can manage own department's data
  - Check cannot access other departments' data

---

## 2. DRAG-AND-DROP SCHEDULE EDITING

### Automated Test Suite

Run the automated drag-and-drop tests:

```bash
cd .claude/skills/webapp-testing
python drag_and_drop_test.py
```

**Test Coverage:**
- Load existing schedule
- Drag exam to different date
- Attempt to create conflict (should be blocked)
- Override with confirmation
- Verify gap day validation
- Check max 4 exams per day limit
- Save updated schedule

### Manual Verification Checklist

- [ ] **Visual Feedback**
  - Grab cursor appears on hover over exam card
  - Semi-transparent ghost element while dragging
  - Highlighted drop zones on valid dates
  - Smooth animation to new position

- [ ] **Validation Messages**
  - Student conflict → "X students enrolled in both courses"
  - Max exams → "Maximum 4 exams allowed per day"
  - Gap violation → "Gap requirement not met (only X days, needs Y)"
  - Each error has "Override" button

- [ ] **Override Flow**
  - Click "Override" on any validation error
  - Exam moves despite conflict
  - Toast shows "Exam Moved Successfully"
  - Schedule updates in database after save

- [ ] **Multi-Drag Testing**
  - Drag multiple exams in succession
  - Verify schedule recalculates correctly
  - Save and reload → Changes persist

---

## 3. MOBILE RESPONSIVENESS VERIFICATION

### Automated Viewport Tests

Run the mobile responsiveness test:

```bash
python mobile_responsive_test.py
```

**Viewports Tested:**
- Desktop: 1920×1080
- Laptop: 1366×768
- Tablet (Portrait): 768×1024
- Tablet (Landscape): 1024×768
- Mobile (iPhone 14): 390×844
- Mobile (iPhone SE): 375×667
- Mobile (Samsung Galaxy): 412×915

### Manual Device Testing

#### iOS (Safari)
- [ ] **iPhone 14 Pro Max** (430×932)
  - Theme toggle accessible
  - Auth form fits without scrolling
  - Buttons are touch-friendly (min 44×44 px)
  - Schedule cards readable
  - Drag-and-drop works with touch
  - Navigation menu (hamburger) works

- [ ] **iPad** (1024×1366)
  - Two-column layout for course selection
  - Sidebar navigation works
  - Export buttons visible
  - Table scrolls horizontally if needed

#### Android (Chrome)
- [ ] **Samsung Galaxy S23** (412×915)
  - Material design touch feedback
  - Status bar doesn't hide content
  - Offline indicator visible
  - Service worker registration working

- [ ] **Pixel 7** (412×915)
  - Check font scaling ( accessibility)
  - Test landscape mode
  - Verify pull-to-refresh doesn't interfere

#### PWA/Native App
- [ ] **Capacitor Build**
  - Install APK on Android device
  - Test splash screen
  - Verify offline mode
  - Test hardware back button
  - Check status bar overlay
  - Test status bar and navigation bar colors

### Responsive Breakpoints to Verify

| Breakpoint | Expected Layout |
|------------|----------------|
| `< 640px`  | Single column, hamburger menu, stacked buttons |
| `640-768px`| Two-column course grid, visible sidebar |
| `768-1024px`| Full desktop layout, optimized tablet |
| `> 1024px`| Full-width with max container |

---

## 4. OFFLINE CAPABILITIES & NETWORK THROTTLING

### Service Worker Testing

#### 4.1 Install & Activation
- [ ] Open DevTools → Application → Service Workers
  - Verify service worker is registered
  - Check status: "Activated and running"
  - Verify `service-worker.js` scope
  - Check "Update on reload" enabled

#### 4.2 Offline Functionality
- [ ] **Offline Detection**
  - Open app normally
  - Open DevTools → Network tab
  - Select "Offline" throttling
  - Verify offline indicator appears in UI
  - Check offline banner shows at top

- [ ] **Cached Pages Load**
  - Visit `/auth` while online
  - Go offline
  - Refresh → Auth page should load
  - Try navigating to cached routes

- [ ] **Static Assets**
  - Verify Tailwind CSS loads from cache
  - Verify fonts load (custom fonts may need network)
  - Verify images (logos) cached

- [ ] **API Calls Offline**
  - Generate schedule → Try to save while offline
  - Should get error: "No internet connection"
  - Verify error toast appears
  - Check no data is saved intermediately

#### 4.3 Background Sync Testing

If background sync is implemented:
- [ ] Form submission while offline
  - Fill auth form (but don't submit) while offline
  - Submit → Should be queued
  - Go back online → Should sync automatically
  - Check toast confirms sync

#### 4.4 Network Throttling Scenarios

Test with various throttling profiles:

1. **Fast 3G** (1.5 Mbps down, 750 Kbps up, 150ms RTT)
   - Load times should be acceptable (< 5s)
   - Skeleton loaders appear
   - Images lazy-load

2. **Slow 3G** (400 Kbps down, 400 Kbps up, 400ms RTT)
   - Progressive rendering
   - Critical data loads first
   - Placeholder content shows

3. **Offline**
   - Cached routes work
   - API calls fail gracefully
   - User can't create/update data

---

## 5. AUDIT LOGS VERIFICATION

### Audit Log Database Schema

Verify your `audit_logs` table has these columns:
```
- id (uuid, PK)
- user_id (uuid, FK to profiles)
- user_type (enum: admin, department_admin, teacher, student)
- action (enum: INSERT, UPDATE, DELETE)
- table_name (varchar)
- description (text, nullable)
- old_data (jsonb, nullable)
- new_data (jsonb, nullable)
- created_at (timestamp, default now())
```

### Automated Audit Test

Run: `python audit_logs_test.py` (create this script)

Should verify:
- [ ] All CRUD operations create audit entries
- [ ] User identity captured correctly
- [ ] Old and new data preserved for UPDATE/DELETE
- [ ] Timestamp accurate
- [ ] Audit logs paginate correctly
- [ ] Export to CSV works (< 1000 records)
- [ ] Search/filter works across all fields

### Manual Audit Trail Testing

#### 5.1 Create Log Entry
- [ ] **Action**: Create a new course (admin)
  - Go to Admin Dashboard → Courses
  - Add new course: `CS101`, `Introduction to Computer Science`
  - Click "Create Course"
  - Navigate to `/admin-logs`
  - **Verify**:
    - Row appears at top (newest first)
    - User: Admin full name
    - Action: INSERT (green badge)
    - Table: `courses`
    - Details: Shows course code and name

#### 5.2 Update Log Entry
- [ ] **Action**: Edit course description
  - Edit `CS101`, change description to "Intro to CS"
  - Save
  - Check audit log:
    - Action: UPDATE (blue badge)
    - Details: "Description: "old" → "new""
    - If multiple fields changed, show all (max 4)

#### 5.3 Delete Log Entry
- [ ] **Action**: Delete a course
  - Delete `CS101`
  - Check audit log:
    - Action: DELETE (red badge)
    - Shows what was deleted (course code/name)

#### 5.4 Cascade Logging
- [ ] **Complex Operation**: Generate schedule
  - Create schedule with 10 exams
  - Check audit logs capture:
    - `datesheets` INSERT (schedule metadata)
    - `exam_schedules` INSERT (individual exams)
    - All with same user context

#### 5.5 Export Functionality
- [ ] **Export CSV**
  - Click "Export All (N)"
  - Verify downloads: `audit_logs_full_YYYY-MM-DD_HH-mm.csv`
  - Open in Excel/LibreOffice
  - Check columns: Timestamp, User Name, User Email, User Type, Action, Table, Description
  - Verify all entries included (use clear then generate new data)
  - Maximum 1000 records in page load but export should fetch all

#### 5.6 Clear Logs
- [ ] **Clear All**
  - Click "Clear" button
  - Confirmation dialog appears
  - Click "Delete All"
  - All logs disappear
  - Count shows "0"
  - Page shows "No audit logs found"
  - **Warning**: This is destructive! Only test on dev/staging

#### 5.7 Search & Filter
- [ ] **Search by User Name**
  - Type admin name → Shows only that user's logs
- [ ] **Search by Table**
  - Type "courses" → Shows all course modifications
- [ ] **Search by Action**
  - Type "INSERT" → Shows all inserts
- [ ] **Combined Search**
  - "CS UPDATE" → Course updates mentioning CS

#### 5.8 Pagination
- [ ] **Load More**
  - Generate 150+ log entries (bulk operations)
  - Initial load: 100 entries
  - Click "Load More" → Next 100 loads
  - Button shows "200 of 198"
  - When all loaded, button disappears

#### 5.9 Real-time Updates
- [ ] **Multi-User Scenario**
  - Open audit logs in two browser windows (admin1, admin2)
  - Admin2 creates a new course
  - Admin1 clicks "Refresh" → New entry appears
  - Or wait for auto-refresh if implemented

---

## 6. ADDITIONAL INTEGRATION TESTS

### Excel Export
- [ ] Generate schedule with 50+ exams
- [ ] Click "Download Excel"
- [ ] Verify file downloads: `exam-schedule-YYYY-MM-DD.xlsx`
- [ ] Open in Excel/LibreOffice
- [ ] Check columns: Date, Day, Time, Course Code, Teacher, Semester, Program, Gap Days, First Paper, Venue
- [ ] Verify all data matches on-screen schedule
- [ ] Check sorting (by date)
- [ ] Test with special characters in course names
- [ ] Verify cell formatting (dates, text alignment)

### Mobile Schedule Viewer
- [ ] Access `/mobile-schedule` on mobile device
- [ ] Verify simplified interface
- [ ] Check dates selectable (date picker)
- [ ] View exams for selected date
- [ ] Test offline indicator
- [ ] Verify pull-to-refresh works

### Password Reset
- [ ] Click "Forgot Password?" on auth page
- [ ] Enter registered email
- [ ] Submit → "Success" toast
- [ ] Check email inbox for reset link
- [ ] Follow link → `/reset-password` page
- [ ] Enter new password (must meet requirements)
- [ ] Submit → Redirect to login
- [ ] Login with new password → Success

---

## Test Execution Checklist

### Before Testing
- [ ] Server running on http://localhost:8082
- [ ] Supabase connection configured
- [ ] Test accounts created (various roles)
- [ ] Sample data in database (courses, students, teachers)
- [ ] Audit logs table exists with RLS policies

### During Testing
- [ ] Take screenshots of any failures
- [ ] Record console errors (F12 → Console)
- [ ] Network requests logging enabled
- [ ] Document steps to reproduce issues

### After Testing
- [ ] Export audit logs for review
- [ ] Compare expected vs actual outcomes
- [ ] Log any bugs found in GitHub Issues
- [ ] Update test cases for regression

---

## Expected Results Summary

| Feature | Expected Behavior | Failure Criteria |
|---------|------------------|------------------|
| Auth | Secure login with JWT, redirects properly | Unauthorized access allowed, no redirect |
| Schedule Gen | Conflict-free schedule generated | Conflicts detected by algorithm |
| Drag-Drop | Smooth with validation | No feedback, crashes on invalid drop |
| Audit Logs | All CRUD operations logged | Missing entries, wrong user attribution |
| Mobile | Fully functional on small screens | Layout breaks, touch targets too small |
| Offline | Cached pages load, graceful API failures | Blank screen, no error messages |
| Export | Excel/CSV downloads with all data | Missing columns, truncated data |

---

## Automated Test Commands

```bash
# Run all automated tests
cd .claude/skills/webapp-testing

# 1. Comprehensive app structure test
python comprehensive_app_test.py

# 2. Drag-and-drop tests
python drag_and_drop_test.py

# 3. Mobile responsive tests
python mobile_responsive_test.py

# 4. Offline capabilities test
python offline_test.py

# 5. Audit logs test
python audit_logs_test.py

# Or run all sequentially
for script in *_test.py; do echo "Running $script"; python $script; done
```

---

## Quick Smoke Test (5 minutes)

1. **Auth**: Sign up (student), confirm email, sign in
2. **Dashboard**: Student dashboard loads with courses
3. **Admin**: Sign in as admin, go to schedule generator
4. **Schedule**: Generate schedule, verify no conflicts
5. **Drag**: Drag exam to new date, test conflict detection
6. **Save**: Save schedule to database
7. **Audit**: Navigate to audit logs, see entries
8. **Export**: Download Excel, verify data
9. **Mobile**: Resize to mobile, verify layout
10. **Offline**: Enable offline mode, refresh → cached page loads

✅ **All pass** → System is production-ready

---

## Contact & Support

For issues found during testing:
1. Check browser console for errors
2. Check Supabase logs in dashboard
3. Verify environment variables in `.env`
4. Review audit logs for failed operations
5. Test with different browsers (Chrome, Firefox, Safari)
