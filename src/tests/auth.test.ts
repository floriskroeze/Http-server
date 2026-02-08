import {describe, it, expect, beforeAll} from "vitest";
import {Request} from "express";
import {checkPasswordHash, getBearerToken, hashPassword, makeJWT, validateJWT} from "../auth.js";
import {UnauthorizedError} from "../error/Error";

describe("Password Hashing", () => {
    const password1 = "correctPassword123!";
    const password2 = "anotherPassword456!";
    let hash1: string;
    let hash2: string;

    beforeAll(async () => {
        hash1 = await hashPassword(password1);
        hash2 = await hashPassword(password2);
    });

    it("should return true for the correct password", async () => {
        const result = await checkPasswordHash(password1, hash1);
        expect(result).toBe(true);
    });
});

describe("JWT making", () => {
    const user = "1";
    const expiresIn = 100;
    const secret = "test_secret";

    const token = makeJWT(user, expiresIn, secret);

    it("should return a new jwt", () => {
        expect(token).toBeTypeOf("string");
    });
});

describe("JWT verifying", () => {
    let user = "1";
    let expiresIn = 100;
    const secret = "test_secret";

    let token = makeJWT(user, expiresIn, secret);
    let wrongSecretToken = makeJWT(user, expiresIn, "bob");
    let expiredToken = makeJWT(user, -1000, secret);

    it("should validate a correct token", () => {
        expect(validateJWT(token, secret)).toBeTypeOf("string");
    });

    it("should reject a token with the wrong secret", () => {
        expect(() => validateJWT(wrongSecretToken, secret)).toThrowError();
    });

    it("should reject a token that is expired", () => {
        expect(() => validateJWT(expiredToken, secret)).toThrowError();
    });
});

describe('getBearerToken (Strict)', () => {
    // Cast the object to 'unknown' then 'Request' to satisfy TS
    const mockReq = (authHeader?: string) => ({
        get: (name: string) => {
            if (name.toLowerCase() === 'authorization') return authHeader;
            return undefined;
        }
    } as unknown as Request);

    it('should return the token when a valid Bearer header is provided', () => {
        const req = mockReq('Bearer super-secret-123');
        // Now TS will allow passing 'req' into getBearerToken
        expect(getBearerToken(req)).toBe('super-secret-123');
    });

    it('should throw UnauthorizedError if the Authorization header is missing', () => {
        const req: Request = mockReq(undefined);

        try {
            getBearerToken(req);
            throw new Error('Should have thrown an error');
        } catch (e) {
            if (!(e instanceof UnauthorizedError)) throw e;
        }
    });

    it('should throw if the scheme is not "Bearer"', () => {
        const req = mockReq('Basic dXNlcjpwYXNz');

        try {
            getBearerToken(req);
            throw new Error('Should have thrown an error');
        } catch (e) {
            if (!(e instanceof UnauthorizedError)) throw e;
        }
    });

    it('should throw if the header is just the word "Bearer" without a token', () => {
        const req = mockReq('Bearer ');

        try {
            getBearerToken(req);
            throw new Error('Should have thrown an error');
        } catch (e) {
            if (!(e instanceof UnauthorizedError)) throw e;
        }
    });

    it('should be case-sensitive for "Bearer" (or throw if lowercase)', () => {
        const req = mockReq('bearer token123');

        try {
            getBearerToken(req);
            throw new Error('Should have thrown an error');
        } catch (e) {
            if (!(e instanceof UnauthorizedError)) throw e;
        }
    });
});