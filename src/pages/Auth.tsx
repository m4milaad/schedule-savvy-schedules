import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, Users, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

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
  const [userType, setUserType] = useState<'student' | 'department_admin'>('student');
  const [deptId, setDeptId] = useState('');
  const [enrollmentNo, setEnrollmentNo] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  
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
        case 'student':
          navigate('/');
          break;
        default:
          navigate('/');
      }
    }
  }, [user, profile, navigate]);

  const loadDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('dept_id, dept_name')
        .order('dept_name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error loading departments:', error);
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

        if (password.length < 6) {
          toast({
            title: "Error",
            description: "Password must be at least 6 characters long",
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

        const userData = {
          full_name: fullName.trim(),
          user_type: userType,
          ...(userType === 'department_admin' && { dept_id: deptId }),
          ...(userType === 'student' && { student_enrollment_no: enrollmentNo.trim() }),
        };

        await signUp(email, password, userData);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <GraduationCap className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">CUK Exam System</h1>
          <p className="text-gray-600">Central University of Kashmir</p>
        </div>

        <Tabs value={isSignUp ? "signup" : "signin"} onValueChange={(value) => setIsSignUp(value === "signup")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Sign In
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
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
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter your password"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing In..." : "Sign In"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Create Account
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
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
                    <Label htmlFor="signup-email">Email</Label>
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
                    <Label htmlFor="user-type">Account Type</Label>
                    <Select value={userType} onValueChange={(value: 'student' | 'department_admin') => setUserType(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="department_admin">Department Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {userType === 'student' && (
                    <div className="space-y-2">
                      <Label htmlFor="enrollment-no">Enrollment Number</Label>
                      <Input
                        id="enrollment-no"
                        type="text"
                        value={enrollmentNo}
                        onChange={(e) => setEnrollmentNo(e.target.value)}
                        required
                        placeholder="Enter your enrollment number"
                      />
                    </div>
                  )}

                  {userType === 'department_admin' && (
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Select value={deptId} onValueChange={setDeptId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.dept_id} value={dept.dept_id}>
                              {dept.dept_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Create a password (min 6 characters)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Confirm your password"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="text-center mt-6 text-sm text-gray-600">
          <p>
            Admin login? <Link to="/admin-login" className="text-blue-600 hover:underline">Click here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;