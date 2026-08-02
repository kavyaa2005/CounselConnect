const authService = require('../services/auth.service');
const { success } = require('../utils/response.utils');
const path = require('path');

const getProfile = (req, res, next) => {
  try {
    const user = authService.getUserById(req.user.id);
    return success(res, { user });
  } catch (err) { next(err); }
};

const updateProfile = (req, res, next) => {
  try {
    const user = authService.updateUserProfile(req.user.id, req.body);
    return success(res, { user }, 'Profile updated');
  } catch (err) { next(err); }
};

const uploadPhoto = (req, res, next) => {
  try {
    if (!req.file) {
      const err = new Error('No file uploaded'); err.statusCode = 400; throw err;
    }
    const avatarUrl = `/uploads/${req.file.filename}`;
    const user = authService.updateUserProfile(req.user.id, { avatar: avatarUrl });
    return success(res, { user, avatarUrl }, 'Photo uploaded');
  } catch (err) { next(err); }
};

const updateNotifications = (req, res, next) => {
  try {
    const prefs = authService.updateNotifications(req.user.id, req.body);
    return success(res, { notifications: prefs }, 'Notification preferences updated');
  } catch (err) { next(err); }
};

const updatePrivacy = (req, res, next) => {
  try {
    const prefs = authService.updatePrivacy(req.user.id, req.body);
    return success(res, { privacy: prefs }, 'Privacy settings updated');
  } catch (err) { next(err); }
};

const deleteAccount = (req, res, next) => {
  try {
    authService.deleteUser(req.user.id);
    return success(res, {}, 'Account deleted');
  } catch (err) { next(err); }
};


const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await require('../services/auth.service').changePassword(req.user.id, 'user', currentPassword, newPassword);
    return success(res, {}, 'Password changed successfully');
  } catch (err) { next(err); }
};

module.exports = { getProfile, updateProfile, uploadPhoto, updateNotifications, updatePrivacy, deleteAccount,
  changePassword,
};
