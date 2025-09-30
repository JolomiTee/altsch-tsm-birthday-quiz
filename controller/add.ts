import type { Request, Response } from "express";
import { User } from "../models/user";

interface AddUserBody {
	username: string;
	email: string;
	dob: string;
}

export const addController = async (req: Request<{}, {}, AddUserBody>, res: Response) => {
	const { username, email, dob } = req.body;

	if (!username || !email || !dob) {
		return res.send("All fields are required!");
	}

	try {
		const user = new User({ username, email, dob: new Date(dob) });
		await user.save();
		res.send("✅ User created!, we will remind you of your birthday");
	} catch (err: any) {
		if (err.code === 11000) {
			res.send("⚠️ Email already exists!");
		} else {
			res.send("❌ Error: " + err.message);
		}
	}
}