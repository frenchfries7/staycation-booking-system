import BlockedDate from "../models/blockedDate.js";

export const createBlockedDate = async (req, res) => {
  try {
    const { startDate, endDate, reason, remarks } = req.body;

    if (!startDate || !endDate || !reason?.trim()) {
      return res.status(400).json({
        message: "Start date, end date, and reason are required.",
      });
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    const isValidDate = (value) => {
      if (!datePattern.test(value || "")) return false;

      const [year, month, day] = value.split("-").map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));

      return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
      );
    };

    if (!isValidDate(startDate) || !isValidDate(endDate) || !reason?.trim()) {
      return res.status(400).json({
        message: "Please provide valid dates and a reason.",
      });
    }

    const start = new Date(`${startDate}T00:00:00+08:00`);
    const end = new Date(
      new Date(`${endDate}T00:00:00+08:00`).getTime() + 24 * 60 * 60 * 1000 - 1,
    );

    if (start > end) {
      return res.status(400).json({
        message: "Invalid date range.",
      });
    }

    const existingBlock = await BlockedDate.findOne({
      startDate: { $lte: end },
      endDate: { $gte: start },
    });

    if (existingBlock) {
      return res.status(409).json({
        message: "The selected dates overlap an existing blocked date.",
      });
    }

    const blockedDate = await BlockedDate.create({
      startDate: start,
      endDate: end,
      reason: reason.trim(),
      remarks: remarks?.trim() || "",
      createdBy: req.user.userId,
    });

    return res.status(201).json({
      message: "Dates blocked successfully.",
      blockedDate,
    });
  } catch (error) {
    console.error("Create blocked date error:", error);
    return res.status(500).json({
      message: "Failed to block dates.",
    });
  }
};

export const getBlockedDates = async (req, res) => {
  try {
    const blockedDates = await BlockedDate.find()
      .populate("createdBy", "name email")
      .sort({ startDate: 1 });

    return res.status(200).json({ blockedDates });
  } catch (error) {
    console.error("Get blocked dates error:", error);
    return res.status(500).json({
      message: "Failed to retrieve blocked dates.",
    });
  }
};

export const updateBlockedDate = async (req, res) => {
  try {
    const { startDate, endDate, reason, remarks } = req.body;
    const { id } = req.params;

    if (!/^[a-f\d]{24}$/i.test(id)) {
      return res.status(400).json({
        message: "Invalid blocked date ID.",
      });
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    const isValidDate = (value) => {
      if (!datePattern.test(value || "")) return false;

      const [year, month, day] = value.split("-").map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));

      return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
      );
    };

    if (!isValidDate(startDate) || !isValidDate(endDate) || !reason?.trim()) {
      return res.status(400).json({
        message: "Please provide valid dates and a reason.",
      });
    }

    const start = new Date(`${startDate}T00:00:00+08:00`);
    const end = new Date(
      new Date(`${endDate}T00:00:00+08:00`).getTime() + 24 * 60 * 60 * 1000 - 1,
    );

    if (start > end) {
      return res.status(400).json({
        message: "Invalid date range.",
      });
    }

    const overlappingBlock = await BlockedDate.findOne({
      _id: { $ne: id },
      startDate: { $lte: end },
      endDate: { $gte: start },
    });

    if (overlappingBlock) {
      return res.status(409).json({
        message: "The selected dates overlap another blocked date.",
      });
    }

    const blockedDate = await BlockedDate.findByIdAndUpdate(
      id,
      {
        startDate: start,
        endDate: end,
        reason: reason.trim(),
        remarks: remarks?.trim() || "",
      },
      { new: true, runValidators: true },
    );

    if (!blockedDate) {
      return res.status(404).json({
        message: "Blocked date not found.",
      });
    }

    return res.status(200).json({
      message: "Blocked dates updated successfully.",
      blockedDate,
    });
  } catch (error) {
    console.error("Update blocked date error:", error);
    return res.status(500).json({
      message: "Failed to update blocked dates.",
    });
  }
};
export const deleteBlockedDate = async (req, res) => {
  try {
    const blockedDate = await BlockedDate.findByIdAndDelete(req.params.id);

    if (!blockedDate) {
      return res.status(404).json({
        message: "Blocked date not found.",
      });
    }

    return res.status(200).json({
      message: "Blocked dates removed successfully.",
    });
  } catch (error) {
    console.error("Delete blocked date error:", error);
    return res.status(500).json({
      message: "Failed to remove blocked dates.",
    });
  }
};
