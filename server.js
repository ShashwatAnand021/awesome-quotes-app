// server.js 
const express = require('express');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const { v4 : uuidv4} = require('uuid');
const pool = require('./db');
const quotesFilePath = path.join(__dirname, 'quotes.json');
const sentFilePath = path.join(__dirname, 'sent.json');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// const quotes = [
//   "Believe in yourself!",
//   "One day or day one. You decide.",
//   "Push yourself, because no one else is going to do it for you.",
//   "Hard work beats talent when talent doesn't work hard."
// ];


//fxn to generate random quotes from quotes.json
function getRandomUnreadQuote() {
    const allQuotes = JSON.parse(fs.readFileSync(quotesFilePath, 'utf8'));
    let sentIndices = [];

    // Reading sent.json
    if (fs.existsSync(sentFilePath)) {
        sentIndices = JSON.parse(fs.readFileSync(sentFilePath, 'utf8'));
    }

    // if each quote gets used, resetting in sent.json
    if (sentIndices.length >= allQuotes.length) {
        sentIndices = [];
    }

    const unreadIndices = allQuotes.map((_, idx) => idx).filter(idx => !sentIndices.includes(idx));
    const randomIndex = unreadIndices[Math.floor(Math.random() * unreadIndices.length)];
    const selectedQuote = allQuotes[randomIndex];

    // Updating sent.json
    sentIndices.push(randomIndex);
    fs.writeFileSync(sentFilePath, JSON.stringify(sentIndices, null, 2));

    return selectedQuote;
}


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

app.post('/subscribe', async (req, res) => {
  const { email } = req.body;
  if (!email ) return res.status(400).send('Email is required!');

  try {
        const token = uuidv4();

        await pool.query(
            'INSERT INTO subscribers (email, confirmation_token) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [email, token]
        );

        // Sending verification email
        const verifyLink = `http://localhost:3000/verify?token=${token}`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Confirm your subscription',
            html: `<p>Click <a href="${verifyLink}">here</a> to verify your subscription.</p>`
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error('Error sending email:', err);
                return res.status(500).send('Failed to send email');
            } else {
                console.log('Verification email sent:', info.response);
                return res.status(200).send('Verification email sent!');
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// adding the verify route
app.get('/verify', async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).send('Invalid token');

    try {
        const result = await pool.query(
            'UPDATE subscribers SET is_confirmed = TRUE WHERE confirmation_token = $1 RETURNING *',
            [token]
        );

        if (result.rowCount === 0) {
            return res.status(404).send('Invalid or expired token');
        }

        res.send('Your email has been verified! You’ll now receive daily quotes.');
    } catch (err) {
        console.error(err);
        res.status(500).send('Something went wrong');
    }
});

//sendQuoteEmail fxn
function sendQuoteEmail(to, quote) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Your Daily Quote',
    text: quote
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error(`Error sending to ${to}:`, err.message);
    } else {
      console.log(`Sent to ${to}:`, info.response);
    }
  });
}


cron.schedule('0 7 * * *', async () => {
    try {
        const { rows: subscribers } = await pool.query(
            'SELECT email FROM subscribers WHERE is_confirmed = TRUE'
        );

        if (subscribers.length === 0) {
            console.log('No verified subscribers to send emails to.');
            return;
        }

        const quoteObj = getRandomUnreadQuote();
        const quoteText = `"${quoteObj.quote}"\n— ${quoteObj.author}`;
        console.log(`Sending quote to ${subscribers.length} users`);

        subscribers.forEach(subscriber => {
            sendQuoteEmail(subscriber.email, quoteText);
        });

    } catch (err) {
        console.error('Failed to send scheduled emails:', err.message);
    }
}, {
    timezone: "Asia/Kolkata"
});

app.listen(PORT, ()=>{
    console.log(`server live on port ${PORT}`);
});