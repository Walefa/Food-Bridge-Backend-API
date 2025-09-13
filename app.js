require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./models/index');
const setupSwagger = require('./swagger');

// Import routes
const listingsRouter = require('./routes/listings');
const authRouter = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable Cross-Origin Requests (important for frontend)
app.use(express.json()); // Parse incoming JSON data

// Use Routes
app.use('/listings', listingsRouter);
app.use('/auth', authRouter);

// Setup Swagger documentation
setupSwagger(app);

// Basic root endpoint
app.get('/', (req, res) => {
  res.send('FoodBridge SA API is running!');
});

// Initialize the database and start the server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
});