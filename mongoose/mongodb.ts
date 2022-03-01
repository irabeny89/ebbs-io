import mongoose, { connect } from "mongoose";
import config from "../config";

const { dbUrl } = config.environmentVariable;

const dbConnection = async () => {
  if (mongoose.connections[0].readyState !== 1) {
    try {
      mongoose.set("debug", process.env.NODE_ENV === "development");
      await connect(dbUrl);
    } catch (err: any) {
      console.error(err.message);
      process.exit(1);
    }
  }
};

mongoose.connection.once("open", () =>
  console.log("Database connected: %s", dbUrl)
);

export default dbConnection;
