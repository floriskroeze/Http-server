import express, {Request, Response, NextFunction} from "express";
import {NotFoundError, BadRequestError, UnauthorizedError, ForbiddenError} from "./error/Error.js";
import {config} from "./config.js";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import {createUser, deleteAllUsers, getUserByEmail, NewUserResponse} from "./db/queries/users.js";
import {createChirp, getChirpById, getChirps} from "./db/queries/chirps.js";
import {checkPasswordHash, getBearerToken, hashPassword, makeJWT, makeRefreshToken, validateJWT} from "./auth.js";
import {getUserFromRefreshToken, revokeRefreshToken} from "./db/queries/refresh_tokens.js";

const migrationClient = postgres(config.db.url, { max: 1 });
await migrate(drizzle(migrationClient), config.db.migrationConfig);

const app = express();
const PORT = 8080;

app.use(express.json());
app.use(middlewareLogRequests);
app.use(middlewareLogResponses);
app.use("/app", middlewareMetricsInc);
app.use("/app", express.static("./app"));

app.get("/api/healthz", handleHealthz);
app.get("/admin/metrics", handleMetrics);
app.get("/api/chirps", async (req, res, next) => {
	try {
		await handleGetAllChirps(req, res);
	} catch (err) {
		next(err);
	}
});

app.get(`/api/chirps/:chirpId`, async (req, res, next) => {
	try {
		await handleGetChirpById(req, res);
	} catch (err) {
		next(err);
	}
});

app.post("/api/refresh", async (req: Request<{ email: string, password: string }>, res, next) => {
	try {
		await handleRefresh(req, res);
	} catch (err) {
		next(err);
	}
});
app.post("/api/revoke", async (req: Request, res: Response, next: NextFunction)=> {
	try {
		await handleRevoke(req, res);
	} catch (err) {
		next(err);
	}
});
app.post("/admin/reset", handleReset);
app.post("/api/users", handleUsers);
app.post("/api/login", async (req: Request<{ email: string, password: string }>, res, next) => {
	try {
		await handleLogin(req, res);
	} catch (err) {
		next(err);
	}
});
app.post("/api/chirps", async (req, res, next) => {
	try {
		await handleChirps(req, res);
	} catch (err) {
		next(err);
	}
});

app.put("/api/users", async (req: Request<{email: string, password: string}>, res: Response, next: NextFunction) => {
	try {
		await handleUpdateUser(req, res);
	} catch (err) {
		next(err);
	}
})

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});

function handleMetrics(req: Request, res: Response) {
	return res
		.status(200)
		.set('Content-Type', 'text/html; charset=utf-8')
		.send(`	
			<html>
			  <body>
				<h1>Welcome, Chirpy Admin</h1>
				<p>Chirpy has been visited ${config.api.fileserverHits} times!</p>
			  </body>
			</html>
		`);
}

async function handleRefresh(req: Request, res: Response) {
	const bearerToken = getBearerToken(req);

	if (bearerToken) {
		console.log(bearerToken)
		try {
			const user = await getUserFromRefreshToken(bearerToken);

			if (user) {
				const newAccessToken = makeJWT(user.user_id, 3600,config.api.secret);
				return res
					.status(200)
					.send({
						token: newAccessToken
					});
			}

			throw new UnauthorizedError("Unauthorized");
		} catch (e) {
			throw new UnauthorizedError("Unauthorized");
		}
	}
}

async function handleRevoke(req: Request, res: Response) {
	const bearerToken = getBearerToken(req);

	console.log("Bearer token: " + bearerToken);
	if (bearerToken) {
		try {
			const revokedToken = await revokeRefreshToken(bearerToken);

			if (revokedToken) {
				return res
					.status(204)
					.send();
			}
		} catch (e) {
			console.log("Error revoking token");

			throw new BadRequestError("");
		}
	}
}

async function handleReset(req: Request, res: Response) {
	if (config.api.platform !== "dev") throw new ForbiddenError("Forbidden");

	try {
		await deleteAllUsers();
	} catch (e) {
		console.log(e);
	}

	config.api.fileserverHits = 0;

	return res
		.status(200)
		.set('Content-Type', 'text/plain; charset=utf-8')
		.send("fileserverHits reseted to 0 and users deleted");
}

async function handleUsers(req: Request, res: Response) {
	type parameters = {
		email: string;
		password: string;
	}
	const params: parameters = req.body

	if (!params.email) {
		return res.status(400).json({ error: "Email is required" });
	}

	if (!params.password) {
		return res.status(400).json({ error: "Password is required" });
	}


	try {
		const hashedPassword = await hashPassword(params.password);
		let user: NewUserResponse| {} = {};

		if (hashedPassword) {
			user = await createUser({email: params.email, hashed_password: hashedPassword})
		}

		if (user) {
			console.log("User created:", user);
			return res.status(201).json(user);
		}

		return res.status(500).json({ error: "Failed to create user" });

	} catch (error) {
		return res.status(500).json({ error: "Internal server error" });
	}
}

