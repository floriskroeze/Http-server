import express from "express";
import { NotFoundError, BadRequestError, UnauthorizedError, ForbiddenError } from "./error/Error.js";
import { config } from "./config.js";
const app = express();
const PORT = 8080;
app.use(express.json());
app.use(middlewareLogRequests);
app.use(middlewareLogResponses);
app.use("/app", middlewareMetricsInc);
app.use("/app", express.static("./app"));
app.get("/api/healthz", handleHealthz);
app.get("/admin/metrics", handleMetrics);
app.post("/admin/reset", handleReset);
app.post("/api/validate_chirp", async (req, res, next) => {
    try {
        await handleValidateChirp(req, res);
    }
    catch (err) {
        next(err);
    }
});
app.use(errorHandler);
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
function handleMetrics(req, res) {
    return res
        .status(200)
        .set('Content-Type', 'text/html; charset=utf-8')
        .send(`	
			<html>
			  <body>
				<h1>Welcome, Chirpy Admin</h1>
				<p>Chirpy has been visited ${config.fileserverHits} times!</p>
			  </body>
			</html>
		`);
}
function handleReset(req, res) {
    config.fileserverHits = 0;
    return res
        .status(200)
        .set('Content-Type', 'text/plain; charset=utf-8')
        .send("fileserverHits reseted to 0");
}
function handleHealthz(req, res) {
    return res
        .status(200)
        .set('Content-Type', 'text/plain; charset=utf-8')
        .send("OK");
}
async function handleValidateChirp(req, res) {
    const forbiddenWords = [
        'kerfuffle',
        'sharbert',
        'fornax'
    ];
    const params = req.body;
    let respBody = {};
    let statusCode = 200;
    if (params.body.length > 140) {
        throw new BadRequestError("Chirp is too long. Max length is 140");
    }
    else {
        let cleanedBody = "";
        const filteredWordArray = params.body.split(' ').map((word) => {
            if (forbiddenWords.includes(word.toLowerCase())) {
                return "****";
            }
            return word;
        });
        cleanedBody = filteredWordArray.join(" ");
        respBody = {
            "valid": true,
            "cleanedBody": cleanedBody
        };
    }
    res
        .status(statusCode)
        .set("Content-Type", "application/json")
        .send(JSON.stringify(respBody));
}
function middlewareMetricsInc(req, res, next) {
    config.fileserverHits++;
    console.log(config.fileserverHits);
    next();
}
function middlewareLogRequests(req, res, next) {
    console.log(`Incomming: ${req.method} ${req.url}`);
    next();
}
function middlewareLogResponses(req, res, next) {
    res.on("finish", () => {
        if (res.statusCode === 200)
            return;
        console.log(`[NON-OK] ${req.method} ${req.url} - Status: ${res.statusCode}`);
    });
    next();
}
function errorHandler(err, req, res, next) {
    if (err instanceof NotFoundError) {
        return res.status(404).send("Not found");
    }
    else if (err instanceof ForbiddenError) {
        return res.status(403).send("Forbidden");
    }
    else if (err instanceof UnauthorizedError) {
        return res.status(402).send("Unauthorized request");
    }
    else if (err instanceof BadRequestError) {
        return res.status(400).send({ "error": err.message });
    }
    else {
        return res.status(500).send({
            "error": "Something went wrong on our end"
        });
    }
}
