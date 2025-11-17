// Main entry point for the user management service
import express from 'express';

const app = express();
const port = process.env.USER_MANAGEMENT_PORT || 3001;

app.use(express.json());

// Add routes for authentication and user management
// app.use('/auth', authRoutes);
// app.use('/users', userRoutes);

app.listen(port, () => {
  console.log(`User management service listening at http://localhost:${port}`);
});
