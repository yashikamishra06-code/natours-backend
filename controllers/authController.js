const {promisify}=require('util')
const User=require('../models/userModel')
const catchAsync=require('../utils/catchAsync')
const jwt=require('jsonwebtoken')
const appError=require('../utils/appError')
const sendMail=require('../utils/email')
const crypto=require('crypto')
const Email = require('../utils/email');

const rateLimit=require('express-rate-limit')

const signToken=(id)=>{
    // jwt.sign(payload, secret, options)
    return jwt.sign({id},process.env.SECRET,{expiresIn:'90d'})
}
const createSendToken=(user,status,res)=>{
    const token=signToken(user._id)
    const cookieOptions={
        expires:new Date(Date.now()+90*24*60*60*1000)
    }
    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true
    res.cookie('jwt',token,cookieOptions)
    res.status(status).json({
        status:'success',
        token
    })
}

exports.signUp = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role == 'guide' ? 'guide' : 'user'
  });

  const verificationToken =
    newUser.createEmailVerificationToken();

  await newUser.save({ validateBeforeSave: false });

  const verificationURL = `https://natours-frontend-kohl.vercel.app/verify-email/${verificationToken}`;

  await new Email(newUser, verificationURL).sendEmailVerification();

  res.status(201).json({
    status: 'success',
    message:
      'Account created! Please check your email to verify your account.'
  });
});


exports.login=catchAsync(async(req,res,next)=>{
    const {email,password}=req.body
    if (!email || !password){
        return next(new appError('Plz provide email and password',400))
    }
    const user=await User.findOne({email}).select('+password')
    if (!user || !(await user.corrPass(password,user.password))){
        return next(new appError('Invalid username or password!',401))
    }
    if (!user.emailVerified) {
    return next(
        new appError(
        'Please verify your email before logging in',
        401
        )
    );
    }
    createSendToken(user,200,res)
})

exports.verifyEmail = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() }
  });

  if (!user) {
    return next(
      new appError(
        'Verification token is invalid or expired',
        400
      )
    );
  }

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;

  await user.save({ validateBeforeSave: false });

  createSendToken(user, 200, res);
});

exports.protect=catchAsync(async(req,res,next)=>{
    let token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
        token=req.headers.authorization.split(' ')[1]
    }
    else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
    }
    if (!token){
        return next(new appError('U r logged out!',401))
    }
    const decoded=await promisify(jwt.verify)(token,process.env.SECRET)
    const newUser=await User.findById(decoded.id)
    // console.log("decoded.id:", decoded.id);
    // console.log("type:", typeof decoded.id);
    if (!newUser){
        return next(new appError('User no longer exits!',401))
    }
    if (newUser.changedPasswordAfter(decoded.iat)){
        return next(new appError('User recently changed the password! Plz login again'))
    }
    req.user=newUser
    next()
})


exports.restrictTo=(...roles)=>{
    return (req,res,next)=>{
        if (!roles.includes(req.user.role)){
            return next(new appError('U r not authorised to perform this action!',403))
        }
        next()
    }
}


exports.forgotPassword=catchAsync(async(req,res,next)=>{
    console.log(req.body);
    const user=await User.findOne({ email: req.body.email })
    if (!user){
        return next(new appError("User doesn't exists",404))
    }
    const resetToken=user.createPasswordResetTokens()
    await user.save({validateBeforeSave:false})

    const resetURL = `https://natours-frontend-kohl.vercel.app/resetPassword/${resetToken}`;

    const message=`Forgot ur password? Submit a PATCH request with password and passwordConfirm to: ${resetURL}`

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
        status:'success',
        message:'Token sent to mail'
    })
})


exports.resetPassword=catchAsync(async(req,res,next)=>{
    const hashed_token=crypto.createHash('sha256').update(req.params.token).digest('hex')
    const user=await User.findOne({passwordResetToken:hashed_token,passwordResetExpires:{$gt:Date.now()}})
    if (!user){
        return next(new appError('Token expired!',))
    }
    user.password=req.body.password
    user.passwordConfirm=req.body.passwordConfirm
    user.passwordResetExpires=undefined
    user.passwordResetToken=undefined
    await user.save()
    createSendToken(user,200,res)
})

exports.updatePassword=catchAsync(async(req,res,next)=>{
    const user=await User.findById(req.user.id).select('+password')
    if (!user){
        return next(new appError("User doesn't exist🥲",401))
    }
    if (! user.corrPass(req.body.currPass,user.password)){
        return next(new appError("Wrong password😥",401))
    }
    user.password=req.body.newPass
    user.passwordConfirm = req.body.newPassConfirm;
    await user.save()
    createSendToken(user,200,res)
})

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    status: 'success'
  });
};


