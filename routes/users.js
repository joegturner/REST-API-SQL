'use strict';

// import modules
const express = require('express');
const bcryptjs = require('bcryptjs');
const router = express.Router();
const { check, validationResult } = require('express-validator/check');

// import models
const db = require('../models');
const { Course, User } = db;

// import authenticator
const authenticateUser = require('../js/authenticate').authenticateUser;

// async try catch handler
function asyncHandler(cb) {
    return async (req, res, next) => {
        try {
            await cb(req, res, next);
        } catch(error) {
            next(error);
        }
    }
}

// GET /api/users 200 - 
// Returns the currently authenticated user
router.get('/', authenticateUser, asyncHandler(async (req, res) => {
    let user = await User.findAll({
        attributes: [
            "id",
            "firstName",
            "lastName",
            "emailAddress"
        ],
        where: {
            id: req.currentUser.id
        }
    });
    const courses = await Course.findAll({
        attributes: [
            "id",
            "title",
            "description",
            "estimatedTime",
            "materialsNeeded"
        ],
        where: {
            userId: req.currentUser.id
        }
    });

    user = {user, courses};
    res.status(200).json(user);
}));

// POST /api/users 201 - 
// Creates a user, sets the Location header to "/", and returns no content
router.post('/', [
    check('firstName')
        .exists({ checkNull: true, checkFalsy: true })
        .withMessage('Please provide a value for "firstName"'),
    check('lastName')
        .exists({ checkNull: true, checkFalsy: true })
        .withMessage('Please provide a value for "lastName"'),
    check('emailAddress')
        .exists({ checkNull: true, checkFalsy: true })
        .withMessage('Please provide a value for "emailAddress"')
        .isEmail()
        .withMessage('Please provide a valie email address for "emailAddress"')
        .custom(async (email, { req }) => {
            const users = await User.findAll({attributes: ["emailAddress"]});
            const emails = users.map(user => user.dataValues.emailAddress);
            if(emails.includes(email)) {
                throw new Error('email already exists');
            }
            return true;
        }),
    check('password')
        .exists({ checkNull: true, checkFalsy: true })
        .withMessage('Please provide a value for "password"'),
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg);

        res.status(400).json({ errors: errorMessages });
    } else {
        const user = await User.build(req.body);

        user.password = bcryptjs.hashSync(req.body.password);
        await user.save();
    
        res.status(201).location('/').end();
    }
}));

module.exports = router;