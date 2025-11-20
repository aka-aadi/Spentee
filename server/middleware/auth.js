const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    // Support both cookie-based sessions (web) and header-based session ID (React Native)
    let sessionId = null;
    
    // Check for session ID in custom header (for React Native)
    if (req.headers['x-session-id']) {
      sessionId = req.headers['x-session-id'];
      console.log('Authenticating with session ID:', sessionId);
      
      // Load session by ID using promise
      const session = await new Promise((resolve, reject) => {
        req.sessionStore.get(sessionId, (err, session) => {
          if (err) {
            console.error('Session store get error:', err);
            reject(err);
          } else {
            console.log('Session retrieved:', session ? 'found' : 'not found');
            if (session) {
              console.log('Session userId:', session.userId);
            }
            resolve(session);
          }
        });
      });

      if (!session || !session.userId) {
        console.log('Session invalid or missing userId');
        return res.status(401).json({ message: 'Not authenticated. Please login again.' });
      }

      // Properly restore session to req.session
      // We need to ensure express-session recognizes this as a valid session object
      // Instead of directly assigning, we'll create a session-like object with required methods
      req.sessionID = sessionId;
      
      // Create a proper session object that express-session can work with
      // We need to add methods that express-session expects
      // Store reference to original session for save operations
      const originalSession = session;
      
      // Create session object with all data and required methods
      const sessionObj = Object.assign({}, session);
      
      // Add required session methods that express-session expects
      sessionObj.touch = function() {
        // Touch is called to update session timestamp - just return this
        return this;
      };
      
      sessionObj.save = function(cb) {
        // Save uses the current session object state
        const dataToSave = Object.assign({}, this);
        // Remove methods before saving
        delete dataToSave.touch;
        delete dataToSave.save;
        delete dataToSave.reload;
        delete dataToSave.destroy;
        delete dataToSave.regenerate;
        
        if (cb) {
          req.sessionStore.set(sessionId, dataToSave, cb);
        } else {
          return new Promise((resolve, reject) => {
            req.sessionStore.set(sessionId, dataToSave, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }
      };
      
      sessionObj.reload = function(cb) {
        if (cb) {
          req.sessionStore.get(sessionId, (err, sess) => {
            if (err) {
              cb(err);
            } else {
              Object.assign(sessionObj, sess);
              cb(null, sess);
            }
          });
        } else {
          return new Promise((resolve, reject) => {
            req.sessionStore.get(sessionId, (err, sess) => {
              if (err) reject(err);
              else {
                Object.assign(sessionObj, sess);
                resolve(sess);
              }
            });
          });
        }
      };
      
      sessionObj.destroy = function(cb) {
        if (cb) {
          req.sessionStore.destroy(sessionId, cb);
        } else {
          return new Promise((resolve) => {
            req.sessionStore.destroy(sessionId, resolve);
          });
        }
      };
      
      sessionObj.regenerate = function(cb) {
        // Regenerate creates a new session ID - not needed for our use case
        if (cb) cb();
      };
      
      // Set the session on request
      req.session = sessionObj;

      // Fetch user from database
      const user = await User.findById(session.userId).select('-password');
      
      if (!user) {
        console.log('User not found for session userId:', session.userId);
        // User was deleted but session still exists - destroy session
        await new Promise((resolve) => {
          req.sessionStore.destroy(sessionId, resolve);
        });
        return res.status(401).json({ message: 'User not found. Please login again.' });
      }

      // Attach user to request object
      req.user = user;
      console.log('Authentication successful for user:', user.username);
      next();
    } else {
      // Cookie-based session (web)
      console.log('Cookie-based session check:', {
        hasSession: !!req.session,
        sessionId: req.sessionID,
        hasUserId: !!(req.session && req.session.userId),
        cookies: req.headers.cookie ? 'present' : 'missing',
        cookieHeader: req.headers.cookie,
        sessionData: req.session ? Object.keys(req.session) : 'no session'
      });
      
      if (!req.session || !req.session.userId) {
        console.log('Cookie session invalid or missing userId');
        return res.status(401).json({ message: 'Not authenticated. Please login again.' });
      }

      // Fetch user from database
      const user = await User.findById(req.session.userId).select('-password');
      
      if (!user) {
        console.log('User not found for session userId:', req.session.userId);
        // User was deleted but session still exists - destroy session
        req.session.destroy();
        return res.status(401).json({ message: 'User not found. Please login again.' });
      }

      // Attach user to request object
      req.user = user;
      console.log('Cookie-based authentication successful for user:', user.username);
      next();
    }
  } catch (error) {
    console.error('Authentication error:', error);
    console.error('Error stack:', error.stack);
    res.status(401).json({ message: 'Authentication failed. Please login again.' });
  }
};

module.exports = { authenticate };


