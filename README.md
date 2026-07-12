# Personal Expense Tracker

Simple expense tracker built with HTML, CSS, JavaScript, Express, and MongoDB.

## Features

- Add, edit, and delete expenses
- Store records in MongoDB
- View totals and category summaries
- Responsive frontend with a clean UI

## Setup

1. Install dependencies:
   `npm install`
2. Create a `.env` file from `.env.example`
3. Start MongoDB locally or point `MONGODB_URI` to your server
4. Run the app:
   `npm start`

## API

- `GET /api/expenses`
- `POST /api/expenses`
- `PUT /api/expenses/:id`
- `DELETE /api/expenses/:id`
- `GET /api/summary`
