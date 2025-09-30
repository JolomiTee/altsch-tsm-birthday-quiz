import bodyParser from "body-parser";
import dotenv from "dotenv";
import express, { type Request, type Response } from "express";
import path from "path";
import { connDb } from "./config/connectDb";
import { runCronJob } from "./lib/util";
import addRouter from "./router/add.route";

dotenv.config();

export const app = express();
const PORT = process.env.PORT || 4000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req: Request, res: Response) => {
	res.render("index");
});

app.use("/add", addRouter);

runCronJob();

app.listen(PORT, () => {
	connDb();
	console.log(`Birthday Reminder running at http://localhost:${PORT}`);
});
