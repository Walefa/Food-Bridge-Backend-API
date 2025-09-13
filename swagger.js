const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'FoodBridge SA API',
    version: '1.0.0',
    description: 'A simple API to connect food donors with NGOs in South Africa',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};

// Options for the swagger docs - FIX THE PATHS HERE
const options = {
  swaggerDefinition,
  apis: [
    './routes/*.js',        // All files in routes folder
    './routes/*/*.js',      // All files in subfolders of routes
    './models/*.js',        // If you have model definitions in models
  ],
};

const swaggerSpec = swaggerJSDoc(options);

// Setup function to be used in app.js
const setupSwagger = (app) => {
  // Serve Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  
  // Serve the raw JSON spec
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  
  console.log('Swagger docs available at http://localhost:3000/api-docs');
  console.log('Raw spec available at http://localhost:3000/api-docs.json');
};

module.exports = setupSwagger;