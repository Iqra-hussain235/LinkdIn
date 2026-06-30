
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import userRoutes from "./routes/user.routes.js";

import postRoutes from "./routes/posts.routes.js";

dotenv.config();

const app=express();

app.use(cors());

app.use(express.json());
app.use(postRoutes)
app.use(userRoutes)
app.use(express.static("uploads"))

const start =async()=>{
  
    try{
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
    

               

    app.listen(9080, ()=>{
        console.log("Server is running on port 9080")
    })
} catch (error) {
    console.error(error);
  }
}

start();