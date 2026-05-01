import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;

    if (!uri) {
      throw new Error("❌ Missing MONGO_URI environment variable");
    }

    // Optional: remove strictQuery warning
    mongoose.set("strictQuery", true);

    mongoose.connection.on("connected", () => {
      console.log("✅ Database connected");
    });

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB error:", err.message);
    });

    // Connect to MongoDB
    await mongoose.connect(uri);

  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    
    // ❗ DO NOT crash server in production (important for Render)
    // process.exit(1);  ← remove this
  }
};

export default connectDB;