import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const form = formidable({
            keepExtensions: true,
            maxFileSize: 10 * 1024 * 1024, // 10MB
        });

        const [fields, files] = await form.parse(req);

        const file = Array.isArray(files.file) ? files.file[0] : files.file;
        const examId = Array.isArray(fields.examId) ? fields.examId[0] : fields.examId;

        if (!file || !examId) {
            return res.status(400).json({ message: 'No file or examId provided' });
        }

        const examDir = path.join(process.cwd(), 'public', 'exam-files', examId);

        if (!fs.existsSync(examDir)) {
            fs.mkdirSync(examDir, { recursive: true });
        }

        const originalFilename = file.originalFilename || 'file';
        const sanitizedFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const finalPath = path.join(examDir, sanitizedFilename);

        fs.renameSync(file.filepath, finalPath);

        const fileUrl = `/exam-files/${examId}/${sanitizedFilename}`;

        return res.status(200).json({
            success: true,
            fileUrl,
            filename: sanitizedFilename
        });

    } catch (error) {
        console.error('File upload error:', error);
        return res.status(500).json({ message: 'File upload failed' });
    }
}