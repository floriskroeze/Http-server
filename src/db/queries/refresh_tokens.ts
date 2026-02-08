import {NewRefreshToken, refresh_tokens } from "../schema.js";
import {db} from "../index.js";
import {and, eq, gt, isNull, sql} from "drizzle-orm";

export async function createRefreshToken(token: NewRefreshToken): Promise<NewRefreshToken> {
    const [result] = await db
        .insert(refresh_tokens)
        .values(token)
        .onConflictDoNothing()
        .returning();
    return result;
}

export async function getUserFromRefreshToken(token: string) {
    const [result] =  await db.select({user_id: refresh_tokens.user_id}).from(refresh_tokens).where(and(
        isNull(refresh_tokens.revokedAt),
        eq(refresh_tokens.token, token),
        gt(refresh_tokens.expiresAt, sql`NOW()`)
    ));
    return result;
}

export async function revokeRefreshToken(token: string) {
    const [result] = await db.update(refresh_tokens).set({updatedAt: sql`NOW()`, revokedAt: sql`NOW()`}).where(eq(refresh_tokens.token, token), ).returning({revokedAt: refresh_tokens.revokedAt});
    return result;
}