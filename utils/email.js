const nodemailer = require('nodemailer');
const { convert } = require('html-to-text');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = process.env.EMAIL_FROM;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD
        }
      });
    }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  async send(subject, html) {
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: convert(html)
    };

    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send(
      'Welcome to Natours!',
      `
      <h2>Welcome, ${this.firstName}!</h2>
      <p>Your account has been created successfully.</p>
      <p>Happy exploring!</p>
      <p>- Team Natours</p>
      `
    );
  }

  async sendPasswordReset() {
    await this.send(
      'Your password reset link',
      `
      <h2>Password Reset</h2>
      <p>Hi ${this.firstName},</p>
      <p>Click the link below to reset your password. This link is valid for 10 minutes.</p>
      <p><a href="${this.url}">Reset your password</a></p>
      <p>If you did not request this, ignore this email.</p>
      `
    );
  }

  async sendEmailVerification() {
    await this.send(
      'Verify your email address',
      `
      <h2>Verify your email</h2>

      <p>Hi ${this.firstName},</p>

      <p>Please verify your email address to activate your Natours account.</p>

      <p>This verification link is valid for 24 hours.</p>

      <p>
        <a href="${this.url}">
          Verify Email
        </a>
      </p>

      <p>If you did not create this account, you can ignore this email.</p>

      <p>- Team Natours</p>
      `
    );
  }

  async sendBookingConfirmation(booking) {
    await this.send(
      'Tour Booking Confirmed',
      `
      <h2>Booking Confirmed 🎉</h2>

      <p>Hi ${this.firstName},</p>

      <p>Your tour booking has been confirmed successfully.</p>

      <h3>Booking Details</h3>

      <ul>
        <li><strong>Tour:</strong> ${booking.tour.name}</li>
        <li><strong>Start Date:</strong> ${new Date(
          booking.startDate
        ).toDateString()}</li>
        <li><strong>End Date:</strong> ${new Date(
          booking.endDate
        ).toDateString()}</li>
        <li><strong>Price:</strong> ₹${booking.price}</li>
      </ul>

      <p>We hope you have an amazing experience!</p>

      <p>- Team Natours</p>
      `
    );
  }

  async sendBookingCancellation(booking) {
    await this.send(
      'Tour Booking Cancelled',
      `
      <h2>Booking Cancelled</h2>

      <p>Hi ${this.firstName},</p>

      <p>Your booking has been cancelled successfully.</p>

      <h3>Cancelled Booking Details</h3>

      <ul>
        <li><strong>Tour:</strong> ${booking.tour.name}</li>
        <li><strong>Start Date:</strong> ${new Date(
          booking.startDate
        ).toDateString()}</li>
        <li><strong>End Date:</strong> ${new Date(
          booking.endDate
        ).toDateString()}</li>
      </ul>

      <p>If this was a mistake, you can book again anytime.</p>

      <p>- Team Natours</p>
      `
    );
  }  

};

