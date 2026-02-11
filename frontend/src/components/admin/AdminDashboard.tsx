import React, { useState } from 'react';
import { adminAPI, teamsAPI } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Users,
  Shield,
  UserPlus,
  Building2,
  Loader2,
} from 'lucide-react';

export function AdminDashboard() {
  const [orgName, setOrgName] = useState('');
  const [orgId, setOrgId] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [teamName, setTeamName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    try {
      const response = await adminAPI.createOrg({ name: orgName });
      setOrgId(response.data.id);
      setMessage(`Organization "${orgName}" created successfully`);
      setOrgName('');
    } catch {
      setMessage('Failed to create organization');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) {
      setMessage('Please create or select an organization first');
      return;
    }
    setIsLoading(true);
    setMessage('');
    try {
      const response = await adminAPI.inviteUser(orgId, {
        email: inviteEmail,
        role: inviteRole,
      });
      setMessage(response.data.message);
      setInviteEmail('');
    } catch {
      setMessage('Failed to invite user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) {
      setMessage('Please create or select an organization first');
      return;
    }
    setIsLoading(true);
    setMessage('');
    try {
      await teamsAPI.create(orgId, { name: teamName });
      setMessage(`Team "${teamName}" created successfully`);
      setTeamName('');
    } catch {
      setMessage('Failed to create team');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">Admin Dashboard</h2>

      {message && (
        <div className="p-3 text-sm bg-muted rounded-md">{message}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Organization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Create Organization
            </CardTitle>
            <CardDescription>Set up a new organization</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div className="space-y-2">
                <Label>Organization Name</Label>
                <Input
                  placeholder="Acme Corp"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Organization
              </Button>
            </form>
            {orgId && (
              <p className="mt-2 text-xs text-muted-foreground">
                Org ID: {orgId}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Invite User */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invite User
            </CardTitle>
            <CardDescription>Add a user to your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="user@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="flex gap-2">
                  {['admin', 'manager', 'member', 'auditor'].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setInviteRole(role)}
                      className={`px-3 py-1 text-xs rounded-md border capitalize ${
                        inviteRole === role
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background hover:bg-accent'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
              <Button type="submit" disabled={isLoading || !orgId}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Invite User
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Create Team */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Create Team
            </CardTitle>
            <CardDescription>Create a team within your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div className="space-y-2">
                <Label>Team Name</Label>
                <Input
                  placeholder="Engineering"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={isLoading || !orgId}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Team
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security Policies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Policies
            </CardTitle>
            <CardDescription>Configure security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm">Require MFA</span>
              <span className="text-sm text-muted-foreground">Configurable</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm">Min Password Length</span>
              <span className="text-sm text-muted-foreground">12 characters</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm">Password Rotation</span>
              <span className="text-sm text-muted-foreground">90 days</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm">Session Timeout</span>
              <span className="text-sm text-muted-foreground">15 minutes</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
