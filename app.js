const express=require('express')
const app=express()
app.use(express.json())
const cookieParser = require('cookie-parser');
app.use(cookieParser());
const morgan=require('morgan')

const appError=require('./utils/appError.js')

const globalErrorHandler=require('./controllers/errorController.js')

const rateLimit=require('express-rate-limit')

const helmet=require('helmet')

const sanitize=require('express-mongo-sanitize')

const hpp=require('hpp')

console.log(process.env.NODE_ENV)

if (process.env.NODE_ENV=='development'){
    app.use(morgan('dev'))
}

app.use((req,res,next)=>{
    req.req_time=Date()
    next()
})

app.use(express.static('./public'))

app.use((req,res,next)=>{
    // console.log(req.headers)
    next()
})

const limiter=rateLimit({
    max:100,
    windowMs:60*60*1000,
    message:'Too many requests from same IP. Plz try again after 1 hr ⌛'
})

app.use('/api',limiter)

const cors = require('cors')

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
  })
);

app.use(helmet())

app.use(sanitize())

app.use(hpp({whitelist:['duration']}))

const tourRouter=require('./routes/tourRoutes.js')
app.use('/api/v1/tours', tourRouter);


const userRouter=require('./routes/userRoutes.js')
app.use('/api/v1/users', userRouter);

const reviewRouter=require('./routes/reviewRoutes.js')
app.use('/api/v1/reviews', reviewRouter);

const bookingRouter = require('./routes/bookingRoutes');
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res,next) => {
  next(new appError(`Can't find ${req.originalUrl} on this server!`,404))
})


app.use(globalErrorHandler)

module.exports=app

