const express = require("express")
const uniqid = require("uniqid")
const multer = require("multer")
const { check, validationResult } = require("express-validator")
const { CloudinaryStorage } = require("multer-storage-cloudinary")
const { Transform } = require("json2csv")
const { pipeline } = require("stream")
const { join } = require("path")
const { createReadStream } = require("fs-extra")
const cloudinary = require("../../cloudinary")
const { getMedia, writeMedia } = require("../../fsUtilities")

const mediaRouter = express.Router()

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: "striveTest",
    },
  })

const cloudinaryMulter = multer({ storage: storage })

// get all media
mediaRouter.get("/", async (req, res, next) => {
    try {
      const media = await getMedia()
  
      //filter by title
      if (req.query && req.query.title) {
        const filteredMedia = media.filter(
          media =>
            media.hasOwnProperty("title") &&
            media.category === req.query.category
        )
        res.send(filteredMedia)
      } else {
        res.send(media)
      }
      //filter by year
      if (req.query && req.query.year) {
        const filteredMedia = media.filter(
          media =>
            media.hasOwnProperty("year") &&
            media.year === req.query.year
        )
        res.send(filteredMedia)
      } else {
        res.send(media)
      }
      //filter by type
      if (req.query && req.query.type) {
        const filteredMedia = media.filter(
          media =>
            media.hasOwnProperty("type") &&
            media.type === req.query.type
        )
        res.send(filteredMedia)
      } else {
        res.send(media)
      }
    } catch (error) {
      console.log(error)
      next(error)
    }
  })

//we dont need media/:id route 'cause we will fetch the information from omdb for that specific media

//post new media
mediaRouter.post("/", 
[
    check("Title")
        .exists()
        .withMessage("Add a title please"),
    check("Year")
        .exists()
        .withMessage("Add a year please"), 
    check("Type")
        .exists()
        .withMessage("Add the type please"), 
    check("Poster")
        .exists()
        .withMessage("Add a poster please"),
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
        const media = await getMedia()
  
        const idFound = media.find(media => media.imdbID === req.body.imdbID)
  
        if (idFound) {
          const error = new Error()
          error.httpStatusCode = 400
          error.message = "Movie already in db"
          next(error)
        } else {
          media.push({
              ...req.body,
              imdbID: uniqid(),
            })
          await writeMedia(media)
          res.status(201).send({ title: req.body.title })
        }
      }
    } catch (error) {
      console.log(error)
      const err = new Error("An error occurred while reading from the file")
      next(err)
    }
  })

//to update one movie
mediaRouter.put("/:id", async (req, res, next) => {
    try {
      //const validatedData = validationResult(req)
      const media = await getMedia()
  
      const mediaIndex = media.findIndex(media => media.imdbID === req.params.id)
  
      if (mediaIndex !== -1) {
        // media found
        const updatedmedia = [
          ...media.slice(0, mediaIndex),
          { ...media[mediaIndex], ...req.body },
          ...media.slice(mediaIndex + 1),
        ]
        await writeMedia(updatedmedia)
        res.send(updatedmedia)
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

//delete one movie
mediaRouter.delete("/:id", async (req, res, next) => {
    try {
      const media = await getMedia()
  
      const mediaFound = media.find(media => media.imdbID === req.params.id)
  
      if (mediaFound) {
        const filteredMedia = media.filter(media => media.imdbID !== req.params.id)
  
        await writeMedia(filteredMedia)
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

//upload image
mediaRouter.post(
    "/:id/upload",
    cloudinaryMulter.single("image"),
    async (req, res, next) => {
      try {
        const allMedia = await getMedia()
        const media = allMedia.find(media => media.imdbID === req.params.id)
        const otherMedia = allMedia.filter(media => media.imdbID !== req.params.id)
        
        const finalMedia = [...otherMedia];
        const newMedia = {...media};
        newMedia.Poster = req.file.path;
        finalMedia.push(newMedia)
  
        await writeMedia(finalMedia)
        res.json(media)
      } catch (error) {
        console.log(error)
        next(error)
      }
    }
  )

//export as csv
mediaRouter.get("/export/csv", (req, res, next) => {
    try {
      const path = join(__dirname, "media.json")
      const jsonReadableStream = createReadStream(path)
  
      const json2csv = new Transform({
        fields: ["Title", "Year", "imdbID", "Type", "Poster"],
      })
  
      res.setHeader("Content-Disposition", "attachment; filename=movies.csv")
      pipeline(jsonReadableStream, json2csv, res, err => {
        if (err) {
          console.log(err)
          next(err)
        } else {
          console.log("File successfully exported to csv.")
        }
      })
    } catch (error) {
      next(error)
    }
  })

module.exports = mediaRouter;