import { NextApiRequest, NextApiResponse } from 'next';
import { createOrFetchUser } from '../../../lib/userOperations';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const { email, name } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const user = createOrFetchUser(email, name);

        res.status(200).json({ role: (await user).role }); 
    } catch (error) {
        console.error('Error in get-or-create user:', error);
        res.status(500).json({ error: 'Failed to create or fetch user' });
    }
}