const express = require("express")
const uniqid = require("uniqid")
const { check, validationResult } = require("express-validator")
const { getReviews, writeReviews } = require("../../fsUtilities")

const reviewsRouter = express.Router()

//fetch one movies' reviews
reviewsRouter.get("/:mid", async (req, res, next) => {
    try {
      const reviews = await getReviews()
  
      const reviewFound = reviews.filter(review => review.elementId === req.params.mid)
  
      if (reviewFound) {
        res.send(reviewFound)
      } else {
        const err = new Error()
        err.httpStatusCode = 404
        next(err)
      }
    } catch (error) {
      console.log(error)
      next(error)
    }
  })

//post new review
reviewsRouter.post("/:mid", 
[
    check("comment")
        .exists()
        .withMessage("Add a comment please"),
    check("rate")
        .exists()
        .isInt({ min: 1, max: 5})
        .withMessage("Add a rate between 1 and 5 please")
]
 ,async (req, res, next) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        const error = new Error()
        error.message = errors
        error.httpStatusCode = 400
        next(error)
      } else {
        const reviews = await getReviews()
  
        reviews.push({
            ...req.body,
            elementId: req.params.mid,
            _id: uniqid(),
          })
        await writeReviews(reviews)
        res.status(201).send("Review added.")
        
      }
    } catch (error) {
      console.log(error)
      const err = new Error("An error occurred while reading from the file")
      next(err)
    }
  })

//to update one review
  reviewsRouter.put("/:rid", async (req, res, next) => {
    try {
      //const validatedData = validationResult(req)
      const reviews = await getReviews()
  
      const reviewsIndex = reviews.findIndex(reviews => reviews._id === req.params.rid)
  
      if (reviewsIndex !== -1) {
        // reviews found
        const updatedReviews = [
          ...reviews.slice(0, reviewsIndex),
          { ...reviews[reviewsIndex], ...req.body },
          ...reviews.slice(reviewsIndex + 1),
        ]
        await writeReviews(updatedReviews)
        res.send(updatedReviews)
      } else {
        const err = new Error()
        err.httpStatusCode = 404
        next(err)
      }
    } catch (error) {
      console.log(error)
      const err = new Error("An error occurred while reading from the file")
      next(err)
    }
  })

//delete one review
reviewsRouter.delete("/:rid", async (req, res, next) => {
    try {
      const reviews = await getReviews()
  
      const reviewsFound = reviews.find(reviews => reviews._id === req.params.rid)
  
      if (reviewsFound) {
        const filteredReviews = reviews.filter(reviews => reviews._id !== req.params.rid)
  
        await writeReviews(filteredReviews)
        res.status(204).send()
      } else {
        const error = new Error()
        error.httpStatusCode = 404
        next(error)
      }
    } catch (error) {
      console.log(error)
      next(error)
    }
  })

module.exports = reviewsRouter;