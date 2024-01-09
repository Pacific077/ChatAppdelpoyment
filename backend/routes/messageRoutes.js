const express = require("express");
const {
  allMessages,
  sendMessage,
  handleMessages,
} = require("../controllers/messageControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/:chatId").get(protect, allMessages);
router.route("/").post(protect, handleMessages);

module.exports = router;
