import express from "express";
import dotenv from "dotenv";
import sessionRoute from "./routes/sessionRoute"

dotenv.config();

const app = express();
const port =  process.env.PORT

app.use(express.json())


// routes
app.use(`/api/v1/session`,sessionRoute)


app.listen(port,() => { 
    console.log(`server is running on ${port}`);
    
})