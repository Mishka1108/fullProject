//controllers/userController.js
const User = require('../models/User');

exports.updateProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }
    
    console.log('File uploaded to Cloudinary:', req.file); // Debug log
    
    // Cloudinary returns the URL in req.file.path
    const imageUrl = req.file.path;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profileImage: imageUrl },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('User updated with new image:', user); // Debug log
    
    res.status(200).json({ 
      message: 'Profile image updated successfully', 
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        secondName: user.secondName,
        phone: user.phone,
        personalNumber: user.personalNumber,
        dateOfBirth: user.dateOfBirth,
        isVerified: user.isVerified,
        profileImage: user.profileImage
      }
    });
  } catch (error) {
    console.error('Error updating profile image:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add a method to get current user data
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ message: 'Server error' });
  }
};