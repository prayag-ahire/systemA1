import express from "express";
import rateLimit from "express-rate-limit";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;
const Limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many request, please try again later.",
});

app.use(Limiter);
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/task", async (req, res) => {

})


