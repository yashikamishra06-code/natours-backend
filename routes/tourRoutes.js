const tourController=require('../controllers/tourController.js')

const express=require('express')
const router=express.Router()


const authController=require('../controllers/authController.js')

// const reviewController=require('../controllers/reviewController.js')
const reviewRoutes=require('../routes/reviewRoutes.js')

// router.param('id',tourController.checkID)

router.use('/:tourID/reviews',reviewRoutes)

router.route('/top-5-cheap').get(tourController.get_top_5_cheap,tourController.getAllTours)
router.route('/tourStats').get(tourController.getTourStats)

router.route('/tours-within/:distance/center/:latlog/mil').get(authController.protect,tourController.getToursWithin)

router.route('/monthly-plan/:year').get(authController.protect,authController.restrictTo('admin','lead-guide','guide'),tourController.getMonthlyPlan)
router.route('/').get(tourController.getAllTours).post(authController.protect,authController.restrictTo('admin','lead-guide'),tourController.createTour)
router.route('/slug/:slug').get(tourController.getTourBySlug)
// router.route('/:id').get(tourController.getTour).patch(authController.protect,authController.restrictTo('admin','lead-guide'),tourController.updateTour).delete(authController.protect,authController.restrictTo('admin','lead-guide'), tourController.deleteTour)

// router.route('/:tourID/reviews').post(authController.protect,reviewController.addReview)

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );

module.exports=router