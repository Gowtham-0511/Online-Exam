import { getDatabase } from './database';
import { RunResult } from 'better-sqlite3';

export type UserRole = "attender" | "examiner" | "admin";

export interface User {
    id: number;
    email: string;
    name: string | null;
    role: UserRole;
    created_at: string;
    updated_at: string;
}

export const createOrFetchUser = (email: string, name: string | null): { role: UserRole } => {
    const db = getDatabase();

    try {
        // First, try to get existing user
        const selectStmt = db.prepare('SELECT * FROM users WHERE email = ?');
        const existingUser = selectStmt.get(email) as User | undefined;

        if (existingUser) {
            return { role: existingUser.role };
        }

        // Create new user if doesn't exist
        const insertStmt = db.prepare(`
      INSERT INTO users (email, name, role) 
      VALUES (?, ?, 'attender')
    `);

        const result = insertStmt.run(email, name) as RunResult;

        if (result.changes > 0) {
            return { role: 'attender' };
        } else {
            throw new Error('Failed to create user');
        }
    } catch (error) {
        console.error('Error in createOrFetchUser:', error);
        throw error;
    }
};

export const getUserByEmail = (email: string): User | null => {
    const db = getDatabase();

    try {
        const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
        return stmt.get(email) as User || null;
    } catch (error) {
        console.error('Error getting user by email:', error);
        return null;
    }
};

export const updateUserRole = (email: string, role: UserRole): boolean => {
    const db = getDatabase();

    try {
        const stmt = db.prepare(`
      UPDATE users 
      SET role = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE email = ?
    `);
        const result = stmt.run(role, email) as RunResult;
        return result.changes > 0;
    } catch (error) {
        console.error('Error updating user role:', error);
        return false;
    }
};

export const getAllUsers = (): User[] => {
    const db = getDatabase();

    try {
        const stmt = db.prepare('SELECT * FROM users ORDER BY created_at DESC');
        return stmt.all() as User[];
    } catch (error) {
        console.error('Error getting all users:', error);
        return [];
    }
};