import express, { type Request, type Response } from "express";
import path from "path";
import bodyParser from "body-parser";
import mongoose, { Schema, Document } from "mongoose";
import nodemailer from "nodemailer";
import cron from "node-cron";
import dotenv from "dotenv";
import { sendEmail } from "./utils";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

mongoose
	.connect(
		process.env.MONGO_URI || "mongodb://127.0.0.1:27017/birthday-reminder"
	)
	.then(() => console.log("MongoDb connected"))
	.catch((err) => console.error("MongoDb Error:", err));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.urlencoded({ extended: true }));

interface IUser extends Document {
	username: string;
	email: string;
	dob: string;
}

const UserSchema = new Schema<IUser>({
	username: { type: String, required: true },
	email: { type: String, unique: true, required: true },
	dob: { type: String, required: true },
});

const User = mongoose.model<IUser>("User", UserSchema);

app.get("/", (req: Request, res: Response) => {
	res.render("index");
});

app.post("/add", async (req: Request, res: Response) => {
	const { username, email, dob } = req.body;

	if (!username || !email || !dob) {
		return res.send("All fields are required!");
	}

	try {
		const user = new User({ username, email, dob });
		await user.save();
		res.send("User created!");
	} catch (err: any) {
		if (err.code === 11000) {
			res.send("Email already exists!");
		} else {
			res.send("Error: " + err.message);
		}
	}
});

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: process.env.GMAIL_USER,
		pass: process.env.GMAIL_PASS,
	},
});

cron.schedule("0 7 * * *", async () => {
	const today = new Date().toISOString().slice(5, 10); // "MM-DD"

	const users = await User.find({});
	const celebrants = users.filter((u) => u.dob.slice(5) === today);

	for (const user of celebrants) {
		try {
			await sendEmail(
				"🎂 Happy Birthday!",
				`<h2>Happy Birthday, ${user.username}! 🎉</h2>
			 <p>We wish you a wonderful year ahead filled with joy and success.</p>`,
				user.email
			);
			console.log("✅ Birthday email sent to", user.email);
		} catch (err) {
			console.error("❌ Failed to send email to", user.email, err);
		}
	}
});

app.listen(PORT, () => {
	console.log(`Birthday Reminder running at http://localhost:${PORT}`);
});
