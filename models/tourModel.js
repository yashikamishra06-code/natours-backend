const mongoose = require('mongoose');
const slugify = require('slugify');
// const User=require('./userModel')

const tourSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'A tour must have a name'],
        unique: true,
        maxlength: [40, 'Name must have characters <= 40']
    },
    slug: String,
    duration: {
        type: Number,
        required: [true, 'A tour must have a duration']
    },
    maxGroupSize: {
        type: Number,
        required: [true, 'A tour must have a maxGroupSize']
    },
    difficulty: {
        type: String,
        required: [true, 'A tour must have a difficulty'],
        enum: { values: ['easy', 'medium', 'difficult'], message: 'Difficulty is either easy, medium or difficult' }
    },
    ratings: {
        type: Number,
        min: [1, 'Ratings Average should be greater than or equal to 1'],
        max: [5, 'Ratings Average should be less than or equal to 5']
    },
    ratingsQuantity: {
        type: Number,
        default: 0
    },   
    ratingsAverage: {
        type: Number,
        default: 4.5,
        set:(val)=>{
            return Math.round(val*10)/10
        }
    },
    price: {
        type: Number,
        required: [true, 'A tour must have a price']
    },
    priceDiscount: {
        type: Number,
        validate: {
            validator: function (val) {
                return val < this.price;
            },
            message: 'Discount ({VALUE}) should be below cost price'
        }
    },
    summary: { type: String, trim: true },
    description: { type: String, trim: true },
    imageCover: {
        type: String
    },
    images: [String],
    createdAt: {
        type: Date,
        default: Date.now(),
        select: false
    },
    startDates: [Date],
    secretTour: {
        type: Boolean,
        default: false
    },
    startLocation:{
        type:{
            type:String,
            default:'Point',
            enum:['Point']
        },
        coordinates:[Number],
        address:String,
        description:String
    },
    locations:[
        {
            type:{
                type:String,
                default:'Point',
                enum:['Point']
            },
            coordinates:[Number],
            address:String,
            description:String,
            day:Number
        }
    ],
    guides:[
        {
            type:mongoose.Schema.ObjectId,
            ref:'User'
        }
    ]
},

{
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});


tourSchema.index({price:1})

tourSchema.index({ startLocation: '2dsphere' })

tourSchema.virtual('durationInWeeks').get(function () {
    return this.duration / 7;
});

// DOCUMENT MIDDLEWARE: runs before .save() and .create()
tourSchema.pre('save', function () { // 'next' removed
    this.slug = slugify(this.name, { lower: true });
});

// tourSchema.pre('save',async function (){
//     this.guides= await Promise.all (this.guides.map(async(el)=>{
//         let guide=await User.findById(el)
//         return guide
//     }))
// })

tourSchema.virtual('reviews',{
    ref:'Review',
    foreignField:'refToTour',
    localField:'_id'
})

tourSchema.pre(/^find/,function(){
    this.populate({path:'guides',select:'-__v -password'})
})

tourSchema.post('save', function (doc) { // 'next' removed
    console.log(doc.name);
});

// QUERY MIDDLEWARE
tourSchema.pre(/^find/, function () { // 'next' removed
    this.find({ secretTour: { $ne: true } });
    this.start = Date.now();
});

tourSchema.post(/^find/, function (docs) { // 'next' removed
    console.log(`Query took ${Date.now() - this.start} milliseconds!`);
});

// AGGREGATION MIDDLEWARE
tourSchema.pre('aggregate', function () { // 'next' removed
    this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;