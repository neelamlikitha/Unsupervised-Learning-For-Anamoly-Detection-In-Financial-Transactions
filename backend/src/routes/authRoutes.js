import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createUser, findUserByEmail } from '../models/userModel.js';
import { createRefreshToken, findRefreshToken, deleteRefreshToken } from '../models/refreshTokenModel.js';
import { env } from '../config/env.js';

const router = express.Router();

function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiry }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { id: user.id, type: 'refresh' },
    env.jwtRefreshSecret,
    { expiresIn: env.jwtRefreshExpiry }
  );
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const allowedRoles = ['user', 'admin'];
    const assignedRole = allowedRoles.includes(role) ? role : 'user';

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({ name, email, passwordHash, role: assignedRole });
    const token = signAccessToken(user);
    const refreshToken = await createRefreshToken(
      user.id,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );

    return res.status(201).json({
      token,
      refreshToken,
      expiresIn: env.jwtExpiry,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Register error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signAccessToken(user);
    const refreshToken = await createRefreshToken(
      user.id,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );

    return res.json({
      token,
      refreshToken,
      expiresIn: env.jwtExpiry,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }

    const stored = await findRefreshToken(refreshToken);
    if (!stored) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    const user = {
      id: stored.user_id,
      name: stored.name,
      email: stored.email,
      role: stored.role
    };
    const token = signAccessToken(user);
    const newRefreshToken = await createRefreshToken(
      stored.user_id,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );
    await deleteRefreshToken(refreshToken);

    return res.json({
      token,
      refreshToken: newRefreshToken,
      expiresIn: env.jwtExpiry,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Refresh error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

