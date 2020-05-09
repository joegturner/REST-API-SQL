'user strict';

// import modules
const express = require('express');
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

// GET /api/courses 200 - Returns a list of courses (including the user that owns each course)
router.get('/', asyncHandler(async (req,res) => {
    const courses = await Course.findAll({
        attributes: [
            "id",
            "title",
            "description",
            "estimatedTime",
            "materialsNeeded"
        ],
        include: {
            model: User,
            as: 'user',
            attributes: [
                "id",
                "firstName",
                "lastName",
                "emailAddress"
            ],
        }
    });
    if (courses) {
        res.status(200).json(courses);
    } else {
        res.status(404).json({message: "Courses were not found"});
    }
}));

// GET /api/courses/:id 200 - Returns a the course (including the user that owns the course) for the provided course ID
router.get('/:id', asyncHandler(async (req, res) => {
    const course = await Course.findByPk(req.params.id, {
        attributes: ["id",
            "title",
            "description",
            "estimatedTime",
            "materialsNeeded"
        ],
        include: {
            model: User,
            as: 'user',
            attributes: [
                "id",
                "firstName",
                "lastName",
                "emailAddress"
            ],
        }
    });

    if (course) {
        res.status(200).json(course);
    } else {
        res.status(404).json({message: `Course #${req.params.id} was not found`}).end();
    }
}));

// POST /api/courses 201 - Creates a course, sets the Location header to the URI for the course, and returns no content
router.post('/', authenticateUser, asyncHandler(async (req, res) => {
    const course = await Course.build(req.body);
    course.userId = req.currentUser.id;
    await course.save();
    res.status(201).location(`/${course.id}`).end();
}));

// PUT /api/courses/:id 204 - Updates a course and returns no content
router.put('/:id', [
    check('title')
        .exists({ checkNull: true, checkFalsy: true })
        .withMessage('Please provide a value for "title"'),
    check('description')
        .exists({ checkNull: true, checkFalsy: true })
        .withMessage('Please provide a value for "description"'),
], authenticateUser, asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg);

        res.status(400).json({ errors: errorMessages });
    } else {
        const course = await Course.findByPk(req.params.id);
        if (course) {
            if (course.userId === req.currentUser.id) {
                await course.update(req.body);
                res.status(204).end();
            } else {
                res.status(403).json({message: 'You cannot update this course since you are not the owner.'});
            }
        } else {
            res.status(404).json({message: `Course #${req.params.id} was not found`}).end();
        }
    }


}));

// DELETE /api/courses/:id 204 - Deletes a course and returns no content
router.delete('/:id', authenticateUser, asyncHandler(async (req, res) => {
    const course = await Course.findByPk(req.params.id);
    if (course) {
        if (course.userId === req.currentUser.id) {
            await course.destroy();
            res.status(204).end();
        } else {
            res.status(403).json({message: 'You cannot delete this course since you are not the owner.'});
        }
    } else {
        res.status(404).json({message: `Course #${req.params.id} was not found`}).end();
    }
}));

module.exports = router;