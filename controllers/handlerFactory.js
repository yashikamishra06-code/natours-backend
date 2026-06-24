const { Model } = require('mongoose')
const catchAsync=require('../utils/catchAsync')
const APIFeatures=require('../utils/apiFeatures')
const appError = require("../utils/appError");

exports.deleteOne=(Model)=>{
    return (
        catchAsync(async(req,res,next)=>{
            const data=await Model.findByIdAndDelete(req.params.id)
            if (!data){
                return next(new appError('Data not found',404))
            }    
            res.send(`${req.params.id} deleted`)
        })
    )
}

exports.updateOne=(Model)=>{
    return (
        catchAsync(async(req,res,next)=>{
            const data=await Model.findByIdAndUpdate(req.params.id,req.body,{new:true,runValidators:true})
            if (!data){
                return next(new appError('Tour not found',404))
            }
            res.send(data)
        })
    )
}

exports.createOne=(Model)=>{
    return (
        catchAsync(async(req,res,next)=>{
            await Model.create(req.body)
            res.send(`New Added`)
        })
    )
}


exports.getOne=(Model,popOptions)=>{
    return (
        catchAsync(async(req,res,next)=>{
            let query=Model.findById(req.params.id)
            if (popOptions){
                query=query.populate(popOptions)
            }
            const data=await query
            if (!data){
                return next(new appError('Data not found',404))
            }
            res.send(data)
        })
    )
}


exports.getAll=(Model)=>{
    return (
        catchAsync(async(req,res,next)=>{
            let filter={}
            if (req.params.tourID){
                filter={refToTour:req.params.tourID}
            }
            const features=new APIFeatures(Model.find(filter),req.query)
            .filter()
            .sort()
            .limitFields()
            .paginate()
            const data=await(features.mongooseQuery)
            res.send(data)
        })
    )
}




