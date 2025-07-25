const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.delete('/delete-account', authController.deleteAccount);
router.post('/feedback', authController.feedback);

module.exports = router;
