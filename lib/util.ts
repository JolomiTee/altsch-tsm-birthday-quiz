import cron from "node-cron";
import { Resend } from "resend";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { User } from "../models/user";

let resendClient: Resend | null = null;
let nodemailerTransporter: Transporter | null = null;

function getEmailClient() {
	if (process.env.NODE_ENV === "production") {
		if (!resendClient) {
			resendClient = new Resend(process.env.RESEND_API_KEY);
		}
		return { type: "resend" as const, client: resendClient };
	} else {
		if (!nodemailerTransporter) {
			nodemailerTransporter = nodemailer.createTransport({
				service: "gmail",
				auth: {
					user: process.env.EMAIL_BOX,
					pass: process.env.MAILER_PASS,
				},
			});
		}
		return { type: "nodemailer" as const, client: nodemailerTransporter };
	}
}

async function sendEmail(
	subject: string,
	body: string,
	recipient: string
): Promise<void> {
	const emailClient = getEmailClient();

	if (emailClient.type === "resend") {
		const { data, error } = await emailClient.client.emails.send({
			from: process.env.EMAIL_BOX as string,
			to: recipient,
			subject,
			html: body,
		});

		if (error) {
			console.error("Resend error:", error);
			throw new Error(`Failed to send email via Resend: ${error.message}`);
		}
		console.log("Resend response:", data);
	} else {
		try {
			const info = await emailClient.client.sendMail({
				from: process.env.EMAIL_BOX,
				to: recipient,
				subject,
				html: body,
			});
			console.log("Nodemailer info:", info.response);
		} catch (error) {
			console.error("Nodemailer error:", error);
			throw error;
		}
	}
}

export const runCronJob = () => {
	cron.schedule("0 7 * * *", async () => {
		console.log("Birthday cron job started at", new Date().toISOString());

		try {
			const today = new Date();
			const todayMonth = today.getMonth() + 1; // Convert to 1-indexed for DB query
			const todayDate = today.getDate();

			// Optimized query: only fetch users with today's birthday
			const celebrants = await User.find({
				$expr: {
					$and: [
						{ $eq: [{ $month: "$dob" }, todayMonth] },
						{ $eq: [{ $dayOfMonth: "$dob" }, todayDate] },
					],
				},
			})
				.select("username email dob")
				.lean(); // Use lean() for plain objects

			console.log(`Found ${celebrants.length} birthday celebrant(s)`);

			// Process emails with concurrency limit to avoid overwhelming the email service
			const BATCH_SIZE = 5;
			for (let i = 0; i < celebrants.length; i += BATCH_SIZE) {
				const batch = celebrants.slice(i, i + BATCH_SIZE);
				await Promise.allSettled(
					batch.map(async (user) => {
						try {
							await sendEmail(
								"Happy Birthday!",
								`<h2>Happy Birthday, ${user.username}!</h2>
								<p>We wish you a wonderful year ahead filled with joy and success.</p>`,
								user.email
							);
							console.log("Birthday email sent to", user.email);
						} catch (error) {
							console.error(
								`Failed to send email to ${user.email}:`,
								error
							);
						}
					})
				);
			}

			console.log("Birthday cron job completed successfully");
		} catch (err) {
			console.error("Cron job failed:", err);
		}
	});

	console.log("Birthday cron job scheduled: Daily at 7:00 AM");
};

// Optional: Cleanup function for graceful shutdown
export const cleanupEmailClients = () => {
	if (nodemailerTransporter) {
		nodemailerTransporter.close();
		nodemailerTransporter = null;
	}
	// Resend doesn't need explicit cleanup
	resendClient = null;
};
