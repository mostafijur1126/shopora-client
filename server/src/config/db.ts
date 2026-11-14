import mongoose from "mongoose";

export const connectDB = async (): Promise<void> => {
  const uri = (process.env as any).MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set in .env");
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(uri);
  console.log(
    `MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`,
  );

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected");
  });
};
