import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { LegalLinks } from "@/components/LegalLinks";
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Eye, EyeOff, GraduationCap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from '@/hooks/use-toast';
import { PasswordStrengthChecker } from '@/components/PasswordStrengthChecker';
import logger from '@/lib/logger';
import { getAppBaseUrl } from '@/lib/appUrl';


interface Department {
  dept_id: string;
  dept_name: string;
}

const AUTH_TABS = ['Sign In', 'Sign Up'] as const;
type AuthTab = typeof AUTH_TABS[number];

const Auth = () => {
  const [activeTab, setActiveTab] = useState<AuthTab>('Sign In');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [userType, setUserType] = useState<'student' | 'department_admin' | 'admin' | 'teacher'>('student');
  const [deptId, setDeptId] = useState('');
  const [enrollmentNo, setEnrollmentNo] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const { signIn, signUp, user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isSignUp = activeTab === 'Sign Up';

  useEffect(() => {
    void loadDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user && profile) {
      switch (profile.user_type) {
        case 'admin':
        case 'department_admin':
          navigate('/admin-dashboard', { replace: true });
          break;
        case 'teacher':
          navigate('/teacher-dashboard', { replace: true });
          break;
        default:
          navigate('/student-dashboard', { replace: true });
      }
    }
  }, [user, profile, navigate]);

  const loadDepartments = async () => {
    setLoadingDepartments(true);
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('dept_id, dept_name')
        .order('dept_name');

      if (error) {
        logger.error('Error loading departments:', error);
        toast({ title: "Warning", description: "Could not load departments.", variant: "destructive" });
        setDepartments([]);
      } else {
        setDepartments(data || []);
      }
    } catch (error) {
      logger.error('Exception loading departments:', error);
      setDepartments([]);
    } finally {
      setLoadingDepartments(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast({ title: "Error", description: "Please enter your email address", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${getAppBaseUrl()}/reset-password`,
      });
      if (error) throw error;
      toast({ title: "Success", description: "Password reset link sent! Please check your email." });
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (error: unknown) {
      toast({ title: "Error", description: (error as Error).message || "Failed to send reset link", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
          return;
        }
        if (password.length < 8) {
          toast({ title: "Error", description: "Password must be at least 8 characters long", variant: "destructive" });
          return;
        }
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
        if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
          toast({ title: "Error", description: "Password must contain uppercase, lowercase, number, and special character", variant: "destructive" });
          return;
        }
        if (!fullName.trim()) {
          toast({ title: "Error", description: "Full name is required", variant: "destructive" });
          return;
        }
        if (userType === 'student' && !enrollmentNo.trim()) {
          toast({ title: "Error", description: "Enrollment number is required for students", variant: "destructive" });
          return;
        }
        if ((userType === 'department_admin' || userType === 'teacher' || userType === 'admin') && !deptId) {
          toast({ title: "Error", description: "Department selection is required", variant: "destructive" });
          return;
        }

        const userData = {
          full_name: fullName.trim(),
          user_type: userType,
          ...((userType === 'department_admin' || userType === 'teacher') && { dept_id: deptId }),
          ...(userType === 'student' && { student_enrollment_no: enrollmentNo.trim() }),
        };
        await signUp(email, password, userData);

        if (userType === 'department_admin' || userType === 'teacher') {
          toast({
            title: "Account Created - Pending Approval",
            description: `Your ${userType === 'teacher' ? 'teacher' : 'department admin'} account requires approval from an administrator.`,
            duration: 10000,
          });
        }
      } else {
        await signIn(email, password);
      }
    } catch (error) {
      logger.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background lg:grid lg:grid-cols-2">
      {/* Brand panel (desktop) */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary-foreground/10 ring-1 ring-primary-foreground/20">
            <img
              src="./CUKLogo.ico"
              alt=""
              className="size-6 object-contain"
              onError={(e) => {
                const t = e.target as HTMLImageElement;
                if (t.src.includes('CUKLogo.ico')) t.src = '/favicon.ico';
                else t.replaceWith(Object.assign(document.createElement('span'), { textContent: '🎓' }));
              }}
            />
          </span>
          <span className="text-lg font-semibold tracking-tight">CUK Acadex</span>
        </div>

        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Your campus, organised.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-primary-foreground/80">
            Exam schedules, marks, attendance, resources and notices — one place for
            students, teachers and administrators at the Central University of Kashmir.
          </p>
        </div>

        <p className="text-sm text-primary-foreground/70">
          Central University of Kashmir · Ganderbal, J&amp;K
        </p>
      </div>

      {/* Form panel */}
      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>

        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
            <GraduationCap className="size-6 text-primary" />
            <span className="text-lg font-semibold tracking-tight">CUK Acadex</span>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isSignUp
                ? 'Fill in your details to get started.'
                : 'Sign in to continue to your dashboard.'}
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AuthTab)}>
            <TabsList className="grid w-full grid-cols-2">
              {AUTH_TABS.map((tab) => (
                <TabsTrigger key={tab} value={tab}>{tab}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <form
            onSubmit={(e) => { void handleSubmit(e); }}
            className="mt-6 space-y-4"
          >
            {!isSignUp ? (
              <SignInForm
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                loading={loading}
                onForgotPassword={() => setShowForgotPassword(true)}
              />
            ) : (
              <SignUpForm
                fullName={fullName}
                setFullName={setFullName}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                showConfirmPassword={showConfirmPassword}
                setShowConfirmPassword={setShowConfirmPassword}
                userType={userType}
                setUserType={setUserType}
                deptId={deptId}
                setDeptId={setDeptId}
                enrollmentNo={enrollmentNo}
                setEnrollmentNo={setEnrollmentNo}
                departments={departments}
                loadingDepartments={loadingDepartments}
                loading={loading}
              />
            )}
          </form>

          <LegalLinks className="mt-8 justify-center" />
        </motion.div>
      </div>

      {/* Forgot Password */}
      <Dialog open={showForgotPassword} onOpenChange={(o) => { setShowForgotPassword(o); if (!o) setResetEmail(''); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>We'll email you a link to reset your password.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { void handleForgotPassword(e); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="text-sm font-medium">Email address</Label>
              <Input
                id="reset-email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="your.email@cukashmir.ac.in"
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowForgotPassword(false); setResetEmail(''); }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ─── Sign In Form ─── */
interface SignInFormProps {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  loading: boolean;
  onForgotPassword: () => void;
}

const SignInForm: React.FC<SignInFormProps> = ({
  email, setEmail, password, setPassword,
  showPassword, setShowPassword, loading, onForgotPassword,
}) => (
  <>
    <div className="space-y-1.5">
      <Label htmlFor="signin-email" className="text-xs font-medium text-foreground/80">Email</Label>
      <Input
        id="signin-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        placeholder="your.email@cukashmir.ac.in"
       
      />
    </div>
    <div className="space-y-1.5">
      <Label htmlFor="signin-password" className="text-xs font-medium text-foreground/80">Password</Label>
      <div className="relative">
        <Input
          id="signin-password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Enter your password"
          className="pr-10"
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
    <div className="flex justify-end">
      <button
        type="button"
        onClick={onForgotPassword}
        className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
      >
        Forgot Password?
      </button>
    </div>
    <Button
      type="submit"
      className="w-full h-10 text-sm font-medium mt-2 shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98]"
      disabled={loading}
    >
      {loading ? "Signing In..." : "Sign In"}
    </Button>
  </>
);

/* ─── Sign Up Form ─── */
interface SignUpFormProps {
  fullName: string;
  setFullName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (v: boolean) => void;
  userType: 'student' | 'department_admin' | 'admin' | 'teacher';
  setUserType: (v: 'student' | 'department_admin' | 'admin' | 'teacher') => void;
  deptId: string;
  setDeptId: (v: string) => void;
  enrollmentNo: string;
  setEnrollmentNo: (v: string) => void;
  departments: Department[];
  loadingDepartments: boolean;
  loading: boolean;
}

const glassInputClass = "";

const SignUpForm: React.FC<SignUpFormProps> = ({
  fullName, setFullName, email, setEmail,
  password, setPassword, confirmPassword, setConfirmPassword,
  showPassword, setShowPassword, showConfirmPassword, setShowConfirmPassword,
  userType, setUserType, deptId, setDeptId,
  enrollmentNo, setEnrollmentNo, departments, loadingDepartments, loading,
}) => (
  <>
    <div className="space-y-1.5">
      <Label htmlFor="signup-name" className="text-xs font-medium text-foreground/80">Full Name</Label>
      <Input id="signup-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Enter your full name" className={glassInputClass} />
    </div>

    <div className="space-y-1.5">
      <Label htmlFor="signup-email" className="text-xs font-medium text-foreground/80">Email</Label>
      <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="your.email@cukashmir.ac.in" className={glassInputClass} />
    </div>

    <div className="space-y-1.5">
      <Label htmlFor="user-type" className="text-xs font-medium text-foreground/80">Account Type</Label>
      <Select value={userType} onValueChange={(value: 'student' | 'department_admin' | 'admin' | 'teacher') => setUserType(value)}>
        <SelectTrigger className={glassInputClass}>
          <SelectValue placeholder="Select account type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="student">Student</SelectItem>
          <SelectItem value="teacher">Teacher</SelectItem>
          <SelectItem value="department_admin">Department Admin</SelectItem>
          {/* No "Administrator": super admins are created only by an existing admin.
              The DB also rejects user_type='admin' from signup (security_hardening migration). */}
        </SelectContent>
      </Select>
    </div>

    <AnimatePresence mode="wait">
      {userType === 'student' && (
        <motion.div
          key="enrollment"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="space-y-1.5 pt-1">
            <Label htmlFor="enrollment-no" className="text-xs font-medium text-foreground/80">Enrollment Number</Label>
            <Input id="enrollment-no" type="text" value={enrollmentNo} onChange={(e) => setEnrollmentNo(e.target.value)} required placeholder="Enter enrollment number" className={glassInputClass} />
          </div>
        </motion.div>
      )}

      {(userType === 'department_admin' || userType === 'admin' || userType === 'teacher') && (
        <motion.div
          key="department"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="space-y-1.5 pt-1">
            <Label htmlFor="department" className="text-xs font-medium text-foreground/80">Department</Label>
            <Select value={deptId} onValueChange={setDeptId} disabled={loadingDepartments}>
              <SelectTrigger className={glassInputClass}>
                <SelectValue placeholder={loadingDepartments ? "Loading..." : "Select department"} />
              </SelectTrigger>
              <SelectContent className="bg-background">
                {loadingDepartments ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : departments.length === 0 ? (
                  <SelectItem value="none" disabled>No departments available</SelectItem>
                ) : (
                  departments.map((dept) => (
                    <SelectItem key={dept.dept_id} value={dept.dept_id}>{dept.dept_name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    <div className="space-y-1.5">
      <Label htmlFor="signup-password" className="text-xs font-medium text-foreground/80">Password</Label>
      <div className="relative">
        <Input id="signup-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Min 8 characters" className={`${glassInputClass} pr-10`} />
        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowPassword(!showPassword)}>
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <PasswordStrengthChecker password={password} />
    </div>

    <div className="space-y-1.5">
      <Label htmlFor="confirm-password" className="text-xs font-medium text-foreground/80">Confirm Password</Label>
      <div className="relative">
        <Input id="confirm-password" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="Confirm your password" className={`${glassInputClass} pr-10`} />
        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>

    <Button
      type="submit"
      className="w-full h-10 text-sm font-medium mt-1 shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98]"
      disabled={loading}
    >
      {loading ? "Creating Account..." : "Create Account"}
    </Button>
    <p className="text-center text-xs text-muted-foreground">
      By creating an account you agree to the{' '}
      <Link to="/terms-and-conditions" className="underline underline-offset-4 hover:text-foreground">Terms</Link>
      {' '}and{' '}
      <Link to="/privacy-policy" className="underline underline-offset-4 hover:text-foreground">Privacy policy</Link>.
    </p>
  </>
);

export default Auth;
