class APIFeatures{
    constructor(mongooseQuery,query){
        this.mongooseQuery=mongooseQuery
        this.query=query
    }
    filter(){
        const queryObj={...this.query}
        const excludedField=['page','sort','limit','fields']
        excludedField.forEach((el)=>{
            delete queryObj[el]
        })
        const str=JSON.stringify(queryObj).replace(/\b(gte|gt|lte|lt)\b/g,(match)=>{
            return `$${match}`
        })
        this.mongooseQuery=this.mongooseQuery.find(JSON.parse(str))
        return this
    }
    sort(){
        if (this.query.sort){
            const sortBy=this.query.sort.split(',').join(' ')
            this.mongooseQuery = this.mongooseQuery.sort(sortBy)
        }
        else{
            this.mongooseQuery = this.mongooseQuery.sort('ratingsAverage')
        }
        return this
    }
    limitFields(){
        if (this.query.fields){
            const fields=this.query.fields.split(',').join(' ')
            this.mongooseQuery=this.mongooseQuery.select(fields)
        }
        else{
            this.mongooseQuery=this.mongooseQuery.select('-__v')
        }   
        return this
    }
    paginate(){
        const page=this.query.page*1 || 1
        const limit=this.query.limit*1 || 100
        const skip=(page-1)*limit
        this.mongooseQuery=this.mongooseQuery.skip(skip).limit(limit)     
        return this
    }
}

module.exports=APIFeatures