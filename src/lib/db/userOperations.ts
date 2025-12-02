import pool from "./db";

export async function createOrFetchUser(email: string, name: string | null) {
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
