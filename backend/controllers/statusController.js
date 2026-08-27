const Status = require("../models/Status");
const { uploadOnCloudinary } = require("../config/cloudinaryConfig");
const response = require("../utils/responseHandler");

const getUserId = (req) => {
  return req.user?.userId || req.user?._id || req.user?.id;
};

exports.createStatus = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return response(res, 401, "Unauthorized: User ID missing");
    }

    const { content, contentType } = req.body;
    const file = req.file;

    let finalContent = content;
    let finalContentType = contentType || "text";

    if (file) {
      const uploadResult = await uploadOnCloudinary(file);
      if (uploadResult?.secure_url) {
        finalContent = uploadResult.secure_url;
      }
      if (file.mimetype) {
        if (file.mimetype.startsWith("image/")) {
          finalContentType = "image";
        } else if (file.mimetype.startsWith("video/")) {
          finalContentType = "video";
        }
      }
    }

    if (!finalContent || !finalContent.trim()) {
      return response(res, 400, "Status content or file is required");
    }

    const newStatus = new Status({
      user: userId,
      content: finalContent,
      contentType: finalContentType,
      viewers: [],
    });

    await newStatus.save();

    const populatedStatus = await Status.findById(newStatus._id).populate(
      "user",
      "username profilePicture phoneNumber"
    );

    return response(res, 201, "Status created successfully", populatedStatus);
  } catch (error) {
    console.error("Error in createStatus:", error);
    return response(res, 500, "Failed to create status", { error: error.message });
  }
};


exports.getStatuses = async (req, res) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const statuses = await Status.find({
      createdAt: { $gte: twentyFourHoursAgo },
    })
      .populate("user", "username profilePicture phoneNumber isOnline lastSeen")
      .populate("viewers", "username profilePicture")
      .sort({ createdAt: -1 });

    const groupedMap = {};
    statuses.forEach((status) => {
      if (!status.user) return;
      const statusUserId = status.user._id.toString();

      if (!groupedMap[statusUserId]) {
        groupedMap[statusUserId] = {
          user: status.user,
          statuses: [],
        };
      }
      groupedMap[statusUserId].statuses.push(status);
    });

    const result = Object.values(groupedMap);

    return response(res, 200, "Statuses fetched successfully", result);
  } catch (error) {
    console.error("Error in getStatuses:", error);
    return response(res, 500, "Failed to fetch statuses", { error: error.message });
  }
};

exports.getUserStatus = async (req, res) => {
  try {
    const userId = getUserId(req);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const myStatuses = await Status.find({
      user: userId,
      createdAt: { $gte: twentyFourHoursAgo },
    })
      .populate("viewers", "username profilePicture phoneNumber")
      .sort({ createdAt: -1 });

    return response(res, 200, "My statuses fetched successfully", myStatuses);
  } catch (error) {
    console.error("Error in getUserStatus:", error);
    return response(res, 500, "Failed to fetch user status", { error: error.message });
  }
};

exports.viewStatus = async (req, res) => {
  try {
    const { statusId } = req.params;
    const userId = getUserId(req);

    const status = await Status.findById(statusId);
    if (!status) {
      return response(res, 404, "Status not found");
    }

    if (!status.viewers.includes(userId)) {
      status.viewers.push(userId);
      await status.save();
    }

    const updatedStatus = await Status.findById(statusId)
      .populate("user", "username profilePicture")
      .populate("viewers", "username profilePicture");

    return response(res, 200, "Status marked as viewed", updatedStatus);
  } catch (error) {
    console.error("Error in viewStatus:", error);
    return response(res, 500, "Failed to mark status as viewed", { error: error.message });
  }
};

exports.deleteStatus = async (req, res) => {
  try {
    const { statusId } = req.params;
    const userId = getUserId(req);

    const status = await Status.findById(statusId);
    if (!status) {
      return response(res, 404, "Status not found");
    }

    if (status.user.toString() !== userId.toString()) {
      return response(res, 403, "Unauthorized: You can only delete your own status");
    }

    await status.deleteOne();

    return response(res, 200, "Status deleted successfully", { statusId });
  } catch (error) {
    console.error("Error in deleteStatus:", error);
    return response(res, 500, "Failed to delete status", { error: error.message });
  }
};

