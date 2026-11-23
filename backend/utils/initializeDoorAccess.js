import DoorAccess from "../models/doorAccess.js";

const initializeDoorAccess = async () => {
  const existingDoorAccess = await DoorAccess.findOne();

  if (existingDoorAccess) {
    return;
  }

  if (!process.env.DOOR_LOCK_PASSWORD) {
    throw new Error("DOOR_LOCK_PASSWORD is missing in .env");
  }

  await DoorAccess.create({
    accessCode: process.env.DOOR_LOCK_PASSWORD,
  });

  console.log("Default door access initialized.");
};

export default initializeDoorAccess;
