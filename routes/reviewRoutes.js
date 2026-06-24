const express = require("express");

const reviewController = require("../controllers/reviewController");
const authController = require("../controllers/authController");

const router = express.Router({ mergeParams: true });

router
  .route("/")
  .get(reviewController.getAllReviews)
  .post(
    authController.protect,
    authController.restrictTo("user"),
    reviewController.checkUserBookedTour,
    reviewController.addTourUserIDs,
    reviewController.addReview
  );

router.use(authController.protect);
router.use(authController.restrictTo("admin", "user"));

router
  .route("/:id")
  .get(reviewController.getReview)
  .patch(
    reviewController.checkReviewOwner,
    reviewController.updateReview
  )
  .delete(
    reviewController.checkReviewOwner,
    reviewController.deleteReview
  );

module.exports = router;