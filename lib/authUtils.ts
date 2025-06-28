// Client-side auth utilities
export type UserRole = "attender" | "examiner" | "admin";

// This function now makes an API call instead of direct database access
export const createOrFetchUser = async (email: string, name: string | null): Promise<{ role: UserRole }> => {
    try {
        const response = await fetch('/api/users/get-or-create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, name }),
        });

        if (!response.ok) {
            throw new Error('Failed to create or fetch user');
        }

        return await response.json();
    } catch (error) {
        console.error('Error in createOrFetchUser:', error);
        throw error;
    }
};