async function handleLogin(req: Request<{password: string, email: string}>, res: Response) {
	const {email, password} = req.body;

	if (!email) {
		return res.status(400).json({ error: "Email is required" });
	}

	if (!password) {
		return res.status(400).json({ error: "Password is required" });
	}

	try {
		const user = await getUserByEmail(email);
		console.log(user);

		if (user) {
			const isValidLogin = await checkPasswordHash(password, user.hashed_password);
			const expiresIn = 3600;

			if (isValidLogin) {
				const token = makeJWT(user.id, expiresIn, config.api.secret);
				const refreshToken = await makeRefreshToken(user.id);

				return res.status(200).json({
					id: user.id,
					createdAt: user.createdAt,
					updatedAt: user.updatedAt,
					email: user.email,
					token: token,
					refreshToken: refreshToken
				});
			} else {
				throw new UnauthorizedError("Invalid login");
			}
		}
	} catch (e) {
		throw new UnauthorizedError("Something went wrong");
	}
}

async function handleGetAllChirps(req: Request, res: Response) {
	try {
		const chirps = await getChirps();

		if (chirps) {
			return res.status(200).json(chirps);
		}

		return res.status(500).json({ error: "Failed to fetch chirps" });

	} catch (e) {
		return res.status(500).json({ error: "Internal server error" });
	}
}

async function handleGetChirpById(req: Request<{chirpId: string}>, res: Response) {
	const {chirpId} = req.params;

	try {
		const chirp = await getChirpById(chirpId);

		if (chirp) {
			return res.status(200).json(chirp);
		}
	} catch (e) {
		throw new NotFoundError("Chirp not found");
	}
}

async function handleChirps(req: Request, res: Response) {
	type Parameters = {
		"body": string;
		"userId": string;
	};

	const bearerToken = getBearerToken(req);

	if (!bearerToken) {
		throw new UnauthorizedError("No bearer token found");
	}

	const validatedToken = validateJWT(bearerToken, config.api.secret);

	if(!validatedToken) {
		throw new UnauthorizedError("No validatedToken");
	}

	const forbiddenWords = [
		'kerfuffle',
		'sharbert',
		'fornax'
	]

	const params: Parameters = req.body;

	if (params.body.length > 140) {
		throw new BadRequestError("Chirp is too long. Max length is 140");
	} else {
		let cleanedBody = "";

		const filteredWordArray = params.body.split(' ').map((word) => {
			if (forbiddenWords.includes(word.toLowerCase())) {
				return "****";
			}

			return word;
		});

		cleanedBody = filteredWordArray.join(" ");

		try {
			const chirp = await createChirp({body: cleanedBody, user_id: validatedToken});

			const resJson = {
				id: chirp.id,
				body: chirp.body,
				userId: chirp.user_id
			}

			if (chirp) {
				console.log("Chirp created:", chirp);
				return res.status(201).json(resJson);
			}

			return res.status(500).json({ error: "Failed to create user" });

		} catch (error) {
			return res.status(500).json({ error: "Internal server error" });
		}
	}
}

function handleHealthz(req: Request, res: Response) {
	return res
		.status(200)
		.set('Content-Type', 'text/plain; charset=utf-8')
		.send("OK");
}

async function handleUpdateUser(req: Request<{email: string, password: string}>, res: Response) {
	const bearerToken = getBearerToken(req);
	const {email, password} = req.params;

	if (!bearerToken) throw new UnauthorizedError("Unauthorized");
	if (!email && !password) throw new BadRequestError("Missing data");

	try {
		const updatedUser = updateUserData()
	} catch (e) {

	}
}

function middlewareMetricsInc(req: Request, res: Response, next: NextFunction) {
	config.api.fileserverHits ++;
	console.log(config.api.fileserverHits);
	next();
}

function middlewareLogRequests(req: Request, res: Response, next: NextFunction) {
	console.log(`Incomming: ${req.method} ${req.url}`);
	next();
}

function middlewareLogResponses(req: Request, res: Response, next: NextFunction) {
	res.on("finish", () => {
		if (res.statusCode ===  200) return;
		console.log(`[NON-OK] ${req.method} ${req.url} - Status: ${res.statusCode}`);
	});
	
	next();
}

function errorHandler(
	err: Error,
	req: Request,
	res: Response,
	next: NextFunction
) {
	if (err instanceof NotFoundError) {
		return res.status(404).send({"error": err.message});
	} else if (err instanceof ForbiddenError) {
		return res.status(403).send({"error": err.message});
	} else if (err instanceof UnauthorizedError) {
		return res.status(401).send({"error": err.message});
	} else if (err instanceof BadRequestError) {
		return res.status(400).send({"error": err.message});
	} else {
		return res.status(500).send({
			"error": "Something went wrong on our end"
		});
	}
}