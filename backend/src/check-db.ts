import "./env.js";
import mongoose from "mongoose";

const databaseName = "vida";
const mongoUri = process.env.MONGODB_URI?.trim();

function describeUri(uri: string) {
  const protocolMatch = uri.match(/^mongodb(\+srv)?:\/\//);
  const protocol = protocolMatch?.[0] ?? "(unknown)";
  const withoutProtocol = uri.slice(protocol.length);
  const [beforeQuery, query = ""] = withoutProtocol.split("?");
  const [, hostAndPath = beforeQuery] = beforeQuery.split("@");
  const [hostList, pathDatabase = ""] = hostAndPath.split("/");
  const hosts = hostList.split(",").filter(Boolean);
  const params = new URLSearchParams(query);

  return {
    protocol,
    hosts: hosts.length,
    pathDatabase: pathDatabase || "(none)",
    authSource: params.get("authSource") ?? "(none)",
    tls:
      params.get("tls") ??
      params.get("ssl") ??
      "(not specified)",
    replicaSet: params.get("replicaSet") ?? "(none)",
  };
}

async function checkDB() {
  if (!mongoUri) {
    console.error("MONGODB_URI is not set.");
    process.exitCode = 1;
    return;
  }

  console.log("MONGODB_URI is set.");
  console.log("Connection metadata:", describeUri(mongoUri));

  try {
    await mongoose.connect(mongoUri, {
      dbName: databaseName,
      tls: true,
      serverSelectionTimeoutMS: 30000,
    });
    await mongoose.connection.db?.admin().ping();
    console.log(`MongoDB ping succeeded for database "${databaseName}".`);
  } catch (error) {
    console.error("MongoDB ping failed.");
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

checkDB();
