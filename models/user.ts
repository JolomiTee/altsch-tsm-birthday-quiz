import type { Request, Response } from "express";
import { app } from "..";
import mongoose, { Schema } from "mongoose";

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

export const User = mongoose.model<IUser>("User", UserSchema);