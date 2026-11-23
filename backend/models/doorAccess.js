import mongoose from "mongoose";

const doorAccessSchema = new mongoose.Schema(
  {
    accessCode: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

const DoorAccess = mongoose.model("DoorAccess", doorAccessSchema);

export default DoorAccess;
