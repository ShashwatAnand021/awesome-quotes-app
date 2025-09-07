
Daily Quote Emailer
This is an email subscription service that sends a new quote to verified users daily at 7 AM. I built this to practice full-stack development and backend automation.

Features
Users can subscribe and get a verification email.
The system uses a database to store and track subscribers.
A scheduled task runs every day to send out the emails @7am.
The quotes are stored in a JSON file, and the system ensures they don't repeat.
I hosted it on Render to make it a live, functional service.

Technologies Used
Node.js & Express.js for the backend.
Nodemailer for sending emails.
node-cron for scheduling the daily email delivery.
PostgreSQL for the database, and Supabase was used for the hosted database.

Live Demo
You can check out the live app here:

https://awesome-quotes-app-1.onrender.com

(I have hosted it on render for free, so it may not support a large number of subscribers)

