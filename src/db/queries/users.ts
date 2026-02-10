import { db } from "../index.js";
import {NewUser, users} from "../schema.js";
import {eq} from "drizzle-orm";

export type NewUserResponse = Omit<NewUser, "password">

export async function createUser(user: NewUser): Promise<NewUserResponse> {
    const [result] = await db
        .insert(users)
        .values(user)
        .onConflictDoNothing()
        .returning({
            id: users.id,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
            email: users.email,
            isChirpyRed: users.isChirpyRed
        });
    console.log(result)
    return result;
}

export async function deleteAllUsers() {
    const [result] = await db.delete(users).returning();
    return result;
}

export async function getUserByEmail(email: string) {
    const [result] =  await db.select().from(users).where(eq(users.email, email));
    return result;
}

export async function updateUserData(id: string, email: string, hashed_password: string) {
    const fieldsToSet = {
        email,
        hashed_password
    }
    const [result] = await db.update(users).set(fieldsToSet).where(eq(users.id, id)).returning({id: users.id, email: users.email, createdAt: users.createdAt, updatedAt: users.updatedAt, isChirpyRed: users.isChirpyRed});
    return result
}

export async function upgradeUser(userId: string) {
    const [result] = await db.update(users).set({isChirpyRed: true}).where(eq(users.id, userId)).returning({id: users.id, email: users.email, createdAt: users.createdAt, updatedAt: users.updatedAt, isChirpyRed: users.isChirpyRed});
    return result
}