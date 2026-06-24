const { text } = require('express')
const Tour=require('.././models/tourModel.js')

const APIFeatures=require('.././utils/apiFeatures.js')
const catchAsync=require('.././utils/catchAsync.js')
const appError = require('../utils/appError.js')

const handlerFactory=require('./handlerFactory.js')

const multer = require('multer');
const sharp = require('sharp');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files || !req.files.imageCover || !req.files.images) {
    return next();
  }

  // 1. Cover image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;

  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2. Other images
  req.body.images = [];

  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    })
  );

  next();
});

exports.get_top_5_cheap=(req,res,next)=>{
    req.query.limit='5'
    req.query.sort='price'
    next()
}

exports.getMonthlyPlan=catchAsync(async(req,res,next)=>{
    const year=req.params.year
    const plan=await Tour.aggregate([
        {
            $unwind:'$startDates'
        },
        {
            $match:{
                startDates:{
                    $gte:new Date(`${year}-01-01`),
                    $lte:new Date(`${year}-12-31`)
                }
            }
        },
        {
            $group:{
                _id:{$month : '$startDates'},
                numTours:{$sum:1},
                tourName:{$push:'$name'}
            }
        },
        {
            $addFields:{month:'$_id'}
        },
        {
            $project:{
                _id:0
            }
        },
        {
            $sort:{numTours:-1}
        },
        {
            $limit:6
        }
    ])
    res.send(plan)
})

exports.getTourStats=catchAsync(async(req,res,next)=>{
    const stats=await Tour.aggregate([
        {
            $match:{ratingsAverage:{$gte:4.5}}
        },
        {
            $group:{
                // _id:null,
                // _id:'$difficulty',
                _id:{$toUpper:'$difficulty'},
                numTours:{$sum:1},
                avgRating:{$avg:'$ratingsAverage'},
                avgPrice:{$avg:'$price'},
                minPrice:{$min:'$price'},
                maxPrice:{$max:'$price'}
            }
        },
        {
            $sort:{avgPrice:1}
        },
        // {
        //     $match:{_id:{$ne:'EASY'}}
        // }
    ])
    res.send(stats)
})

exports.getAllTours=handlerFactory.getAll(Tour)

exports.createTour=handlerFactory.createOne(Tour)

exports.getTour=handlerFactory.getOne(Tour,'reviews')

exports.updateTour=handlerFactory.updateOne(Tour)

exports.deleteTour=handlerFactory.deleteOne(Tour)

exports.getToursWithin=async(req,res,next)=>{
    const {distance,latlog}=req.params
    const [lat,log]=latlog.split(',')
    const radius=distance/3963.2
    const tours=await Tour.find({startLocation:{$geoWithin:{$centerSphere:[[log,lat],radius]}}})

    res.send(tours)
}

exports.getTourBySlug = catchAsync(async (req, res, next) => {
    const tour = await Tour.findOne({ slug: req.params.slug }).populate('reviews')

    res.send(tour)
})