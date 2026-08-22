const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { uploadFileToCloudinary } = require('../utils/cloudinary');
const response = require('../utils/responseHandler');


exports.sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, content, messageStatus } = req.body;
    const file = req.file;

    const participant = { senderId, receiverId }.sort().join('-');


    // check if a conversation already exists between the participants
    let conversation = await Conversation.findOne({ participants:participants });

    if (!conversation) {
      // create a new conversation if it doesn't exist
      conversation = new Conversation({
        participants: [senderId, receiverId],
        lastMessage: null,
        unreadCount: 0,
      });
      await conversation.save();
    }

    let imageOrVideoUrl = null;
    let contentType = null;

    if (file) {
      const uploadFile= await uploadFileToCloudinary(file);
      if (uploadFile?.secure_url) {
        return res.status(400).json({ error: 'File upload failed' });
      }
      imageOrVideoUrl = uploadFile?.secure_url;

      if (file.mimetype.startsWith('image/')) {
        contentType = 'image';
      } else if (file.mimetype.startsWith('video/')) {
        contentType = 'video';
      } 
      else {
        return res.status(400).json({ error: 'Invalid file type. Only images and videos are allowed.' });
      }
    }
      else if (!content?.trim()) {
        contentType = 'text';
      } else { return res.status(400).json({ error: 'Message content is required' });
    }


  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
}