import nodemailer from "nodemailer";
import createHttpError from "http-errors";
import { Resend } from "resend";

export async function sendEmail(
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
			console.error("Resend error:", error);
			throw createHttpError(500, error || "Failed to send email");
		}
		console.log({ data });
	} else {
		// Use Nodemailer + Gmail SMTP in development
		const transporter = nodemailer.createTransport({
			service: "gmail",
			auth: {
				user: process.env.EMAIL_BOX,
				pass: process.env.MAILER_PASS,
			},
		});
		try {
			const info = await transporter.sendMail({
				from: process.env.EMAIL_BOX,
				to: recipient,
				subject,
				html: body,
			});
			console.log("Nodemailer info:", info);
		} catch (error) {
			console.error("Nodemailer error:", error);
			throw createHttpError(500, "Failed to send email via Gmail SMTP");
		}
	}
}
