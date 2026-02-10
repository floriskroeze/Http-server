ALTER TABLE "refresh_tokens" ALTER COLUMN "expires_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ALTER COLUMN "revoked_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_chirpy_red" boolean DEFAULT false NOT NULL;