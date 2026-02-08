import {hash, verify} from "argon2";
import jwt, {JwtPayload} from "jsonwebtoken";
import {UnauthorizedError} from "./error/Error.js";
import {Request} from "express";
import * as crypto from "node:crypto";
import {createRefreshToken} from "./db/queries/refresh_tokens.js";


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

export function validateJWT(tokenString: string, secret: string): string {
    try {
        const token = jwt.verify(tokenString, secret) as JwtPayload;

        if (token.sub) {
            return token.sub;
        }

        throw new UnauthorizedError("");
    } catch (e) {
        throw new UnauthorizedError("");
    }
}

export function makeJWT(userID: string, expiresIn: number, secret: string): string {
    type payload = Pick<JwtPayload, "iss" | "sub" | "iat"| "exp">

    const currentDateTime = Math.floor(Date.now() / 1000);

    const payload: payload = {
        iss: "chirpy",
        sub: userID,
        iat: currentDateTime,
        exp: currentDateTime + expiresIn
    };

    return jwt.sign(payload, secret, {})
}

export function getBearerToken(req: Request): string {
    const authHeader = req.get('authorization');

    console.log("Auth header: " + authHeader)

    const [scheme, token] = authHeader?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
        throw new UnauthorizedError("No bearer token found");
    }

    return token;
}

export async function makeRefreshToken(user_id: string) {
    const token = crypto.randomBytes(32).toString('hex');

    let currentDate = new Date();

    currentDate.setDate(currentDate.getDate() + 60);

    try {
        const refreshToken =  await createRefreshToken({
            token: token,
            user_id: user_id,
            expiresAt: currentDate
        });

        if (refreshToken) {
            return token;
        }

        throw new Error("Something went wrong");

    } catch (e) {
        throw new Error("Something went wrong");
    }
}

