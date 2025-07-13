const User = require('../models/User');
const bcrypt = require('bcryptjs');
const Feedback = require('../models/feedbackForm');

exports.signup = async (req, res) => {
  const { name, username, password } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).send('Username already exists');

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, username, password: hashedPassword });
    await newUser.save();
    res.redirect('/index.html');
  } catch (err) {
    console.error(err);
    res.status(500).send('Signup failed');
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).send('Invalid credentials');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).send('Invalid credentials');

    req.session.user = {
      id: user._id,
      name: user.name,
      username: user.username,
    };
    req.session.isAuthenticated = true;

    res.redirect(`/chat.html`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Login failed');
  }
};

exports.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send('Logout failed');
    if (req.method === 'POST') return res.status(200).end();
    res.redirect('/login.html');
  });
};

exports.feedback = async (req, res) => {
  try {
    const { name, email, feedback } = req.body;
    const newFeedback = new Feedback({ name, email, feedback });
    await newFeedback.save();
    res.status(201).json({ message: 'Feedback submitted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
