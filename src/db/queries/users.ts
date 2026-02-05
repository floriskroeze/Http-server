import { db } from "../index.js";
import { NewUser, users } from "../schema.js";

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