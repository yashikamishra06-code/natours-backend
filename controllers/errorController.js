const appError = require('.././utils/appError');

const validationErrorHandler = (error) => {
  const msgs = Object.values(error.errors).map((el) => el.message);
  const message = msgs.join('. ');

  return new appError(message, 400);
};

const castErrorHandler = (error) => {
  const message = `Invalid ${error.path}: ${error.value}`;

  return new appError(message, 400);
};

const duplicateErrorHandler = (error) => {
  const field = Object.keys(error.keyValue)[0];

  let message = `${field} already exists. Please use another ${field}.`;

  if (field === 'email') {
    message = 'User already exists with this email. Please login instead.';
  }

  return new appError(message, 400);
};

const jsonWebTokenErrorHandler = () => {
  return new appError('Invalid token! Please login again.', 401);
};

const tokenExpiredErrorHandler = () => {
  return new appError('JWT expired! Please login again.', 401);
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    console.log('Error 💥💥', err);

    res.status(500).json({
      status: 'fail',
      message: 'Something went very wrong!',
    });
  }
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    stack: err.stack,
    error: err,
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  let error = err;

  if (err.name === 'CastError') {
    error = castErrorHandler(err);
  } else if (err.code === 11000) {
    error = duplicateErrorHandler(err);
  } else if (err.name === 'ValidationError') {
    error = validationErrorHandler(err);
  } else if (err.name === 'JsonWebTokenError') {
    error = jsonWebTokenErrorHandler();
  } else if (err.name === 'TokenExpiredError') {
    error = tokenExpiredErrorHandler();
  }

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else if (process.env.NODE_ENV === 'production') {
    sendErrorProd(error, res);
  }
};