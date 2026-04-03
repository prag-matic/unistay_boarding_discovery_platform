import mongoose, { type ClientSession } from "mongoose";

const MONGODB_URI =
	process.env.MONGODB_URI || "mongodb://localhost:27017/unistay_db";

export async function connectDB(): Promise<void> {

	try {
		await mongoose.connect(MONGODB_URI);
		console.log(
			`[MongoDB] Connected to ${mongoose.connection.host}:${mongoose.connection.port}/${mongoose.connection.name}`,
		);
	} catch (error) {
		console.error("[MongoDB] Connection error:", error);
		process.exit(1);
	}
}

export function supportsMongoTransactions(): boolean {
	const topologyType = (mongoose.connection as any)?.client?.topology?.description?.type;
	return topologyType === "ReplicaSetWithPrimary" || topologyType === "Sharded";
}

export async function withMongoTransaction<T>(
	operation: (session?: ClientSession) => Promise<T>,
): Promise<T> {
	if (!supportsMongoTransactions()) {
		return operation(undefined);
	}

	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		const result = await operation(session);
		await session.commitTransaction();
		return result;
	} catch (error) {
		await session.abortTransaction();
		throw error;
	} finally {
		session.endSession();
	}
}

export async function disconnectDB(): Promise<void> {
	try {
		await mongoose.disconnect();
		console.log("[MongoDB] Disconnected");
	} catch (error) {
		console.error("[MongoDB] Disconnect error:", error);
	}
}

export default mongoose;
