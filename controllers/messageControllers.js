const asyncHandler = require("express-async-handler");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const Chat = require("../models/chatModel");
const schedule = require("node-schedule");

//@description     Get all Messages
//@route           GET /api/Message/:chatId
//@access          Protected
const allMessages = asyncHandler(async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "name pic email")
      .populate("chat");
    res.json(messages);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});
const handleMessages = async (req, res) => {
  try {
    let {scheduledTime} = req.body;
    console.log("schedu",scheduledTime);
    
    if (!scheduledTime) {
      console.log("Not schdeuled");
      sendMessage(req, res);
    } else {
      scheduledTime = new Date(scheduledTime);
      // console.log("schedule");
      const currentTime = new Date();
      const timeDifference = scheduledTime - currentTime;
      if (timeDifference > 0) {
        console.log("Scheduled");
        setTimeout(async () => {
          await sendMessage(req, res);
        }, timeDifference);
      } else {
        throw new Error("invalid time")
       
      }
    }
  } catch (error) {
    res.status(500).json({ error: "something went Wrong" });
  }
};
//@description     Create New Message
//@route           POST /api/Message/
//@access          Protected
const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId } = req.body;

  if (!content || !chatId) {
    console.log("Invalid data passed into request");
    return res.sendStatus(400);
  }

  var newMessage = {
    sender: req.user._id,
    content: content,
    chat: chatId,
  };

  try {
    var message = await Message.create(newMessage);

    message = await message.populate("sender", "name pic").execPopulate();
    message = await message.populate("chat").execPopulate();
    message = await User.populate(message, {
      path: "chat.users",
      select: "name pic email",
    });

    await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

    res.json(message);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

module.exports = { allMessages, sendMessage, handleMessages };
