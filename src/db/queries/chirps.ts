import {db} from "../index.js";
import {chirps, NewChirp} from "../schema.js";
import {and, asc, eq} from "drizzle-orm";

export async function createChirp(chirp: NewChirp) {
    const [result] = await db
        .insert(chirps)
        .values(chirp)
        .onConflictDoNothing()
        .returning();
    return result;
}

export async function getChirps() {
    return db.select({body: chirps.body}).from(chirps).orderBy(asc(chirps.createdAt));
}

export async function getChirpsByAuthorId(authorId: string)  {
    return db.select({body: chirps.body}).from(chirps).where(eq(chirps.user_id, authorId)).orderBy(asc(chirps.createdAt));
}

export async function getChirpById(chirpId: string)  {
    const [result] = await db.select({body: chirps.body}).from(chirps).where(eq(chirps.id, chirpId)).orderBy(asc(chirps.createdAt));
    return result;
}

export async function deleteChirpbyId(userId: string, chirpId: string)  {
    const [result] = await db.delete(chirps).where(and(eq(chirps.user_id, userId), eq(chirps.id, chirpId))).returning();
    return result;
}