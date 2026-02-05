import {hash, verify} from "argon2";

export async function hashPassword(password: string) {
    try {
        return await hash(password);
    } catch (err) {
        throw new Error("Failed to hash password");
    }
}

export async function checkPasswordHash(password: string, hash: string): Promise<boolean> {
    try {
        return await verify(hash, password);
    } catch (err) {
        throw new Error("Something went wrong");
    }
}