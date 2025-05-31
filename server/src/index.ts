import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { registerRoutes } from './utils/routeRegister';
import { atlassianRoutes } from './routes/atlassianRoutes';

// Load environment variables first
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Register routes
registerRoutes(app, atlassianRoutes);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
