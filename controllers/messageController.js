// 📁 controllers/messageController.js - ✅ FIXED
// ============================================
const Message = require("../models/Message");
const User = require("../models/User");

// ✅ 📋 ყველა საუბრის (conversations) წამოღება
exports.getConversations = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id || req.user?._id;

    console.log('\n📥 === GET CONVERSATIONS ===');
    console.log('🆔 User ID:', userId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID is required - not authenticated properly"
      });
    }

    const messages = await Message.find({
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    })
    .sort({ createdAt: -1 })
    .populate('senderId', 'name email avatar')
    .populate('receiverId', 'name email avatar')
    .lean();

    console.log('📨 Found messages:', messages.length);

    if (messages.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    const conversationsMap = new Map();

    for (const message of messages) {
      if (!message.senderId || !message.receiverId) {
        console.warn('⚠️ Message with missing user data:', message._id);
        continue;
      }

      const isUserSender = message.senderId._id.toString() === userId.toString();
      const otherUserId = isUserSender 
        ? message.receiverId._id.toString() 
        : message.senderId._id.toString();
      
      const otherUser = isUserSender ? message.receiverId : message.senderId;

      if (!conversationsMap.has(otherUserId)) {
        conversationsMap.set(otherUserId, {
          _id: `${userId}_${otherUserId}`,
          id: `${userId}_${otherUserId}`,
          participants: [userId, otherUserId],
          otherUser: {
            id: otherUser._id.toString(),
            name: otherUser.name || 'Unknown User',
            email: otherUser.email || '',
            avatar: otherUser.avatar || null
          },
          lastMessage: {
            _id: message._id,
            senderId: message.senderId._id,
            receiverId: message.receiverId._id,
            content: message.content,
            read: message.read || false,
            createdAt: message.createdAt
          },
          unreadCount: 0,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt || message.createdAt
        });
      }
    }

    const conversations = Array.from(conversationsMap.values());
    
    for (let conversation of conversations) {
      const unreadCount = await Message.countDocuments({
        senderId: conversation.otherUser.id,
        receiverId: userId,
        read: false
      });
      conversation.unreadCount = unreadCount;
    }

    console.log('✅ Processed conversations:', conversations.length);

    res.json({
      success: true,
      data: conversations
    });

  } catch (err) {
    console.error('❌ Error in getConversations:', err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch conversations",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// 💬 საუბრის ყველა მესიჯის წამოღება
exports.getConversation = async (req, res) => {
  try {
    const { userId, otherId } = req.params;
    const authenticatedUserId = req.userId || req.user?.id || req.user?._id;
    
    console.log('\n💬 === GET CONVERSATION ===');
    console.log('Between:', userId, 'and', otherId);
    console.log('Authenticated user:', authenticatedUserId);

    // ✅ Security check - მომხმარებელს შეუძლია მხოლოდ საკუთარი მესიჯების ნახვა
    if (userId !== authenticatedUserId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own conversations"
      });
    }

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: otherId },
        { senderId: otherId, receiverId: userId }
      ]
    })
    .sort({ createdAt: 1 })
    .populate('senderId', 'name avatar')
    .populate('receiverId', 'name avatar');

    console.log('✅ Found messages:', messages.length);

    res.json({ 
      success: true, 
      data: messages 
    });
  } catch (err) {
    console.error('❌ Error in getConversation:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// 📩 მესიჯის გაგზავნა - ✅ FIXED VERSION
exports.sendMessage = async (req, res) => {
  try {
    // ✅ senderId წამოღება authentication-დან
    const senderId = req.userId || req.user?.id || req.user?._id;
    const { receiverId, content, productId } = req.body;
    
    console.log('\n📤 === SEND MESSAGE ===');
    console.log('From (authenticated):', senderId);
    console.log('To:', receiverId);
    console.log('Content:', content?.substring(0, 50));
    
    // ✅ Validation
    if (!senderId) {
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required - no sender ID" 
      });
    }

    if (!receiverId || !content) {
      return res.status(400).json({ 
        success: false, 
        message: "receiverId and content are required" 
      });
    }

    // ✅ შემოწმება რომ sender და receiver განსხვავებულები არიან
    if (senderId.toString() === receiverId.toString()) {
      return res.status(400).json({
        success: false,
        message: "Cannot send message to yourself"
      });
    }

    // ✅ შემოწმება რომ receiver არსებობს
    const receiverExists = await User.findById(receiverId);
    if (!receiverExists) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found"
      });
    }

    // ✅ შემოწმება რომ sender არსებობს
    const senderExists = await User.findById(senderId);
    if (!senderExists) {
      return res.status(404).json({
        success: false,
        message: "Sender not found"
      });
    }

    // ✅ მესიჯის შექმნა
    const message = await Message.create({ 
      senderId, 
      receiverId, 
      content: content.trim(), 
      productId: productId || null,
      read: false 
    });

    // ✅ Populate sender და receiver info
    await message.populate('senderId', 'name avatar');
    await message.populate('receiverId', 'name avatar');

    console.log('✅ Message sent successfully:', message._id);

    res.status(201).json({ 
      success: true, 
      data: message,
      message: "Message sent successfully"
    });
  } catch (err) {
    console.error('❌ Error in sendMessage:', err);
    
    // ✅ Better error handling
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: Object.values(err.errors).map(e => e.message)
      });
    }
    
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format"
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Failed to send message",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// 🔢 წაუკითხავი მესიჯების რაოდენობა
exports.getUnreadCount = async (req, res) => {
  try {
    const { userId } = req.params;
    const authenticatedUserId = req.userId || req.user?.id || req.user?._id;
    
    // ✅ Security check
    if (userId !== authenticatedUserId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own unread count"
      });
    }
    
    const count = await Message.countDocuments({ 
      receiverId: userId, 
      read: false 
    });
    
    console.log('📊 Unread count for', userId, ':', count);
    
    res.json({ 
      success: true, 
      unreadCount: count,
      count: count 
    });
  } catch (err) {
    console.error('❌ Error in getUnreadCount:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// ✅ საუბრის მესიჯების წაკითხულად მონიშვნა
exports.markAsRead = async (req, res) => {
  try {
    const { userId, otherId } = req.params;
    const authenticatedUserId = req.userId || req.user?.id || req.user?._id;
    
    console.log('\n✅ === MARK AS READ ===');
    console.log('Marking messages from', otherId, 'to', userId, 'as read');
    console.log('Authenticated user:', authenticatedUserId);

    // ✅ Security check
    if (userId !== authenticatedUserId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only mark your own messages as read"
      });
    }

    const result = await Message.updateMany(
      { 
        senderId: otherId, 
        receiverId: userId, 
        read: false 
      },
      { $set: { read: true } }
    );

    console.log('✅ Marked', result.modifiedCount, 'messages as read');

    res.json({ 
      success: true, 
      message: "Messages marked as read",
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    console.error('❌ Error in markAsRead:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// 🗑️ საუბრის წაშლა
exports.deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId || req.user?.id || req.user?._id;
    
    console.log('\n🗑️ === DELETE CONVERSATION ===');
    console.log('Conversation ID:', conversationId);
    console.log('User ID:', userId);

    const [user1, user2] = conversationId.split('_');

    if (!user1 || !user2) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID format"
      });
    }

    // ✅ Security check
    if (user1 !== userId.toString() && user2 !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this conversation"
      });
    }

    const result = await Message.deleteMany({
      $or: [
        { senderId: user1, receiverId: user2 },
        { senderId: user2, receiverId: user1 }
      ]
    });

    console.log('✅ Deleted', result.deletedCount, 'messages');

    res.json({ 
      success: true, 
      message: "Conversation deleted",
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error('❌ Error in deleteConversation:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};