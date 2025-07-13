const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.id) {
    req.userId = req.session.user.id;
    return next();
  }
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Invalid token' });
    req.userId = decoded.id;
    next();
  });
};
