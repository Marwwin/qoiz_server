const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Question = require('../models/question');
const checkAuth = require('../middleware/check-auth');

// get everything
router.get('/', (req, res, next) => {
    Question.find()
        .exec()
        .then(documents => {
            res.status(200).json(documents);
        })
        .catch(error => {
            console.log(error);
            const err = new Error(error);
            err.status = error.status || 500;
            
            next(err);
        });
});

// Get by Id 
router.get('/:id',  (req, res, next) => {
    
    const id = req.params.id;
    
    Question.findById(id)
        .exec()
        .then(document => {
            res.status(200).json(document);
        })
        .catch(error => {
            console.log(error);
            const err = new Error(error);
            err.status = error.status || 500;
            
            next(err);
        });
});

//eventlistener för POST requests
router.post('/', checkAuth, (req, res, next) => {
    const question = new Question({
        _id: new mongoose.Types.ObjectId(),
        question: req.body.question,
        correctAnswers: req.body.correctAnswers,
        questionValue: req.body.questionValue,
        answerTime: req.body.answerTime,
    });

    question.save()
        .then(result => {
            console.log(result);
            res.status(201).json({
                message : "Question successfully created!",
                question: question
            });
        })
        .catch(error => {
            console.log(error);
            const err = new Error(error);
            err.status = error.status || 500;
            
            next(err);
        });

});
router.delete('/:id', checkAuth, (req, res, next) => {
    Question.remove({ _id: req.params.id }).exec()
        .then(result => {
      
            if (result.deletedCount > 0){
            res.status(200).json({
                message: "Question deleted",
            })} 
            else
            res.status(400).json({
                message: "Question not deleted"
            })
        })
        .catch(error => {
            console.log(error);
            const err = new Error(error);
            err.status = error.status || 500;

            next(err);
        });
});

router.patch('/', checkAuth, (req, res, next) => {    
    Question.update({_id: req.body.id}, {$set: req.body})
        .exec()
        .then(result => {
            res.status(200).json({
                message: "Question updated!"+result
            });
        })
        .catch(error => {
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

