const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Quiz = require("../models/quiz");
const checkAuth = require("../middleware/check-auth");

router.get("/", (req, res, next) => {
    Quiz.find()
        .populate({ path: "players.user", model: "User" })
        .populate({ path: "quizQuestions", model: "Question" })
        .exec()
        .then((documents) => {
            res.status(200).json(documents);
        })
        .catch((error) => {
            console.log(error);
            const err = new Error(error);
            err.status = error.status || 500;
            next(err);
        });
});

router.get("/:id", checkAuth, (req, res, next) => {
    const id = req.params.id;

    Quiz.findById(id)
        .populate("users")
        .populate("questions")
        .exec()
        .then((documents) => {
            res.status(200).json(documents);
        })
        .catch((error) => {
            console.log(error);
            const err = new Error(error);
            err.status = error.status || 500;
            next(err);
        });
});

router.post("/", checkAuth, (req, res, next) => {
    const quiz = new Quiz({
        _id: new mongoose.Types.ObjectId(),
        name: req.body.name,
        quizQuestions: req.body.quizQuestions,
        startTime: req.body.startTime,
        players: req.body.players,
    });

    quiz
        .save()
        .then((result) => {
            console.log(result);
            res.status(201).json({
                message: "Quiz successfully created!",
                quiz: quiz,
            });
        })
        .catch((error) => {
            console.log(error);
            const err = new Error(error);
            err.status = error.status || 500;
            next(err);
        });
});

//eventlistener för DELETE requests
router.delete("/:id", checkAuth, (req, res, next) => {
    Quiz.remove({ _id: req.params.id })
        .exec()
        .then((result) => {
            if (result.deletedCount > 0) {
                res.status(200).json({
                    message: "Quiz deleted",
                });
            } else {
                res.status(400).json({
                    message: "Quiz Not Deleted!!",
                });
            }
        })
        .catch((error) => {
            console.log(error);
            const err = new Error(error);
            err.status = error.status || 500;
            next(err);
        });
});

//eventlistener för PATCH requests
router.patch("/:id", checkAuth, (req, res, next) => {
    Quiz.update({ _id: req.params.id }, { $set: req.body })
        .exec()
        .then((result) => {
            res.status(200).json({
                message: "Quiz updated!" + result,
            });
        })
        .catch((error) => {
            console.log(error);
            const err = new Error(error);
            err.status = error.status || 500;
            next(err);
        });
});

//Om ett/en HTTP-kommando/typ som inte stöds emottagits genererar vi ett error-objekt och
//skickar det vidare till "fellyssnarfunktionen" (rad 27 i app.js) som tar hand om felmeddelanden
router.use((req, res, next) => {
    const error = new Error("Only GET, POST, PUT, DELETE commands supported");
    error.status = 500;
    next(error);
});

module.exports = router;
