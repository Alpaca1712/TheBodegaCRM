'use client'

import { useState, useEffect } from 'react'
import { User, Mail, Key, Bell, Shield, LogOut } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { createClient } from '@/lib/supabase/client'
import { signOut } from '@/lib/auth/actions'

type UserProfile = {
  id: string
  name: string | null
  email: string
  avatar_url: string | null
}

type NotificationPreferences = {
  email_notifications: boolean
  deal_alerts: boolean
  weekly_reports: boolean
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    email_notifications: true,
    deal_alerts: true,
    weekly_reports: false
  })
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  
  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.name || null,
          email: session.user.email || '',
          avatar_url: session.user.user_metadata?.avatar_url || null,
        })
      }
      setLoading(false)
    }
    loadUser()
  }, [])
  
  const handleSaveProfile = () => {
    console.log('Saving profile:', user)
    setEditing(false)
  }
  
  const handleSignOut = async () => {
    try {
      setIsSigningOut(true)
      await signOut()
    } catch (error) {
      console.error('Failed to sign out:', error)
      setIsSigningOut(false)
    }
  }
  
  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Settings</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow p-6 animate-pulse">
              <div className="h-6 w-32 bg-slate-200 rounded mb-6"></div>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-24 bg-slate-200 rounded"></div>
                    <div className="h-10 w-full bg-slate-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-xl shadow p-6 animate-pulse">
              <div className="h-6 w-40 bg-slate-200 rounded mb-6"></div>
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-32 bg-slate-200 rounded"></div>
                    <div className="h-10 w-full bg-slate-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-2">Manage your account preferences and profile</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - Profile and Notifications */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Profile
              </CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={user?.name || ''}
                  onChange={(e) => setUser(user ? { ...user, name: e.target.value } : null)}
                  placeholder="Enter your name"
                  disabled={!editing}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="flex items-center">
                  <Mail className="h-4 w-4 text-slate-500 mr-2" />
                  <Input
                    id="email"
                    value={user?.email || ''}
                    disabled={true} // Email typically can't be changed
                    className="bg-slate-50"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Contact support to change your email address</p>
              </div>
              
              {editing ? (
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSaveProfile}>Save Changes</Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              ) : (
                <Button onClick={() => setEditing(true)}>Edit Profile</Button>
              )}
            </CardContent>
          </Card>
          
          {/* Notifications Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Configure your notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-slate-500">Receive email updates about your account</p>
                </div>
                <Switch
                  checked={notifications.email_notifications}
                  onCheckedChange={(checked) => 
                    setNotifications({...notifications, email_notifications: checked})
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Deal Alerts</Label>
                  <p className="text-sm text-slate-500">Get notified when deals change stages</p>
                </div>
                <Switch
                  checked={notifications.deal_alerts}
                  onCheckedChange={(checked) => 
                    setNotifications({...notifications, deal_alerts: checked})
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Weekly Reports</Label>
                  <p className="text-sm text-slate-500">Receive weekly summary reports</p>
                </div>
                <Switch
                  checked={notifications.weekly_reports}
                  onCheckedChange={(checked) => 
                    setNotifications({...notifications, weekly_reports: checked})
                  }
                />
              </div>
              
              <div className="pt-4">
                <Button onClick={() => console.log('Saving notification preferences:', notifications)}>
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Sidebar - Account Actions */}
        <div className="space-y-6">
          {/* Account Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Account
              </CardTitle>
              <CardDescription>
                Manage your account security
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="flex items-center">
                  <Key className="h-4 w-4 text-slate-500 mr-2" />
                  <Input
                    id="password"
                    type="password"
                    value="********"
                    disabled={true}
                    className="bg-slate-50"
                  />
                </div>
                <Button variant="outline" className="mt-2" onClick={() => console.log('Change password')}>
                  Change Password
                </Button>
              </div>
              
              <div className="pt-4 border-t border-slate-200">
                <Button 
                  variant="destructive" 
                  className="w-full flex items-center justify-center gap-2"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                >
                  <LogOut className="h-4 w-4" />
                  {isSigningOut ? 'Signing out...' : 'Sign Out'}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* App Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
              <CardDescription>
                Application information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-600">Version</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Last Updated</span>
                <span className="font-medium">Feb 19, 2024</span>
              </div>
              <div className="pt-4">
                <a 
                  href="#" 
                  className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
                  onClick={() => console.log('View privacy policy')}
                >
                  Privacy Policy
                </a>
                {' · '}
                <a 
                  href="#" 
                  className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
                  onClick={() => console.log('View terms of service')}
                >
                  Terms of Service
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
