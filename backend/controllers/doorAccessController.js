import DoorAccess from "../models/doorAccess.js";

export const getDoorAccess = async (req, res) => {
  try {
    const doorAccess = await DoorAccess.findOne();

    if (!doorAccess) {
      return res.status(404).json({
        success: false,
        message: "Door access configuration not found.",
      });
    }

    return res.status(200).json({
      success: true,
      doorAccess,
    });
  } catch (error) {
    console.error("Get door access error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve door access.",
    });
  }
};

export const updateDoorAccess = async (req, res) => {
  try {
    const { accessCode } = req.body;

    if (!accessCode || !accessCode.trim()) {
      return res.status(400).json({
        success: false,
        message: "Door access password is required.",
      });
    }

    const doorAccess = await DoorAccess.findOneAndUpdate(
      {},
      { accessCode: accessCode.trim() },
      { new: true, runValidators: true },
    );

    if (!doorAccess) {
      return res.status(404).json({
        success: false,
        message: "Door access configuration not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Door access password updated successfully.",
    });
  } catch (error) {
    console.error("Update door access error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update door access.",
    });
  }
};
