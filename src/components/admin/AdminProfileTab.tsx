import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Check, Eye, EyeOff } from 'lucide-react';
import { BACKGROUND_PRESETS, customBackground, isHexColor } from '@/lib/adminBackground';
import { cn } from '@/lib/utils';
import { PasswordStrengthChecker } from '@/components/PasswordStrengthChecker';
import logger from '@/lib/logger';

interface Department {
  dept_id: string;
  dept_name: string;
}

const PasswordInput = ({ id, label, value, onChange }: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
          autoComplete={id === "currentPassword" ? "current-password" : "new-password"}
          required
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:bg-transparent"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};

/** A settings row: what the section is on the left, its controls on the right. */
const Section = ({ title, description, children }: { title: string; description: string; children: React.ReactNode }) => (
  <section className="grid gap-4 px-5 py-6 md:grid-cols-[minmax(0,280px)_minmax(0,1fr)] md:gap-10">
    <div>
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
    <div className="max-w-md">{children}</div>
  </section>
);

const isPasswordStrong = (password: string) =>
  password.length >= 8 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /[0-9]/.test(password) &&
  /[^A-Za-z0-9]/.test(password);

export const AdminProfileTab: React.FC<{ onBackgroundChange?: (color: string | null) => void }> = ({ onBackgroundChange }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [formData, setFormData] = useState({ full_name: '', email: '', dept_id: '', contact_no: '' });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [background, setBackground] = useState<string | null>(null);
  const [customHex, setCustomHex] = useState('');
  const [savingBackground, setSavingBackground] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    void loadProfile();
    void loadDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDepartments = async () => {
    try {
      const { data, error } = await supabase.from('departments').select('*').order('dept_name');
      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      logger.error('Error loading departments:', error);
    }
  };

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      const p = profileData as Record<string, unknown>;
      setProfile(p);
      setFormData({
        full_name: (p.full_name as string) || '',
        email: (p.email as string) || user.email || '',
        dept_id: (p.dept_id as string) || '',
        contact_no: (p.contact_no as string) || '',
      });
      setBackground(customBackground(p.theme_color));
    } catch (error: unknown) {
      logger.error('Error loading profile:', error);
      toast({ title: "Error", description: "Failed to load profile", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          email: formData.email,
          contact_no: formData.contact_no || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;
      toast({ title: "Saved", description: "Profile updated" });
    } catch (error: unknown) {
      logger.error('Error updating profile:', error);
      toast({ title: "Error", description: (error as Error).message || "Failed to update profile", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Saves on pick, like a setting toggle. null = the default background.
  const saveBackground = async (color: string | null) => {
    if (color !== null && !isHexColor(color)) {
      toast({ title: "Error", description: "Use a hex colour like #1e293b", variant: "destructive" });
      return;
    }
    const previous = background;
    setBackground(color);
    onBackgroundChange?.(color);
    setSavingBackground(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase
        .from('profiles')
        .update({ theme_color: color, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      if (error) throw error;
    } catch (error: unknown) {
      logger.error('Error saving background:', error);
      setBackground(previous);
      onBackgroundChange?.(previous);
      toast({ title: "Error", description: "Couldn't save the background", variant: "destructive" });
    } finally {
      setSavingBackground(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fail = (description: string) => toast({ title: "Error", description, variant: "destructive" });

    if (!currentPassword) return fail("Please enter your current password");
    if (!isPasswordStrong(newPassword)) return fail("New password does not meet the strength requirements");
    if (newPassword !== confirmPassword) return fail("New passwords do not match");
    if (currentPassword === newPassword) return fail("New password must be different from current password");

    setPasswordLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('User not found');

      // Verify the current password before changing it.
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (signInError) return fail("Current password is incorrect");

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      toast({ title: "Saved", description: "Password updated" });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      logger.error('Error updating password:', error);
      fail((error as Error).message || "Failed to update password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const deptName = formData.dept_id
    ? departments.find((d) => d.dept_id === formData.dept_id)?.dept_name ?? 'Not assigned'
    : null;

  if (loading) {
    return (
      <div className="rounded-lg border bg-card" aria-busy="true">
        {[3, 1, 2, 3].map((fields, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Separator />}
            <div className="grid gap-4 px-5 py-6 md:grid-cols-[280px_1fr] md:gap-10">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3.5 w-48" />
              </div>
              <div className="flex max-w-md flex-col gap-5">
                {Array.from({ length: fields }, (_, f) => (
                  <div key={f} className="flex flex-col gap-2">
                    <Skeleton className="h-3.5 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      {profile && !profile.is_approved && (
        <p className="border-b bg-amber-50 px-5 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Your account is waiting for approval by a super administrator.
        </p>
      )}

      <Section title="Profile" description="Your name and contact details, shown in the audit log and to other administrators.">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="contact_no">Contact number <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input id="contact_no" type="tel" value={formData.contact_no} onChange={(e) => setFormData({ ...formData, contact_no: e.target.value })} />
          </div>
          <Button type="submit" size="sm" className="w-fit" disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </Section>

      <Separator />

      <Section title="Role" description="Set by a super administrator.">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Role</dt>
          <dd>{formData.dept_id ? "Department admin" : "Super admin"}</dd>
          <dt className="text-muted-foreground">Department</dt>
          <dd>{deptName ?? "All departments"}</dd>
        </dl>
      </Section>

      <Separator />

      <Section title="Background" description="The colour behind your dashboard. Only you see it.">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Background colour">
            <button
              type="button"
              role="radio"
              aria-checked={background === null}
              disabled={savingBackground}
              onClick={() => void saveBackground(null)}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-md border bg-background px-2.5 text-sm",
                background === null && "ring-2 ring-ring ring-offset-2 ring-offset-card"
              )}
            >
              {background === null && <Check className="h-3.5 w-3.5" />}
              Default
            </button>
            {BACKGROUND_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                role="radio"
                aria-checked={background === color}
                aria-label={color}
                title={color}
                disabled={savingBackground}
                onClick={() => void saveBackground(color)}
                className={cn(
                  "h-8 w-8 rounded-md border",
                  background === color && "ring-2 ring-ring ring-offset-2 ring-offset-card"
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void saveBackground(customHex.trim());
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="custom-bg">Custom colour</Label>
              <Input
                id="custom-bg"
                value={customHex}
                onChange={(e) => setCustomHex(e.target.value)}
                placeholder={background ?? "#1e293b"}
                maxLength={7}
                className="w-32 font-mono"
              />
            </div>
            <Button type="submit" variant="outline" size="sm" className="h-10" disabled={savingBackground || !isHexColor(customHex.trim())}>
              Apply
            </Button>
          </form>
        </div>
      </Section>

      <Separator />

      <Section title="Password" description="You'll need your current password to set a new one.">
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
          <PasswordInput id="currentPassword" label="Current password" value={currentPassword} onChange={setCurrentPassword} />
          <div className="flex flex-col gap-2">
            <PasswordInput id="newPassword" label="New password" value={newPassword} onChange={setNewPassword} />
            {newPassword && <PasswordStrengthChecker password={newPassword} />}
          </div>
          <div className="flex flex-col gap-2">
            <PasswordInput id="confirmPassword" label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-destructive">Passwords don't match</p>
            )}
          </div>
          <Button
            type="submit"
            size="sm"
            className="w-fit"
            disabled={passwordLoading || !isPasswordStrong(newPassword) || newPassword !== confirmPassword}
          >
            {passwordLoading ? "Updating…" : "Update password"}
          </Button>
        </form>
      </Section>
    </div>
  );
};
