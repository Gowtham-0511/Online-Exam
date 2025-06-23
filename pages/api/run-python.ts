// import { NextApiRequest, NextApiResponse } from "next";
// import { exec } from "child_process";
// import fs from "fs";
// import path from "path";

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//     if (req.method !== "POST") return res.status(405).end("Only POST allowed");

//     const { code } = req.body;
//     if (!code) return res.status(400).json({ error: "No Python code provided" });

//     const filename = `user_code_${Date.now()}.py`;
//     const filePath = path.join(process.cwd(), "temp", filename);

//     fs.mkdirSync(path.join(process.cwd(), "temp"), { recursive: true });
//     fs.writeFileSync(filePath, code);

//     exec(`python "${filePath}"`, { timeout: 5000 }, (error, stdout, stderr) => {
//         fs.unlinkSync(filePath);

//         if (error) {
//             return res.status(200).json({ output: stderr || error.message });
//         }

//         return res.status(200).json({ output: stdout });
//     });
// }

import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).end("Only POST allowed");

    const { code } = req.body;

    const response = await fetch("https://python-code-runner-p78g.onrender.com/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
    });

    const data = await response.json();

    if (data.error) return res.status(200).json({ output: data.error });
    return res.status(200).json({ output: data.output });
}