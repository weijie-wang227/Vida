import { connectDB, disconnectDB } from "./db.js";
import { reconcileParticipationCounters } from "./services/participationReconciliation.js";

async function main() {
  const connected = await connectDB();

  if (!connected) {
    throw new Error("MongoDB is not configured.");
  }

  const result = await reconcileParticipationCounters();

  console.log(
    `Reconciled ${result.participations} participations across ${result.sessions} sessions, ${result.activities} activities, and ${result.users} users.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB();
  });
