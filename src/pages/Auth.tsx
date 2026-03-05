import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff } from 'lucide-react';
import Squares from '@/components/Squares';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from "@/components/ThemeToggle";
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { PasswordStrengthChecker } from '@/components/PasswordStrengthChecker';
import { useTheme } from '@/components/ThemeProvider';

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
  const { theme } = useTheme();

  const isLightMode = theme === 'light' || (theme === 'system' && !window.matchMedia('(prefers-color-scheme: dark)').matches);
  const isSignUp = activeTab === 'Sign Up';

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    if (user && profile) {
      switch (profile.user_type) {
        case 'admin':
        case 'department_admin':
          navigate('/admin-dashboard');
          break;
        case 'teacher':
          navigate('/teacher-dashboard');
          break;
        default:
          navigate('/');
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
        console.error('Error loading departments:', error);
        toast({
          title: "Warning",
          description: "Could not load departments. Please try refreshing the page.",
          variant: "destructive",
        });
        setDepartments([]);
      } else {
        setDepartments(data || []);
      }
    } catch (error) {
      console.error('Exception loading departments:', error);
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
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: "Success", description: "Password reset link sent! Please check your email." });
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to send reset link", variant: "destructive" });
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
            description: `Your ${userType === 'teacher' ? 'teacher' : 'department admin'} account has been created but requires approval from an administrator.`,
            duration: 10000,
          });
        }
      } else {
        await signIn(email, password);
      }
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 40 : -40,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 40 : -40,
      opacity: 0,
    }),
  };

  const direction = isSignUp ? 1 : -1;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <div className="fixed inset-0 z-0">
        <Squares
          speed={0.5}
          squareSize={40}
          direction='diagonal'
          borderColor={isLightMode ? 'rgb(200,200,210)' : 'rgb(39,30,55)'}
          hoverFillColor={isLightMode ? 'rgb(59,130,246)' : 'rgb(34,34,34)'}
          vignetteColor={isLightMode ? '#ffffff' : '#060010'}
        />
      </div>

      <div className="relative z-10 w-full max-w-md px-4 py-8">
        <div className="flex justify-end mb-6">
          <ThemeToggle />
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <motion.img
            src="/favicon.ico"
            alt="CUK Logo"
            className="w-14 h-14 mx-auto mb-3"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
          <motion.h1
            className="text-2xl font-semibold tracking-tight text-foreground"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            CUK Exam System
          </motion.h1>
          <motion.p
            className="text-sm text-muted-foreground mt-1"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Central University of Kashmir
          </motion.p>
        </div>

        {/* Auth Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          <Card className="border-border/40 shadow-xl shadow-black/5 dark:shadow-black/20 backdrop-blur-xl bg-background/90">
            <CardContent className="pt-6 pb-8 px-6">
              {/* Pill Tab Switcher */}
              <div className="relative flex rounded-full bg-muted/60 p-1 mb-8">
                {AUTH_TABS.map((tab, index) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative z-10 flex-1 py-2.5 text-sm font-medium rounded-full transition-colors duration-300 ${
                      activeTab === tab
                        ? 'text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
                {/* Sliding pill background */}
                <motion.div
                  className="absolute top-1 bottom-1 rounded-full bg-primary"
                  style={{ width: 'calc(50% - 4px)' }}
                  animate={{
                    left: activeTab === 'Sign In' ? '4px' : 'calc(50% + 0px)',
                  }}
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              </div>

              {/* Animated Form Area */}
              <div className="relative overflow-hidden">
                <AnimatePresence mode="wait" custom={direction}>
                  {!isSignUp ? (
                    <motion.form
                      key="signin"
                      custom={direction}
                      variants={formVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      onSubmit={handleSubmit}
                      className="space-y-5"
                    >
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
                    </motion.form>
                  ) : (
                    <motion.form
                      key="signup"
                      custom={direction}
                      variants={formVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      onSubmit={handleSubmit}
                      className="space-y-5"
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
                        loading={loading}
                      />
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotPassword && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="w-full max-w-md border-border/40 shadow-2xl backdrop-blur-xl bg-background/95">
                <CardContent className="pt-6 pb-8 px-6">
                  <h2 className="text-lg font-semibold text-foreground mb-1">Reset Password</h2>
                  <p className="text-sm text-muted-foreground mb-6">We'll send you a link to reset your password.</p>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email" className="text-sm font-medium">Email Address</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="your.email@cukashmir.ac.in"
                        required
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => { setShowForgotPassword(false); setResetEmail(''); }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="flex-1" disabled={loading}>
                        {loading ? "Sending..." : "Send Reset Link"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
    <div className="space-y-2">
      <Label htmlFor="signin-email" className="text-sm font-medium">Email</Label>
      <Input
        id="signin-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        placeholder="your.email@cukashmir.ac.in"
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="signin-password" className="text-sm font-medium">Password</Label>
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
      className="w-full h-11 text-sm font-medium transition-all duration-200 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
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

const SignUpForm: React.FC<SignUpFormProps> = ({
  fullName, setFullName, email, setEmail,
  password, setPassword, confirmPassword, setConfirmPassword,
  showPassword, setShowPassword, showConfirmPassword, setShowConfirmPassword,
  userType, setUserType, deptId, setDeptId,
  enrollmentNo, setEnrollmentNo, departments, loadingDepartments, loading,
}) => (
  <>
    <div className="space-y-2">
      <Label htmlFor="signup-name" className="text-sm font-medium">Full Name</Label>
      <Input
        id="signup-name"
        type="text"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
        placeholder="Enter your full name"
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
      <Input
        id="signup-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        placeholder="your.email@cukashmir.ac.in"
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="user-type" className="text-sm font-medium">Account Type</Label>
      <Select value={userType} onValueChange={(value: any) => setUserType(value)}>
        <SelectTrigger>
          <SelectValue placeholder="Select account type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="student">Student</SelectItem>
          <SelectItem value="teacher">Teacher</SelectItem>
          <SelectItem value="department_admin">Department Admin</SelectItem>
          <SelectItem value="admin">Administrator</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {userType === 'student' && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-2 overflow-hidden"
      >
        <Label htmlFor="enrollment-no" className="text-sm font-medium">Enrollment Number</Label>
        <Input
          id="enrollment-no"
          type="text"
          value={enrollmentNo}
          onChange={(e) => setEnrollmentNo(e.target.value)}
          required
          placeholder="Enter your enrollment number"
        />
      </motion.div>
    )}

    {(userType === 'department_admin' || userType === 'admin' || userType === 'teacher') && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-2 overflow-hidden"
      >
        <Label htmlFor="department" className="text-sm font-medium">Department</Label>
        <Select value={deptId} onValueChange={setDeptId} disabled={loadingDepartments}>
          <SelectTrigger>
            <SelectValue placeholder={loadingDepartments ? "Loading departments..." : "Select your department"} />
          </SelectTrigger>
          <SelectContent className="bg-background">
            {loadingDepartments ? (
              <SelectItem value="loading" disabled>Loading...</SelectItem>
            ) : departments.length === 0 ? (
              <SelectItem value="none" disabled>No departments available</SelectItem>
            ) : (
              departments.map((dept) => (
                <SelectItem key={dept.dept_id} value={dept.dept_id}>
                  {dept.dept_name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </motion.div>
    )}

    <div className="space-y-2">
      <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
      <div className="relative">
        <Input
          id="signup-password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Min 8 characters"
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
      <PasswordStrengthChecker password={password} />
    </div>

    <div className="space-y-2">
      <Label htmlFor="confirm-password" className="text-sm font-medium">Confirm Password</Label>
      <div className="relative">
        <Input
          id="confirm-password"
          type={showConfirmPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          placeholder="Confirm your password"
          className="pr-10"
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
        >
          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>

    <Button
      type="submit"
      className="w-full h-11 text-sm font-medium transition-all duration-200 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
      disabled={loading}
    >
      {loading ? "Creating Account..." : "Create Account"}
    </Button>
  </>
);

export default Auth;
