const express = require("express");
const router = express.Router();
const statusController = require("../controllers/statusController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

router
  .route("/")
  .post(statusController.createStatus)
  .get(statusController.getStatuses);

router.get("/me", statusController.getUserStatus);
router.patch("/:statusId/view", statusController.viewStatus);
router.delete("/:statusId", statusController.deleteStatus);

module.exports = router;
