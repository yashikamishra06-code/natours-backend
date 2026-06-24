const userController=require('../controllers/userController.js')
const authController=require('../controllers/authController.js')
const express=require('express')
const router=express.Router()
const multer = require("multer")

const multerStorage = multer.memoryStorage();

const upload = multer({
  storage: multerStorage,
});

router.route('/signUp').post(authController.signUp)
router.route('/login').post(authController.login)
router
  .route('/verify-email/:token')
  .get(authController.verifyEmail)
router.get('/logout', authController.logout);
router.route('/forgotPassword').post(authController.forgotPassword)
router.route('/resetPassword/:token').patch(authController.resetPassword)

router.use(authController.protect)

router.route('/updatePassword').patch(authController.updatePassword)
router.route('/me').get(userController.getMe,userController.getUser)
// router.route('/updateMe').patch(userController.updateMe)
router
  .route("/updateMe")
  .patch(
    upload.single("photo"),
    userController.resizeUserPhoto,
    userController.updateMe
  );
router.route('/deleteMe').delete(userController.deleteMe)

router.use(authController.restrictTo('admin'))

router.route('/').get(userController.getAllUsers).post(userController.createUser)
router.route('/:id').get(userController.getUser).patch(userController.updateUser).delete(userController.deleteUser)

module.exports=router