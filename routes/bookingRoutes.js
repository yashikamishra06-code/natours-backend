const express = require('express');

const bookingController = require('../controllers/bookingController');

const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router.get(
  '/unavailable-dates/:tourId',
  bookingController.getUnavailableDates
);

router.get(
  '/my-bookings',
  bookingController.getMyBookings
);

router.patch(
  '/cancel/:bookingId',
  bookingController.cancelBooking
);

router.post(
  '/checkout-session/:tourId',
  bookingController.createRazorpayOrder
);

router.post(
  '/verify-payment',
  bookingController.verifyPaymentAndCreateBooking
);

module.exports = router;