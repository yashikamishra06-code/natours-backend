const User = require('../models/userModel')
const appError=require('../utils/appError')
const catchAsync=require('../utils/catchAsync')
const handlerFactory=require('./handlerFactory')
const sharp = require("sharp");

exports.resizeUserPhoto = catchAsync(
  async (req, res, next) => {
    if (!req.file) return next();

    req.file.filename = `user-${
      req.user.id
    }-${Date.now()}.jpeg`;

    await sharp(req.file.buffer)
      .resize(500, 500)
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toFile(
        `public/img/users/${req.file.filename}`
      );

    next();
  }
);

exports.updateMe=catchAsync(async(req,res,next)=>{
    console.log(req.file);
    console.log(req.body);
    if (req.body.password || req.body.passwordConfirm){
        return next(new appError('This route is not for password update',400))
    }
    const allowed_field=['name','email']
    const newBody={}
    Object.keys(req.body).forEach((el )=> {
        if (allowed_field.includes(el)){
            newBody[el]=req.body[el]
        }
    })
    if (req.file) {
    newBody.photo = req.file.filename;
    }
    const user=await User.findByIdAndUpdate(req.user.id,newBody,{new:true,runValidators:true})
    res.status(200).json({status:'success',message:'Details Updated!'})
})

exports.deleteMe=catchAsync(async(req,res,next)=>{
    if (!req.user){
        return next(new appError('U r logged out!',401))
    }
    await User.findByIdAndUpdate(req.user.id,{active:false})
    res.status(200).json({status:'success',message:'Your account is deactivated!'})
})

exports.getMe=(req,res,next)=>{
    req.params.id=req.user.id
    next()
}

exports.getAllUsers=handlerFactory.getAll(User)
exports.createUser=handlerFactory.createOne(User)
exports.getUser=handlerFactory.getOne(User)
exports.updateUser=handlerFactory.updateOne(User)
exports.deleteUser=handlerFactory.deleteOne(User)