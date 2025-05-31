import express from 'express';
import authRoutes from './routes/authRoutes.js';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api', authRoutes);

// app.get('/', (req, res)=>{
//     res.send("hello from york simiiii")
// })

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
