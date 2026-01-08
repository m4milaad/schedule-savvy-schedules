# Contributing to CUK Exam Schedule System

Thank you for your interest in contributing to the Central University of Kashmir Exam Schedule System! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Guidelines](#contributing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Issue Reporting](#issue-reporting)
- [Security](#security)
- [Recognition](#recognition)

## Code of Conduct

This project adheres to our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher) or **bun** (v1.0.0 or higher)
- **Git** (v2.30.0 or higher)
- **Code Editor** (VS Code recommended with extensions)

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-json"
  ]
}
```

## Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/cuk-exam-schedule.git
cd cuk-exam-schedule

# Add upstream remote
git remote add upstream https://github.com/CUK-IT/cuk-exam-schedule.git
```

### 2. Install Dependencies

```bash
# Using npm
npm install

# Using bun (faster alternative)
bun install
```

### 3. Environment Setup

```bash
# Copy environment template
cp .env.example .env.local

# Configure your environment variables
# Contact maintainers for Supabase credentials
```

### 4. Start Development Server

```bash
# Using npm
npm run dev

# Using bun
bun run dev
```

### 5. Verify Setup

- Open [http://localhost:5173](http://localhost:5173)
- Ensure the application loads without errors
- Check browser console for any warnings

## Contributing Guidelines

### Types of Contributions

We welcome various types of contributions:

#### 🐛 Bug Fixes
- Fix existing functionality issues
- Improve error handling
- Resolve performance problems

#### ✨ New Features
- Add new functionality
- Enhance existing features
- Improve user experience

#### 📚 Documentation
- Update README files
- Add code comments
- Create user guides
- Write API documentation

#### 🎨 UI/UX Improvements
- Enhance visual design
- Improve accessibility
- Optimize mobile experience
- Add animations and transitions

#### ⚡ Performance Optimizations
- Reduce bundle size
- Improve loading times
- Optimize database queries
- Enhance caching strategies

#### 🧪 Testing
- Add unit tests
- Create integration tests
- Improve test coverage
- Add end-to-end tests

### Contribution Workflow

1. **Check Existing Issues**
   - Search for existing issues before creating new ones
   - Comment on issues you'd like to work on
   - Wait for maintainer assignment before starting work

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

3. **Make Changes**
   - Follow coding standards
   - Write meaningful commit messages
   - Add tests for new functionality
   - Update documentation as needed

4. **Test Your Changes**
   ```bash
   # Run linting
   npm run lint
   
   # Run type checking
   npm run type-check
   
   # Run tests (when available)
   npm run test
   
   # Build for production
   npm run build
   ```

5. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

6. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## Pull Request Process

### Before Submitting

- [ ] Code follows project coding standards
- [ ] All tests pass (when available)
- [ ] Documentation is updated
- [ ] Commit messages are clear and descriptive
- [ ] Branch is up to date with main branch

### PR Template

When creating a pull request, use this template:

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] I have tested these changes locally
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Checklist
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
```

### Review Process

1. **Automated Checks**
   - Linting and formatting
   - Type checking
   - Build verification
   - Security scanning

2. **Code Review**
   - At least one maintainer review required
   - Address all feedback before merge
   - Maintain respectful communication

3. **Testing**
   - Manual testing by reviewers
   - Automated test execution
   - Performance impact assessment

## Coding Standards

### TypeScript Guidelines

```typescript
// ✅ Good: Use explicit types
interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
}

// ✅ Good: Use meaningful names
const fetchUserProfile = async (userId: string): Promise<UserProfile> => {
  // Implementation
};

// ❌ Avoid: Any types
const userData: any = {};

