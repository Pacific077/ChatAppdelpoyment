const asyncHandler = require("express-async-handler");
const Chat = require("../models/chatModel");
const User = require("../models/userModel");
const nodemailer = require("nodemailer");
//@description     Create or fetch One to One Chat
//@route           POST /api/chat/
//@access          Protected
const accessChat = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    console.log("UserId param not sent with request");
    return res.sendStatus(400);
  }

  var isChat = await Chat.find({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: req.user._id } } },
      { users: { $elemMatch: { $eq: userId } } },
    ],
  })
    .populate("users", "-password")
    .populate("latestMessage");

  isChat = await User.populate(isChat, {
    path: "latestMessage.sender",
    select: "name pic email",
  });

  if (isChat.length > 0) {
    res.send(isChat[0]);
  } else {
    var chatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [req.user._id, userId],
    };

    try {
      const createdChat = await Chat.create(chatData);
      const FullChat = await Chat.findOne({ _id: createdChat._id }).populate(
        "users",
        "-password"
      );
      res.status(200).json(FullChat);
    } catch (error) {
      res.status(400);
      throw new Error(error.message);
    }
  }
});

//@description     Fetch all chats for a user
//@route           GET /api/chat/
//@access          Protected
const fetchChats = asyncHandler(async (req, res) => {
  try {
    Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 })
      .then(async (results) => {
        results = await User.populate(results, {
          path: "latestMessage.sender",
          select: "name pic email",
        });
        res.status(200).send(results);
      });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

const sendMailtoAll = async(req,res)=>{
  var users = JSON.parse(req.body.users);
  console.log("useres in mail",users);
  // const user = await User.findById(users[0]);
  // console.log("Seatced user",user);
  var emailList = [];
  await Promise.all(users.map(async (u) => {
    var user = await User.findById(u);
    emailList.push(user.email);
  }));
  // console.log("list",emailList);
  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'rahmanfaisal516@gmail.com',
      pass: 'qzkj ckef wuhu egyc'
    }
  })
  
  console.log("emaillist",emailList);
  await Promise.all(emailList.map(async (email, ind) => {
    var mailOptions = {
      from: 'rahmanfaisal516@gmail.com',
      to: email,
      subject: 'Request to join the group',
      text: `You were requested to join the group, if you want to join the group please
      click on the link http://localhost:3000/joingrp/${req.chatId}/${users[ind]}`
    };
  
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent:', info.response);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }));
 console.log("reached the end of send mail")

}

//@description     Create New Group Chat
//@route           POST /api/chat/group
//@access          Protected
const createGroupChat = asyncHandler(async (req, res) => {
  if (!req.body.users || !req.body.name) {
    return res.status(400).send({ message: "Please Fill all the feilds" });
  }

  var users = JSON.parse(req.body.users);

  if (users.length < 2) {
    return res
      .status(400)
      .send("More than 2 users are required to form a group chat");
  }

  // users.push(req.user);

  try {
    const groupChat = await Chat.create({
      chatName: req.body.name,
      users: req.user,
      isGroupChat: true,
      groupAdmin: req.user,
    });
    req.chatId =await groupChat._id;
    await sendMailtoAll(req,res);
    console.log("after sending mail")
    const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    res.status(200).json(fullGroupChat);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// @desc    Rename Group
// @route   PUT /api/chat/rename
// @access  Protected
const renameGroup = asyncHandler(async (req, res) => {
  const { chatId, chatName } = req.body;

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      chatName: chatName,
    },
    {
      new: true,
    }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!updatedChat) {
    res.status(404);
    throw new Error("Chat Not Found");
  } else {
    res.json(updatedChat);
  }
});

// @desc    Remove user from Group
// @route   PUT /api/chat/groupremove
// @access  Protected
const removeFromGroup = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  // check if the requester is admin

  const removed = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: { users: userId },
    },
    {
      new: true,
    }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!removed) {
    res.status(404);
    throw new Error("Chat Not Found");
  } else {
    res.json(removed);
  }
});

// @desc    Add user to Group / Leave
// @route   PUT /api/chat/groupadd
// @access  Protected
const sendMailReq = async(req,res,next)=>{
  console.log("sending mail enetered")
  const { chatId, userId } = req.params;
  const user = await User.findById(userId);
  console.log("email user",user)
  const email = user.email;
  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'rahmanfaisal516@gmail.com',
      pass: 'qzkj ckef wuhu egyc'
    }
  })
  var mailOptions = {
    from: 'rahmanfaisal516@gmail.com',
    to: email,
    subject: 'Request to join the group',
    text: `You were requested to join the group,if you want to join the group please
    click on the link http://localhost:3000/joingrp/${chatId}/${userId}`
  };

  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
        // res.send(transporter.id);
      console.log('Email sent: ' + info.response);
    }
  });
  res.status(200).json({
    msg:"mail sent to user"
  })
}
const addToGroup = asyncHandler(async (req, res) => {
  console.log("sending to grp");
  const { chatId, userId } = req.params;

  // check if the requester is admin

  const added = await Chat.findByIdAndUpdate(
    chatId,
    {
      $push: { users: userId },
    },
    {
      new: true,
    }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!added) {
    res.status(404);
    throw new Error("Chat Not Found");
  } else {
    res.json(added);
  }
});

module.exports = {
  accessChat,
  fetchChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
  sendMailReq,sendMailtoAll
};
