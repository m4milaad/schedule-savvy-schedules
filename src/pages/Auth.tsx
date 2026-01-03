import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, Users, Shield, Eye, EyeOff } from 'lucide-react';
import Squares from '@/components/Squares';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from "@/components/ThemeToggle";
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { PasswordStrengthChecker } from '@/components/PasswordStrengthChecker';

interface Department {
  dept_id: string;
  dept_name: string;
}

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
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

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    if (user && profile) {
      // Redirect based on user type
      switch (profile.user_type) {
        case 'admin':
          navigate('/admin-dashboard');
          break;
        case 'department_admin':
          navigate('/admin-dashboard');
          break;
        case 'teacher':
          navigate('/teacher-dashboard');
          break;
        case 'student':
          navigate('/');
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
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password reset link sent! Please check your email.",
      });
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset link",
        variant: "destructive",
      });
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
        // Sign up validation
        if (password !== confirmPassword) {
          toast({
            title: "Error",
            description: "Passwords do not match",
            variant: "destructive",
          });
          return;
        }

        if (password.length < 8) {
          toast({
            title: "Error",
            description: "Password must be at least 8 characters long",
            variant: "destructive",
          });
          return;
        }

        // Check password complexity
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

        if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
          toast({
            title: "Error",
            description: "Password must contain uppercase, lowercase, number, and special character",
            variant: "destructive",
          });
          return;
        }

        if (!fullName.trim()) {
          toast({
            title: "Error",
            description: "Full name is required",
            variant: "destructive",
          });
          return;
        }

        if (userType === 'student' && !enrollmentNo.trim()) {
          toast({
            title: "Error",
            description: "Enrollment number is required for students",
            variant: "destructive",
          });
          return;
        }

        if (userType === 'department_admin' && !deptId) {
          toast({
            title: "Error",
            description: "Department selection is required for department admins",
            variant: "destructive",
          });
          return;
        }

        if (userType === 'teacher' && !deptId) {
          toast({
            title: "Error",
            description: "Department selection is required for teachers",
            variant: "destructive",
          });
          return;
        }

        if (userType === 'admin' && !deptId) {
          toast({
            title: "Error",
            description: "Department selection is required for administrators",
            variant: "destructive",
          });
          return;
        }

        const userData = {
          full_name: fullName.trim(),
          user_type: userType,
          ...((userType === 'department_admin' || userType === 'teacher') && { dept_id: deptId }),
          ...(userType === 'student' && { student_enrollment_no: enrollmentNo.trim() }),
        };

        await signUp(email, password, userData);
        
        // Show special message for department admins and teachers
        if (userType === 'department_admin' || userType === 'teacher') {
          toast({
            title: "Account Created - Pending Approval",
            description: `Your ${userType === 'teacher' ? 'teacher' : 'department admin'} account has been created but requires approval from an administrator before you can log in.`,
            duration: 10000,
          });
        }
      } else {
        // Sign in
        await signIn(email, password);
      }
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <div className="fixed inset-0 z-0">
        <Squares
          speed={0.5}
          squareSize={40}
          direction='diagonal'
          borderColor='rgb(39,30,55)'
          hoverFillColor='rgb(34,34,34)'
        />
      </div>

      <div className="relative z-10 w-full max-w-md p-4">
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>

        <div className="text-center mb-8 animate-fade-in">
          <div className="mb-4 animate-scale-in">
            <img
              src="/favicon.ico"
              alt="CUK Logo"
              className="w-16 h-16 mx-auto mb-4 transition-transform duration-300 hover:scale-110"
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground transition-colors duration-300">
            CUK Exam System
          </h1>
          <p className="text-muted-foreground transition-colors duration-300">
            Central University of Kashmir
          </p>
        </div>

        <Tabs value={isSignUp ? "signup" : "signin"} onValueChange={(value) => setIsSignUp(value === "signup")} className="animate-fade-in">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <Card className="animate-scale-in shadow-sm backdrop-blur-sm bg-background/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-gray-100 transition-colors duration-300">
                  <Shield className="w-5 h-5" />
                  Sign In
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="dark:text-gray-300 transition-colors duration-300">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="your.email@cukashmir.ac.in"
                      className="transition-all duration-300 hover:border-blue-400 focus:scale-[1.02]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="dark:text-gray-300 transition-colors duration-300">Password</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Enter your password"
                        className="transition-all duration-300 hover:border-blue-400 focus:scale-[1.02] pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="text-right">
                    <Button
                      type="button"
                      variant="link"
                      className="text-sm px-0 h-auto"
                      onClick={() => setShowForgotPassword(true)}
                    >
                      Forgot Password?
                    </Button>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing In..." : "Sign In"}
                  </Button>
                  
                  {/* Test Credentials Section */}
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Test Credentials:</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Teacher:</span>
                        <span className="font-mono text-foreground">teacher@test.com / Teacher@123</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full mt-2 text-xs h-7"
                      onClick={() => {
                        setEmail('teacher@test.com');
                        setPassword('Teacher@123');
                      }}
                    >
                      Use Teacher Credentials
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card className="animate-scale-in shadow-sm backdrop-blur-sm bg-background/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-gray-100 transition-colors duration-300">
                  <Users className="w-5 h-5" />
                  Create Account
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="dark:text-gray-300 transition-colors duration-300">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="Enter your full name"
                      className="transition-all duration-300 hover:border-blue-400 focus:scale-[1.02]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="dark:text-gray-300 transition-colors duration-300">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="your.email@cukashmir.ac.in"
                      className="transition-all duration-300 hover:border-blue-400 focus:scale-[1.02]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="user-type" className="dark:text-gray-300 transition-colors duration-300">Account Type</Label>
                    <Select value={userType} onValueChange={(value: 'student' | 'department_admin' | 'admin' | 'teacher') => setUserType(value)}>
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
                    <div className="space-y-2">
                      <Label htmlFor="enrollment-no" className="dark:text-gray-300 transition-colors duration-300">Enrollment Number</Label>
                      <Input
                        id="enrollment-no"
                        type="text"
                        value={enrollmentNo}
                        onChange={(e) => setEnrollmentNo(e.target.value)}
                        required
                        placeholder="Enter your enrollment number"
                        className="transition-all duration-300 hover:border-blue-400 focus:scale-[1.02]"
                      />
                    </div>
                  )}

                  {(userType === 'department_admin' || userType === 'admin' || userType === 'teacher') && (
                    <div className="space-y-2">
                      <Label htmlFor="department" className="dark:text-gray-300 transition-colors duration-300">Department</Label>
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
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="dark:text-gray-300 transition-colors duration-300">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Create a password (min 8 characters)"
                        className="transition-all duration-300 hover:border-blue-400 focus:scale-[1.02] pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    <PasswordStrengthChecker password={password} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="dark:text-gray-300 transition-colors duration-300">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="Confirm your password"
                        className="transition-all duration-300 hover:border-blue-400 focus:scale-[1.02] pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      {/* Forgot Password Dialog */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <Card className="w-full max-w-md animate-scale-in">
            <CardHeader>
              <CardTitle>Reset Password</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email Address</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    We'll send you a link to reset your password
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmail('');
                    }}
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
        </div>
      )}
    </div>
  );
};

export default Auth;