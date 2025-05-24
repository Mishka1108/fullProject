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

// Get current user data
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

// NEW: Update user profile information
exports.updateProfile = async (req, res) => {
  try {
    const { name, secondName, phone, personalNumber, dateOfBirth } = req.body;
    
    // Validation
    const errors = [];
    
    // ვალიდაცია phone-ისთვის
    if (phone) {
      // ტელეფონი უნდა იყოს რიცხვები და შეიძლება დაიწყოს +ით
      const phoneRegex = /^\+?[0-9]{9,15}$/;
      if (!phoneRegex.test(phone.toString())) {
        errors.push('ტელეფონის ნომერი არასწორია');
      }
    }
    
    // ვალიდაცია personalNumber-ისთვის
    if (personalNumber) {
      // პირადი ნომერი უნდა იყოს 11 ციფრი (საქართველოსთვის)
      const personalNumberRegex = /^[0-9]{11}$/;
      if (!personalNumberRegex.test(personalNumber.toString())) {
        errors.push('პირადი ნომერი უნდა შედგებოდეს 11 ციფრისგან');
      }
    }
    
    // ვალიდაცია dateOfBirth-ისთვის
    if (dateOfBirth) {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (birthDate > today) {
        errors.push('დაბადების თარიღი არ შეიძლება იყოს მომავალში');
      } else if (age < 13) {
        errors.push('ასაკი უნდა იყოს მინიმუმ 13 წელი');
      } else if (age > 120) {
        errors.push('გთხოვთ შეიყვანოთ სწორი დაბადების თარიღი');
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ 
        message: 'ვალიდაციის შეცდომა',
        errors 
      });
    }
    
    // Update user data
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (secondName) updateData.secondName = secondName.trim();
    if (phone) updateData.phone = phone;
    if (personalNumber) updateData.personalNumber = personalNumber;
    if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({
      message: 'პროფილი წარმატებით განახლდა',
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
    console.error('Error updating profile:', error);
    
    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        message: 'ვალიდაციის შეცდომა',
        errors: messages
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      let message = 'ამ მონაცემებით უკვე არსებობს მომხმარებელი';
      
      if (field === 'phone') {
        message = 'ეს ტელეფონის ნომერი უკვე გამოყენებულია';
      } else if (field === 'personalNumber') {
        message = 'ეს პირადი ნომერი უკვე გამოყენებულია';
      }
      
      return res.status(400).json({ message });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};