import mongoose from "mongoose";

export const connDb = async () => {
	const MONGO_URI = process.env.MONGO_URI;


	try {
		if (!MONGO_URI) {
			throw new Error("Unset environment variables");
		}
		mongoose.set("debug", false);

		await mongoose.connect(MONGO_URI);

		console.log("Database Active");
	} catch (error) {
		console.error(
			`Error connecting to Database : ${
				error instanceof Error ? error.message : error
			}`
		);
		process.exit(1);
	}

	mongoose.connection.on("error", (err) => {
		console.error("MongoDB connection error:", err);
	});

	process.on("SIGINT", async () => {
		await mongoose.connection.close();
		console.log("MongoDB connection closed due to app termination");
		process.exit(0);
	});
};
