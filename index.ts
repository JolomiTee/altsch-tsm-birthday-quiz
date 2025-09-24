import express, { type Request, type Response } from "express";
import path from "path";
import bodyParser from "body-parser";
import mongoose, { Schema, Document } from "mongoose";
import nodemailer from "nodemailer";
import cron from "node-cron";
import dotenv from "dotenv";
import { Resend } from "resend";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// ---------------- MONGODB ----------------
mongoose
	.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/")
	.then(() => console.log("✅ MongoDB connected"))
	.catch((err) => console.error("❌ MongoDB Error:", err));

// ---------------- EJS ----------------
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.urlencoded({ extended: true }));

// ---------------- USER MODEL ----------------
interface IUser extends Document {
	username: string;
	email: string;
	dob: Date; // store as Date, not string
}

const UserSchema = new Schema<IUser>({
	username: { type: String, required: true },
	email: { type: String, unique: true, required: true },
	dob: { type: Date, required: true },
});

const User = mongoose.model<IUser>("User", UserSchema);

// ---------------- ROUTES ----------------
app.get("/", (req: Request, res: Response) => {
	res.render("index"); // make sure views/index.ejs exists
});

interface AddUserBody {
	username: string;
	email: string;
	dob: string; // comes in as string from form
}

app.post("/add", async (req: Request<{}, {}, AddUserBody>, res: Response) => {
	const { username, email, dob } = req.body;

	if (!username || !email || !dob) {
		return res.send("All fields are required!");
	}

	try {
		const user = new User({ username, email, dob: new Date(dob) });
		await user.save();
		res.send("✅ User created!");
	} catch (err: any) {
		if (err.code === 11000) {
			res.send("⚠️ Email already exists!");
		} else {
			res.send("❌ Error: " + err.message);
		}
	}
});

// ---------------- EMAIL SENDER ----------------
async function sendEmail(
	subject: string,
	body: string,
	recipient: string
): Promise<void> {
	if (process.env.NODE_ENV === "production") {
		// Use Resend in production
		const resend = new Resend(process.env.RESEND_API_KEY);
		const { data, error } = await resend.emails.send({
			from: process.env.EMAIL_BOX as string,
			to: recipient,
			subject,
			html: body,
		});
		if (error) {
			console.error("❌ Resend error:", error);
		}
		console.log("✅ Resend response:", data);
	} else {
		// Use Nodemailer + Gmail SMTP in development
		const transporter = nodemailer.createTransport({
			service: "gmail",
			auth: {
				user: process.env.EMAIL_BOX,
				pass: process.env.MAILER_PASS, // must be Gmail App Password
			},
		});
		try {
			const info = await transporter.sendMail({
				from: process.env.EMAIL_BOX,
				to: recipient,
				subject,
				html: body,
			});
			console.log("✅ Nodemailer info:", info.response);
		} catch (error) {
			console.error("❌ Nodemailer error:", error);
		}
	}
}

// ---------------- CRON JOB ----------------
// Runs every day at 7am
cron.schedule("0 7 * * *", async () => {
	try {
		const today = new Date();
		const todayMonth = today.getMonth(); // 0-indexed
		const todayDate = today.getDate();

		const users = await User.find({});
		const celebrants = users.filter((u) => {
			const dob = new Date(u.dob);
			return dob.getMonth() === todayMonth && dob.getDate() === todayDate;
		});

		for (const user of celebrants) {
			await sendEmail(
				"🎂 Happy Birthday!",
				`<h2>Happy Birthday, ${user.username}! 🎉</h2>
         <p>We wish you a wonderful year ahead filled with joy and success.</p>`,
				user.email
			);
			console.log("🎉 Birthday email sent to", user.email);
		}
	} catch (err) {
		console.error("❌ Cron job failed:", err);
	}
});

// ---------------- SERVER ----------------
app.listen(PORT, () => {
	console.log(`🚀 Birthday Reminder running at http://localhost:${PORT}`);
});
