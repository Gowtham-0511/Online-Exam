import pool from "./db";

export async function createOrFetchUser(email: string, name: string | null) {
    // 1. Hardcode admin role for specific email
    if (email.toLowerCase() === "gowthamr@systechusa.com") {
        // Ensure user exists in DB even if we force the role return
        const existingUser = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (existingUser.rows.length === 0) {
            await pool.query(
                `INSERT INTO users (email, name, role, created_at, updated_at)
                 VALUES ($1, $2, 'admin', NOW(), NOW())`,
                [email, name]
            );
        } else if (existingUser.rows[0].role !== 'admin') {
            // Optional: Update DB to match hardcoded reality so future queries are consistent
            await pool.query("UPDATE users SET role = 'admin' WHERE email = $1", [email]);
        }
        return { role: "admin" };
    }

    const existingUser = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
    );

    if (existingUser.rows.length > 0) {
        return { role: existingUser.rows[0].role };
    }

    // Insert new user
    await pool.query(
        `
            INSERT INTO users (email, name, role, created_at, updated_at)
            VALUES ($1, $2, 'attender', NOW(), NOW())
        `,
        [email, name]
    );

    return { role: "attender" };
}
