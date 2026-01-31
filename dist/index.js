import express from "express";
import { config } from "./config.js";
const app = express();
const PORT = 8080;
app.use(middlewareLogRequests);
app.use(middlewareLogResponses);
app.use("/app", middlewareMetricsInc);
app.use("/app", express.static("./app"));
app.get("/api/healthz", handleHealthz);
app.get("/api/metrics", handleMetrics);
app.get("/api/reset", handleReset);
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
function handleMetrics(req, res) {
    return res
        .status(200)
        .set('Content-Type', 'text/plain; charset=utf-8')
        .send(`Hits: ${config.fileserverHits}`);
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
