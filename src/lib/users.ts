import bcrypt from 'bcryptjs';
import { User, UserRole } from '@/types/auth';

const users: User[] = [
  {
    id: '1',
    email: 'admin@homa.com',
    role: 'ADMIN' as UserRole,
  },
  {
    id: '2',
    email: 'owner@homa.com',
    role: 'OWNER' as UserRole,
  },
  {
    id: '3',
    email: 'staff@homa.com',
    role: 'STAFF' as UserRole,
  },
];

const passwordHashes: Record<string, string> = {
  '1': bcrypt.hashSync('admin123', 10),
  '2': bcrypt.hashSync('owner123', 10),
  '3': bcrypt.hashSync('staff123', 10),
};

export async function validateUser(email: string, password: string): Promise<User | null> {
  const user = users.find(u => u.email === email);
  
  if (!user) {
    return null;
  }

  const hashedPassword = passwordHashes[user.id];
  const isValidPassword = await bcrypt.compare(password, hashedPassword);

  if (!isValidPassword) {
    return null;
  }

  return user;
}

export function getUserById(id: string): User | null {
  return users.find(u => u.id === id) || null;
}