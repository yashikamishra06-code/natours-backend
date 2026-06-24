const mongoose=require('mongoose')
const reviewSchema=new mongoose.Schema({
    review:{
        type:String,
        required:[true,'Review cannot be empty']
    },
    rating:{
        type:Number,
        min:1,
        max:5
    },
    createdAt:{
        type:Date,
        default:Date.now()
    },
    refToTour:{
        type:mongoose.Schema.ObjectId,
        ref:'Tour',
        required:[true,'Review must belong to a Tour']
    },
    refToUser:{
        type:mongoose.Schema.ObjectId,
        ref:'User',
        required:[true,'Review must belong to a User']
    },
})

reviewSchema.index({refToTour:1,refToUser:1},{unique:true})

reviewSchema.pre(/^find/, function () {
  this.populate({
    path: 'refToUser',
    select: 'name photo',
  });
});

reviewSchema.statics.calRatings=async function(tourID){
    const Tour=require('./tourModel')
    const stats=await this.aggregate([
        {
            $match:{refToTour:tourID}
        },
        {
            $group:{
                _id:'$refToTour',
                qty:{$sum:1},
                avg:{$avg:'$rating'}
            }
        }
    ])
    if (stats.length > 0){
        await Tour.findByIdAndUpdate(tourID,{ratingsAverage:stats[0].avg,ratingsQuantity:stats[0].qty})
    }
    else{
        await Tour.findByIdAndUpdate(tourID,{ratingsAverage:4.5,ratingsQuantity:0})
    }
}

reviewSchema.post('save',function(){
    this.constructor.calRatings(this.refToTour)
})

// doc has access to current updated document
reviewSchema.post(/^findOneAnd/, async function(doc) {
    if (doc){
        await doc.constructor.calRatings(doc.refToTour)
    }
})


const Review=mongoose.model('Review',reviewSchema)

module.exports=Review