// ❌ Avoid: Unclear names
const getData = () => {};
```

### React Component Guidelines

```tsx
// ✅ Good: Functional components with TypeScript
interface ButtonProps {
  variant: 'primary' | 'secondary';
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant, 
  onClick, 
  children, 
  disabled = false 
}) => {
  return (
    <button
      className={cn(
        'px-4 py-2 rounded-md font-medium transition-colors',
        variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
        variant === 'secondary' && 'bg-gray-200 text-gray-900 hover:bg-gray-300',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
```

### CSS/Tailwind Guidelines

```tsx
// ✅ Good: Use Tailwind utility classes
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
  <h2 className="text-xl font-semibold text-gray-900">Title</h2>
  <Button variant="primary">Action</Button>
</div>

// ✅ Good: Use cn() for conditional classes
<div className={cn(
  'base-classes',
  isActive && 'active-classes',
  variant === 'large' && 'large-classes'
)}>

// ❌ Avoid: Inline styles
<div style={{ padding: '16px', backgroundColor: 'white' }}>
```

### File Organization

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Basic UI primitives
│   ├── admin/           # Admin-specific components
│   ├── student/         # Student-specific components
│   └── teacher/         # Teacher-specific components
├── pages/               # Page components
├── hooks/               # Custom React hooks
├── utils/               # Utility functions
├── types/               # TypeScript type definitions
├── lib/                 # Third-party library configurations
└── styles/              # Global styles
```

### Naming Conventions

- **Files**: `kebab-case.tsx` or `PascalCase.tsx` for components
- **Components**: `PascalCase`
- **Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Types/Interfaces**: `PascalCase`

## Testing Guidelines

### Unit Testing (Future Implementation)

```typescript
// Example test structure
describe('Button Component', () => {
  it('should render with correct text', () => {
    render(<Button variant="primary">Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button variant="primary" onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Integration Testing

- Test component interactions
- Verify API integrations
- Test user workflows
- Validate data flow

### Manual Testing Checklist

- [ ] Feature works as expected
- [ ] Responsive design on mobile/tablet/desktop
- [ ] Accessibility (keyboard navigation, screen readers)
- [ ] Performance (no significant slowdowns)
- [ ] Cross-browser compatibility
- [ ] Error handling and edge cases

## Documentation

### Code Documentation

```typescript
/**
 * Generates an optimized exam schedule using intelligent algorithms
 * 
 * @param courses - Array of courses to schedule
 * @param constraints - Scheduling constraints and preferences
 * @param options - Additional configuration options
 * @returns Promise resolving to generated schedule
 * 
 * @example
 * ```typescript
 * const schedule = await generateExamSchedule(courses, {
 *   startDate: new Date('2024-05-01'),
 *   endDate: new Date('2024-05-31'),
 *   excludeWeekends: true
 * });
 * ```
 */
export async function generateExamSchedule(
  courses: Course[],
  constraints: ScheduleConstraints,
  options?: ScheduleOptions
): Promise<ExamSchedule> {
  // Implementation
}
```

### README Updates

When adding new features, update relevant README sections:

- Feature descriptions
- Installation instructions
- Usage examples
- API documentation

## Issue Reporting

### Bug Reports

Use the bug report template:

```markdown
**Bug Description**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
- OS: [e.g. Windows 10, macOS 12.0]
- Browser: [e.g. Chrome 96, Firefox 95]
- Version: [e.g. 5.1.0]

**Additional Context**
Add any other context about the problem here.
```

### Feature Requests

Use the feature request template:

```markdown
**Is your feature request related to a problem?**
A clear and concise description of what the problem is.

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
```

## Security

### Reporting Security Issues

**DO NOT** create public issues for security vulnerabilities. Instead:

1. Email security concerns to: security@cukashmir.ac.in
2. Include detailed description of the vulnerability
3. Provide steps to reproduce (if applicable)
4. Allow reasonable time for response before disclosure

### Security Best Practices

- Never commit sensitive data (API keys, passwords)
- Use environment variables for configuration
- Validate all user inputs
- Follow OWASP security guidelines
- Keep dependencies updated

## Recognition

### Contributors

We recognize contributors in several ways:

- **Contributors List**: Added to README.md
- **Release Notes**: Mentioned in version releases
- **Hall of Fame**: Special recognition for significant contributions
- **Mentorship**: Opportunities to mentor new contributors

### Contribution Types

We recognize various contribution types:

- 💻 Code contributions
- 📖 Documentation improvements
- 🐛 Bug reports and fixes
- 💡 Feature suggestions
- 🎨 Design contributions
- 🌍 Translation efforts
- 📢 Community building

## Getting Help

### Communication Channels

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Email**: development@cukashmir.ac.in
- **Office Hours**: Available for CUK students and faculty

### Mentorship Program

New contributors can request mentorship:

1. Comment on issues tagged `good-first-issue`
2. Mention you're new and would like guidance
3. A maintainer will provide support and code review

## Development Resources

### Useful Links

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Documentation](https://vitejs.dev/guide/)

### Learning Resources

- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [Tailwind CSS Best Practices](https://tailwindcss.com/docs/reusing-styles)
- [Git Best Practices](https://git-scm.com/book/en/v2)

## License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

**Thank you for contributing to the CUK Exam Schedule System!**

For questions about contributing, please reach out to the maintainers or create a discussion on GitHub.

**Maintainers:**
- Milad Ajaz Bhat (@miladajaz)
- Nimra Wani (@nimrawani)

**Institution:** Central University of Kashmir  
**Last Updated:** January 8, 2026