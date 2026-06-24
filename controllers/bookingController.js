const crypto = require('crypto');
const Email = require('../utils/email');
const Booking = require('../models/bookingModel');
const Tour = require('../models/tourModel');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const razorpay = require('../utils/razorpay');

const factory = require('./handlerFactory');

const Review = require('../models/reviewModel');

function formatDate(date) {
  const d = new Date(date);

  const year = d.getFullYear();

  const month = String(d.getMonth() + 1).padStart(2, '0');

  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function rangesOverlap(start1, end1, start2, end2) {
  return start1 <= end2 && start2 <= end1;
}

exports.getUnavailableDates = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.tourId);

  if (!tour) {
    return next(new AppError('No tour found', 404));
  }

  const unavailableDates = new Set();
  const batchStartDates = new Set();

  const userBookings = await Booking.find({
    user: req.user._id,
    cancelled: false,
  });

  const tourBookings = await Booking.find({
    tour: tour._id,
    cancelled: false,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextYear = new Date(today);
  nextYear.setFullYear(nextYear.getFullYear() + 1);

  for (
    let current = new Date(today);
    current <= nextYear;
    current.setDate(current.getDate() + 1)
  ) {
    const selectedStart = new Date(current);
    selectedStart.setHours(0, 0, 0, 0);

    const selectedEnd = new Date(selectedStart);
    selectedEnd.setDate(selectedEnd.getDate() + tour.duration - 1);

    let shouldDisable = false;

    // 1. Same user cannot book any tour if selected range overlaps with existing booking
    for (const booking of userBookings) {
      const bookingStart = new Date(booking.startDate);
      const bookingEnd = new Date(booking.endDate);

      bookingStart.setHours(0, 0, 0, 0);
      bookingEnd.setHours(0, 0, 0, 0);

      if (
        rangesOverlap(
          selectedStart,
          selectedEnd,
          bookingStart,
          bookingEnd
        )
      ) {
        shouldDisable = true;
      }
    }

    // 2. Same tour batch logic
    for (const booking of tourBookings) {
      const bookingStart = new Date(booking.startDate);
      const bookingEnd = new Date(booking.endDate);

      bookingStart.setHours(0, 0, 0, 0);
      bookingEnd.setHours(0, 0, 0, 0);

      const bookingStartKey = formatDate(bookingStart);
      const selectedStartKey = formatDate(selectedStart);

      const sameBatchStart = selectedStartKey === bookingStartKey;

      const sameBatchBookings = tourBookings.filter(
        (b) => formatDate(new Date(b.startDate)) === bookingStartKey
      );

      const batchIsFull = sameBatchBookings.length >= tour.maxGroupSize;

      if (!batchIsFull) {
        batchStartDates.add(bookingStartKey);
      }

      if (
        rangesOverlap(
          selectedStart,
          selectedEnd,
          bookingStart,
          bookingEnd
        )
      ) {
        if (!sameBatchStart || batchIsFull) {
          shouldDisable = true;
        }
      }
    }

    if (shouldDisable) {
      unavailableDates.add(formatDate(selectedStart));
    }
  }

  res.status(200).json({
    status: 'success',
    data: {
      unavailableDates: [...unavailableDates],
      batchStartDates: [...batchStartDates],
    },
  });
});

