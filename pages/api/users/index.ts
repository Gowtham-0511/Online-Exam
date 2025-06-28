import { NextApiRequest, NextApiResponse } from 'next';
import { getAllUsers } from '../../../lib/userOperations';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    switch (req.method) {
        case 'GET':
            try {
                const users = getAllUsers();
                res.status(200).json(users);
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch users' });
            }
            break;

        default:
            res.setHeader('Allow', ['GET']);
            res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}