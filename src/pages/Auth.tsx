import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { LegalLinks } from "@/components/LegalLinks";
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PasswordStrengthChecker } from '@/components/PasswordStrengthChecker';
import logger from '@/lib/logger';
import { cn } from '@/lib/utils';
import { getAppBaseUrl } from '@/lib/appUrl';


interface Department {
  dept_id: string;
  dept_name: string;
}

type AuthTab = 'Sign In' | 'Sign Up';

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

  const submit = (e: React.FormEvent) => { void handleSubmit(e); };

  return (
    <div className={cn('auth-slider', isSignUp && 'is-signup')}>
      {/* Brand panel: sweeps across to reveal the other form */}
      <aside className="auth-brand bg-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-full w-px bg-white/10" />
          <div className="absolute left-0 top-1/2 h-px w-full bg-white/10" />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top right, transparent calc(50% - 0.5px), rgb(255 255 255 / 0.08) 50%, transparent calc(50% + 0.5px))' }}
          />
        </div>
        <img
          src={`${import.meta.env.BASE_URL}CUKLogo.ico`}
          alt="Central University of Kashmir"
          className="absolute left-1/2 top-1/2 size-36 -translate-x-1/2 -translate-y-1/2 object-contain"
        />
        <div className="relative flex h-full flex-col justify-between p-10">
          <span className="text-xl font-semibold tracking-tight">
            CUK Acadex<sup className="ml-0.5 text-[10px] font-normal text-white/60">®</sup>
          </span>
          <div className="flex flex-col gap-8">
            {/* The only switch on desktop; re-keyed so the new prompt fades in as the panel lands. */}
            <div key={activeTab} className="flex items-center justify-between gap-6 animate-in fade-in duration-700">
              <p className="text-sm text-white/60">
                {isSignUp ? 'Already have an account?' : 'New to CUK Acadex?'}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab(isSignUp ? 'Sign In' : 'Sign Up')}
                className="rounded-full border border-white/30 px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-white transition-colors hover:bg-white hover:text-black"
              >
                {isSignUp ? 'Sign in' : 'Create an account'}
              </button>
            </div>
            <p className="text-[11px] text-white/40">
              © Central University of Kashmir {new Date().getFullYear()}. All rights reserved.
            </p>
          </div>
        </div>
      </aside>

      <div className="auth-pane auth-pane-signin">
        <AuthCard
          title="Login"
          switchLabel="Create an account"
          onSwitch={() => setActiveTab('Sign Up')}
          onSubmit={submit}
          submitLabel="Sign in"
          loading={loading}
          inert={isSignUp}
        >
          <SignInForm
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            onForgotPassword={() => setShowForgotPassword(true)}
          />
        </AuthCard>
      </div>

      <div className="auth-pane auth-pane-signup">
        <AuthCard
          title="Sign up"
          switchLabel="I have an account"
          onSwitch={() => setActiveTab('Sign In')}
          onSubmit={submit}
          submitLabel="Create"
          loading={loading}
          inert={!isSignUp}
        >
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
          />
        </AuthCard>
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

/* ─── Shared pieces ─── */
const fieldInput =
  'w-full border-0 border-b border-white/20 bg-transparent px-0 py-2 text-base text-white placeholder:text-white/25 outline-none transition-colors focus:border-white';
const fieldLabel = 'block text-[11px] font-medium text-white/60';

interface AuthCardProps {
  title: string;
  switchLabel: string;
  onSwitch: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  loading: boolean;
  /** The hidden form must not take focus or clicks while the other one is shown. */
  inert: boolean;
  children: React.ReactNode;
}

const AuthCard: React.FC<AuthCardProps> = ({ title, switchLabel, onSwitch, onSubmit, submitLabel, loading, inert, children }) => (
  <div className="flex h-full min-h-screen bg-black p-3 lg:p-4" {...(inert ? { inert: '' } : {})} aria-hidden={inert}>
    <form onSubmit={onSubmit} className="relative flex w-full flex-col rounded-[28px] bg-[#141414] px-8 pt-8 sm:px-12">
      {/* Phones only: the brand panel (and its switch) is hidden below lg. */}
      <div className="flex items-center justify-between lg:hidden">
        <span className="text-sm font-semibold tracking-tight">CUK Acadex</span>
        <button type="button" onClick={onSwitch} className="text-xs text-white/70 transition-colors hover:text-white">
          {switchLabel}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-36">
        <div className="mx-auto my-auto w-full max-w-lg py-10">
          <h1 className="mb-10 text-5xl font-light tracking-tight sm:text-6xl">{title}</h1>
          {children}
        </div>
      </div>

      <LegalLinks className="absolute bottom-9 left-8 text-white/40 sm:left-12 [&_a:hover]:text-white" />
      <button
        type="submit"
        disabled={loading}
        className="absolute bottom-6 right-6 flex size-20 items-center justify-center rounded-full bg-white text-[11px] font-semibold uppercase tracking-wider text-black transition-transform hover:scale-105 active:scale-95 disabled:opacity-60 sm:bottom-8 sm:right-8 sm:size-24"
      >
        {loading ? '…' : submitLabel}
      </button>
    </form>
  </div>
);

/* ─── Sign In Form ─── */
interface SignInFormProps {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  onForgotPassword: () => void;
}

