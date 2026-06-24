const Review = require('../models/reviewModel');
const Booking = require('../models/bookingModel');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const handlerFactory = require('./handlerFactory');

exports.getAllReviews = catchAsync(async (req, res, next) => {
  let filter = {};

  if (req.params.tourID) {
    filter = { refToTour: req.params.tourID };
  }

  const reviews = await Review.find(filter);

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      reviews,
    },
  });
});

exports.checkUserBookedTour = catchAsync(async (req, res, next) => {
  const booking = await Booking.findOne({
    user: req.user.id,
    tour: req.params.tourID,
    cancelled: false,
    endDate: { $lt: new Date() },
  });

  if (!booking) {
    return next(
      new AppError(
        'You can review only completed tours that you booked',
        403
      )
    );
  }

  next();
});

exports.addTourUserIDs = (req, res, next) => {
  req.body.refToTour = req.params.tourID;
  req.body.refToUser = req.user.id;

  next();
};

exports.checkReviewOwner = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(new AppError('No review found', 404));
  }

  const reviewUserId = review.refToUser._id
    ? review.refToUser._id.toString()
    : review.refToUser.toString();

  if (
    req.user.role !== 'admin' &&
    reviewUserId !== req.user._id.toString()
  ) {
    return next(
      new AppError(
        'You can only update or delete your own review',
        403
      )
    );
  }

  next();
});

exports.getReview = handlerFactory.getOne(Review);

exports.addReview = handlerFactory.createOne(Review);

exports.updateReview = handlerFactory.updateOne(Review);

exports.deleteReview = handlerFactory.deleteOne(Review);