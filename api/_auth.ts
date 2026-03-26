import { queryOne } from "./_db.js";

export async function ensureProfile(userId: string): Promise<string> {
  await queryOne(
    `INSERT INTO profiles (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );

  return userId;
}
