const db = require('../models');
const { Course, User } = db;
const bcryptjs = require('bcryptjs');
const auth = require('basic-auth');


// Authenticate header name and password for routes:
    // GET /api/users
    // POST /api/courses
    // PUT /api/courses/:id
    // DELETE /api/courses/:id

const authenticateUser = async (req, res, next) => {
    let message = null;

    // Parse credentials from Auth header
    const credentials = auth(req);

    if (credentials) {
        // if credentials are available
        // attempt to retrieve user from database
        let user = await User.findAll({
            where: {
                emailAddress: credentials.name
            }
        });
        
        if (user) {
            // set user equal to user dataValues
            user = user[0].dataValues;
            // confirm passwords match
            const authenticated = bcryptjs
                .compareSync(credentials.pass, user.password);

            if (authenticated) {
                // set currentUser as authenticated user
                req.currentUser = user;
            } else {
                message = `Authentication failure for username: ${user.username}`;
            }
        } else {
            message = `User not found for username: ${credentials.mame}`;
        }
    } else {
        message = `Auth header not found`;
    }
    if (message) {
        // Access Denied if Authentication fails
        console.warn(message);
    
        res.status(401).json({message: `Access Denied `});
    } else {
        next();
    }
};

module.exports = { authenticateUser };