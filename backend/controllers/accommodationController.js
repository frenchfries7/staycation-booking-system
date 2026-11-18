import Accommodation from "../models/accommodation.js";

// CREATE / UPDATE VILLA AZORA
export const saveAccommodation = async (req, res) => {
  try {
    const { name, description, price, capacity, amenities, images } = req.body;

    if (!description || price === undefined || capacity === undefined) {
      return res.status(400).json({
        success: false,
        message: "Description, price, and capacity are required.",
      });
    }

    const accommodation = await Accommodation.findOneAndUpdate(
      {},
      {
        name: "Villa Azora",
        description,
        price,
        capacity,
        amenities,
        images,
        isActive: true,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    res.status(200).json({
      success: true,
      message: "Villa Azora details saved successfully.",
      accommodation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to save accommodation details.",
    });
  }
};

// GET VILLA AZORA DETAILS
export const getAccommodation = async (req, res) => {
  try {
    const accommodation = await Accommodation.findOne({ isActive: true });

    if (!accommodation) {
      return res.status(404).json({
        success: false,
        message: "Accommodation not found.",
      });
    }

    res.status(200).json({
      success: true,
      accommodation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve accommodation.",
    });
  }
};
