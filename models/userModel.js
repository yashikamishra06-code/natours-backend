const bcrypt=require('bcryptjs')
const mongoose=require('mongoose')
const validator=require('validator')
const crypto=require('crypto')
const { type } = require('os')


const userSchema=new mongoose.Schema({
    name:{
        type:String,
        required:[true,'Plz enter ur name']
    },
    email:{
        type:String,
        required:[true,'Plz enter ur email'],
        unique:true,
        lowercase:true,
        validate:[validator.isEmail,'Plz enter valid email']
    },
    photo: {
    type: String,
    default: 'default.jpg'
    },
    role:{
        type:String,
        enum:['admin','user','guide','lead-guide'],
        default:'user'
    },
    password:{
        type:String,
        required:[true,'Plz enter password'],
        minlength:8,
        select:false
    },
    passwordConfirm:{
        type:String,
        required:[true,'Plz confirm ur password'],
        validate:{
            validator:function(el){
                return el==this.password
            },
            message:'Passwords are not same'
        }
    },
    passwordChangedAt:Date,
    passwordResetToken:String,
    passwordResetExpires:Date,
    active:{
        type:Boolean,
        default:true,
        select:false
    },
    emailVerified: {
    type: Boolean,
    default: false,
    },

    emailVerificationToken: String,

    emailVerificationExpires: Date,
})


userSchema.pre('save',async function(){
    if (!this.isModified('password')){
        return 
    }
    this.password=await bcrypt.hash(this.password,12)
    this.passwordConfirm=undefined
})

userSchema.pre('save',async function(){
    if (!this.isModified('password') || this.isNew){
        return 
    }
    this.passwordChangedAt=Date.now()
})

userSchema.pre(/^find/,function(){
    this.find({active:{$ne:false}})
})

userSchema.methods.corrPass=async(enteredPass,encryPassInDb)=>{
    return await bcrypt.compare(enteredPass,encryPassInDb)
}

userSchema.methods.changedPasswordAfter=function(JWTTimestamp){
    if (this.passwordChangedAt){
        const x=new Date(this.passwordChangedAt).getTime()/1000
        return x>JWTTimestamp
    }
    return false
}

userSchema.methods.createPasswordResetTokens=function(){
    const token=crypto.randomBytes(32).toString('hex')
    this.passwordResetToken=crypto.createHash('sha256').update(token).digest('hex')
    this.passwordResetExpires=Date.now()+10*60*1000
    return token
}

userSchema.methods.createEmailVerificationToken = function () {
  const token = crypto.randomBytes(32).toString('hex');

  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;

  return token;
};

const User=mongoose.model('User',userSchema)

module.exports=User

