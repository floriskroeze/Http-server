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
            email: users.email
        });
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