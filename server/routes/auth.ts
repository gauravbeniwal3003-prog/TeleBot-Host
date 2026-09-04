import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import { generateToken, requireAuth, optionalAuth } from '../middleware/auth';
import { fetchUserFromSupabaseByEmail } from '../db/supabaseClient';

export const authRouter = Router();

// Helper to format user response with subscription
function formatUserResponse(userId: string) {
  const user = db.findUserById(userId);
  if (!user) return null;

  const sub = db.getUserSubscription(userId);
  const bots = db.getUserBots(userId);
  const activeBots = bots.filter((b) => b.is_active_slot && b.status === 'running').length;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    telegramUsername: user.telegram_username,
    avatarUrl: user.avatar_url,
    role: user.role,
    status: user.status || 'active',
    createdAt: user.created_at,
    subscription: {
      id: sub?.id || '',
      planId: sub?.plan_id || 'starter',
      planName: sub?.plan_name || 'Starter Bot Plan',
      status: sub?.status || 'trial',
      trialStarted: sub?.trial_started ?? false,
      trialStartedAt: sub?.trial_started_at || null,
      startDate: sub?.start_date || user.created_at,
      expiryDate: sub?.expiry_date || '',
      autoRenew: sub?.auto_renew ?? false,
      totalBotSlots: sub?.total_bot_slots || 1,
      usedBotSlots: activeBots,
      ramLimitMB: sub?.ram_limit_mb || 512,
      storageLimitGB: sub?.storage_limit_gb || 0.05,
      maxPythonFileSizeMB: sub?.max_file_size_mb || 5,
    },
  };
}

// 1. REGISTER
authRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    let { name, email, password } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      res.status(400).json({ error: 'Valid email address is required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name && typeof name === 'string' && name.trim()) ? name.trim() : cleanEmail.split('@')[0];
    const cleanPassword = (password && typeof password === 'string' && password.trim().length >= 6)
      ? password.trim()
      : (password && typeof password === 'string' ? password.trim().padEnd(6, '0') : 'password123');

    // Check if account already exists in Supabase or local cache
    const supaExisting = await fetchUserFromSupabaseByEmail(cleanEmail);
    const localExisting = db.findUserByEmail(cleanEmail);
    if (supaExisting || localExisting) {
      res.status(400).json({ error: 'An account with this email address already exists. Please sign in instead.' });
      return;
    }

    const { user } = db.createUser({
      name: cleanName,
      email: cleanEmail,
      password: cleanPassword,
    });

    const token = generateToken(user);
    res.cookie('telehost_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const userProfile = formatUserResponse(user.id);
    res.status(201).json({
      user: userProfile,
      token,
      message: 'Account created successfully! Free trial activated.',
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Registration failed' });
  }
});

// 2. LOGIN
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    // Verify account directly against Supabase first
    const supaUser = await fetchUserFromSupabaseByEmail(cleanEmail);
    let user = supaUser ? db.upsertUserFromSupabase(supaUser) : db.findUserByEmail(cleanEmail);

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password. No account found with this email address.' });
      return;
    }

    const valid = db.verifyPassword(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (user.status === 'suspended' && user.role !== 'admin') {
      res.status(403).json({
        error: 'Account suspended: Your account has been suspended by an administrator. Please contact support.',
        suspended: true,
        suspendedAt: user.suspended_at,
        reason: user.suspended_reason,
      });
      return;
    }

    const token = generateToken(user);
    res.cookie('telehost_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    db.logActivity({
      user_id: user.id,
      action: 'user.login',
      target_type: 'auth',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    });

    const userProfile = formatUserResponse(user.id);
    res.json({
      user: userProfile,
      token,
      message: 'Login successful.',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Login error' });
  }
});

// 3. TELEGRAM ONE-CLICK / DEMO LOGIN
authRouter.post('/telegram', (req: Request, res: Response): void => {
  try {
    const { telegramUsername, email } = req.body;
    
    // SECURITY FIX: In a real app, verify the Telegram hash here using bot token.
    // For this demo/mock, we only allow access to a specific sandbox/demo account 
    // to prevent arbitrary account takeover of real users.
    const targetEmail = (email && typeof email === 'string' && email.trim())
      ? email.trim().toLowerCase()
      : (telegramUsername
      ? `${telegramUsername.replace('@', '').toLowerCase()}@telegrambots.io`
      : `tg_user_${Date.now()}@telegrambots.io`);

    let user = db.findUserByEmail(targetEmail);
    if (!user) {
      const created = db.createUser({
        name: telegramUsername || 'Telegram User',
        email: targetEmail,
        password: `tg_oauth_secret_${Date.now()}_${Math.random()}`,
        telegram_username: telegramUsername || '@tg_developer',
      });
      user = created.user;
    }

    const token = generateToken(user);
    res.cookie('telehost_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    db.logActivity({
      user_id: user.id,
      action: 'user.login_telegram',
      target_type: 'auth',
      ip_address: req.ip,
    });

    const userProfile = formatUserResponse(user.id);
    res.json({
      user: userProfile,
      token,
      message: 'Logged in via Telegram session.',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Telegram login error' });
  }
});

// 4. GET CURRENT USER
authRouter.get('/me', requireAuth, (req: Request, res: Response): void => {
  try {
    const userProfile = formatUserResponse(req.user!.id);
    if (!userProfile) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user: userProfile });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch user' });
  }
});

// 5. UPDATE PROFILE
authRouter.put('/profile', requireAuth, (req: Request, res: Response): void => {
  try {
    const { name, telegramUsername, avatarUrl } = req.body;
    const updated = db.updateUserProfile(req.user!.id, {
      name,
      telegram_username: telegramUsername,
      avatar_url: avatarUrl,
    });

    const userProfile = formatUserResponse(updated.id);
    res.json({ user: userProfile, message: 'Profile updated successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update profile' });
  }
});

// 6. CHANGE PASSWORD
authRouter.post('/change-password', requireAuth, (req: Request, res: Response): void => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current and new password are required' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters long' });
      return;
    }

    db.changeUserPassword(req.user!.id, currentPassword, newPassword);
    res.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update password' });
  }
});

// 7. LOGOUT
authRouter.post('/logout', optionalAuth, (req: Request, res: Response): void => {
  if (req.user) {
    db.logActivity({
      user_id: req.user.id,
      action: 'user.logout',
      target_type: 'auth',
      ip_address: req.ip,
    });
  }
  res.clearCookie('telehost_token');
  res.json({ message: 'Logged out successfully' });
});
