// MongoDB Atlas Scheduled Trigger function.
//
// Suggested trigger settings:
// - Type: Scheduled
// - Schedule: every minute
// - Advanced CRON equivalent: * * * * *
// - Authentication: System
//
// If your linked Atlas data source is not named "mongodb-atlas", replace the
// service name below with the name shown in your Atlas trigger configuration.
exports = async function () {
  const mongodb = context.services.get("mongodb-atlas");
  const sessions = mongodb.db("vida").collection("sessions");
  const now = new Date();

  const result = await sessions.updateMany(
    {
      isActive: true,
      endAt: { $type: "date", $lte: now },
    },
    {
      $set: {
        isActive: false,
        updatedAt: now,
      },
    },
  );

  console.log(
    `Deactivated ${result.modifiedCount} of ${result.matchedCount} expired sessions.`,
  );

  return {
    checkedAt: now,
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  };
};