const SignInForm: React.FC<SignInFormProps> = ({
  email, setEmail, password, setPassword,
  showPassword, setShowPassword, onForgotPassword,
}) => (
  <div className="grid gap-8 sm:grid-cols-2">
    <div>
      <label htmlFor="signin-email" className={fieldLabel}>Email</label>
      <input
        id="signin-email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        placeholder="you@cukashmir.ac.in"
        className={fieldInput}
      />
    </div>
    <div>
      <label htmlFor="signin-password" className={fieldLabel}>Password</label>
      <PasswordField id="signin-password" value={password} onChange={setPassword} show={showPassword} setShow={setShowPassword} autoComplete="current-password" />
      <button type="button" onClick={onForgotPassword} className="mt-3 text-[11px] text-white/50 transition-colors hover:text-white">
        Forgot?
      </button>
    </div>
  </div>
);

const PasswordField = ({ id, value, onChange, show, setShow, placeholder = '••••••••', autoComplete }: {
  id: string; value: string; onChange: (v: string) => void; show: boolean; setShow: (v: boolean) => void; placeholder?: string; autoComplete?: string;
}) => (
  <div className="relative">
    <input
      id={id}
      type={show ? 'text' : 'password'}
      autoComplete={autoComplete}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
      placeholder={placeholder}
      className={cn(fieldInput, 'pr-8')}
    />
    <button
      type="button"
      aria-label={show ? 'Hide password' : 'Show password'}
      className="absolute right-0 top-1/2 -translate-y-1/2 text-white/50 transition-colors hover:text-white"
      onClick={() => setShow(!show)}
    >
      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  </div>
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
}

const darkSelect = 'h-auto rounded-none border-0 border-b border-white/20 bg-transparent dark:bg-transparent backdrop-blur-none px-0 py-2 text-base text-white shadow-none focus:ring-0 focus:ring-offset-0 data-[placeholder]:text-white/25';

const SignUpForm: React.FC<SignUpFormProps> = ({
  fullName, setFullName, email, setEmail,
  password, setPassword, confirmPassword, setConfirmPassword,
  showPassword, setShowPassword, showConfirmPassword, setShowConfirmPassword,
  userType, setUserType, deptId, setDeptId,
  enrollmentNo, setEnrollmentNo, departments, loadingDepartments,
}) => (
  <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
    <div>
      <label htmlFor="signup-name" className={fieldLabel}>Full name</label>
      <input id="signup-name" type="text" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Your name" className={fieldInput} />
    </div>
    <div>
      <label htmlFor="signup-email" className={fieldLabel}>Email</label>
      <input id="signup-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@cukashmir.ac.in" className={fieldInput} />
    </div>

    <div>
      <label htmlFor="user-type" className={fieldLabel}>Account type</label>
      <Select value={userType} onValueChange={(value: 'student' | 'department_admin' | 'admin' | 'teacher') => setUserType(value)}>
        <SelectTrigger id="user-type" className={darkSelect}>
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

    <AnimatePresence mode="wait" initial={false}>
      {userType === 'student' ? (
        <motion.div key="enrollment" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          <label htmlFor="enrollment-no" className={fieldLabel}>Enrollment number</label>
          <input id="enrollment-no" type="text" value={enrollmentNo} onChange={(e) => setEnrollmentNo(e.target.value)} required placeholder="e.g. 21BCS001" className={fieldInput} />
        </motion.div>
      ) : (
        <motion.div key="department" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          <label htmlFor="department" className={fieldLabel}>Department</label>
          <Select value={deptId} onValueChange={setDeptId} disabled={loadingDepartments}>
            <SelectTrigger id="department" className={darkSelect}>
              <SelectValue placeholder={loadingDepartments ? 'Loading…' : 'Select department'} />
            </SelectTrigger>
            <SelectContent>
              {departments.length === 0 ? (
                <SelectItem value="none" disabled>{loadingDepartments ? 'Loading…' : 'No departments available'}</SelectItem>
              ) : (
                departments.map((dept) => (
                  <SelectItem key={dept.dept_id} value={dept.dept_id}>{dept.dept_name}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </motion.div>
      )}
    </AnimatePresence>

    <div>
      <label htmlFor="signup-password" className={fieldLabel}>Password</label>
      <PasswordField id="signup-password" value={password} onChange={setPassword} show={showPassword} setShow={setShowPassword} placeholder="Min 8 characters" autoComplete="new-password" />
      <div className="mt-3"><PasswordStrengthChecker password={password} /></div>
    </div>
    <div>
      <label htmlFor="confirm-password" className={fieldLabel}>Confirm password</label>
      <PasswordField id="confirm-password" value={confirmPassword} onChange={setConfirmPassword} show={showConfirmPassword} setShow={setShowConfirmPassword} placeholder="Repeat password" autoComplete="new-password" />
    </div>

    <p className="text-[11px] leading-relaxed text-white/40 sm:col-span-2">
      By creating an account you agree to the{' '}
      <Link to="/terms-and-conditions" className="underline underline-offset-4 hover:text-white">Terms</Link>
      {' '}and{' '}
      <Link to="/privacy-policy" className="underline underline-offset-4 hover:text-white">Privacy policy</Link>.
    </p>
  </div>
);

export default Auth;