exports.createRazorpayOrder = catchAsync(
  async (req, res, next) => {
    const tour = await Tour.findById(req.params.tourId);

    if (!tour) {
      return next(new AppError('No tour found', 404));
    }

    const { startDate } = req.body;

    if (!startDate) {
      return next(
        new AppError('Please select a start date', 400)
      );
    }

    const selectedStart = new Date(startDate);

    selectedStart.setHours(0, 0, 0, 0);

    const selectedEnd = new Date(selectedStart);

    selectedEnd.setDate(
      selectedEnd.getDate() + tour.duration - 1
    );

    const bookings = await Booking.find({
      cancelled: false,
    }).populate('tour');

    for (const booking of bookings) {
      const bookingStart = new Date(booking.startDate);

      const bookingEnd = new Date(booking.endDate);

      bookingStart.setHours(0, 0, 0, 0);

      bookingEnd.setHours(0, 0, 0, 0);

      // same user overlap
      if (
        booking.user.toString() === req.user._id.toString()
      ) {
        if (
          rangesOverlap(
            selectedStart,
            selectedEnd,
            bookingStart,
            bookingEnd
          )
        ) {
          return next(
            new AppError(
              'You already have another tour booked during these dates',
              400
            )
          );
        }
      }

      // same tour overlap
      if (
        booking.tour._id.toString() === tour._id.toString()
      ) {
        const sameBatch =
          formatDate(selectedStart) ===
          formatDate(bookingStart);

          const sameBatchBookings = bookings.filter(
            (b) =>
              b.tour._id.toString() === tour._id.toString() &&
              formatDate(new Date(b.startDate)) ===
                formatDate(selectedStart)
          );

          const batchIsFull =
            sameBatchBookings.length >= tour.maxGroupSize;

        if (
          rangesOverlap(
            selectedStart,
            selectedEnd,
            bookingStart,
            bookingEnd
          )
        ) {
          if (!sameBatch || batchIsFull) {
            return next(
              new AppError(
                'This date range overlaps with another batch',
                400
              )
            );
          }
        }
      }
    }

    const order = await razorpay.orders.create({
      amount: tour.price * 100,
      currency: 'INR',
      receipt: `tour_${tour._id}`,
    });

    res.status(200).json({
      status: 'success',
      order,
      tour,
    });
  }
);

exports.verifyPaymentAndCreateBooking = catchAsync(
  async (req, res, next) => {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      tourId,
      startDate,
    } = req.body;

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac(
        'sha256',
        process.env.RAZORPAY_KEY_SECRET
      )
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return next(
        new AppError('Payment verification failed', 400)
      );
    }

    const tour = await Tour.findById(tourId);

    if (!tour) {
      return next(new AppError('No tour found', 404));
    }

    const bookingStart = new Date(startDate);

    const bookingEnd = new Date(bookingStart);

    bookingEnd.setDate(
      bookingEnd.getDate() + tour.duration - 1
    );

    const booking = await Booking.create({
      tour: tour._id,
      user: req.user._id,
      price: tour.price,
      paid: true,
      startDate: bookingStart,
      endDate: bookingEnd,
    });

    await booking.populate('tour');
    await new Email(req.user).sendBookingConfirmation(
      booking
    );    

    res.status(201).json({
      status: 'success',
      booking,
    });
  }
);

exports.getMyBookings = catchAsync(async (req, res, next) => {
  const bookings = await Booking.find({
    user: req.user._id,
    cancelled: false,
  });

  const bookingsWithReviewStatus = await Promise.all(
    bookings.map(async (booking) => {
      const review = await Review.findOne({
        refToTour: booking.tour._id || booking.tour,
        refToUser: req.user._id,
      });

      const bookingObj = booking.toObject();

      bookingObj.hasReviewed = !!review;

      return bookingObj;
    })
  );

  res.status(200).json({
    status: 'success',
    results: bookingsWithReviewStatus.length,
    data: {
      bookings: bookingsWithReviewStatus,
    },
  });
});


exports.cancelBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.bookingId);
  if (!booking) {
    return next(new AppError('No booking found', 404));
  }
  const bookingUserId = booking.user._id
    ? booking.user._id.toString()
    : booking.user.toString();

  if (bookingUserId !== req.user._id.toString()) {
    return next(
      new AppError(
        'You can only cancel your own booking',
        403
      )
    );
  }
  booking.cancelled = true;
  await booking.save();
  await booking.populate('tour');

  await new Email(req.user).sendBookingCancellation(
    booking
  );
  res.status(200).json({
    status: 'success',
    message: 'Booking cancelled successfully',
  });
});

exports.getAllBookings = factory.getAll(Booking);

exports.getBooking = factory.getOne(Booking);

exports.createBooking = factory.createOne(Booking);

exports.updateBooking = factory.updateOne(Booking);

exports.deleteBooking = factory.deleteOne(Booking);