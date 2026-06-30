
import User from "../models/user.model.js"
import Profile from "../models/Profile.model.js"
import crypto from 'crypto'
import PDFDocument from 'pdfkit'
import fs from "fs";

import path from "path";

import bcrypt from 'bcrypt';

import mongoose from "mongoose";
import ConnectionRequest from "../models/connections.model.js";
const { connection } = mongoose;

const convertUserDataTOPDF=async(userData)=>{
    const doc =new PDFDocument();
    const outputPath=crypto.randomBytes(32).toString("hex")+".pdf";
    const stream =fs.createWriteStream("uploads/" + outputPath);
    doc.pipe(stream);

    if (
    userData?.userId?.profilePicture &&
    fs.existsSync("uploads/" + userData.userId.profilePicture)
  ) {
    doc.image(
      "uploads/" + userData.userId.profilePicture,
      { align: "center", width: 100 }
    );
  }

    // doc.image(`uploads/${userData.userId.profilePicture}`,{align:"center",width:100});
    doc.fontSize(14).text(`Name:${userData.userId.name}`);
    doc.fontSize(14).text(`Username:${userData.userId.username}`);
    doc.fontSize(14).text(`Email:${userData.userId.email}`);
    doc.fontSize(14).text(`Bio:${userData.bio}`);
    doc.fontSize(14).text(`Current Position:${userData.CurrentPost}`);
   
    doc.fontSize(14).text("Past Work: ")
    userData.pastWork.forEach((work,index)=>{
        doc.fontSize(14).text(`company Name:${work.Company}`);
        doc.fontSize(14).text(`Position Name:${work.position}`);
        doc.fontSize(14).text(`Years:${work.years}`);
        
    })
    doc.end();
    return outputPath;

}

export const register=async(req,res)=>{

    try{
        const {name,email,password,username}=req.body;

        if(!name ||!email ||!password ||!username)return res.status(400).json({message:"All fields are required"})
        
            const user =await User.findOne({email});

            if(user)return res.status(400).json({message:"User already exists"})

            const hashedPassword=await bcrypt.hash(password,10);
            const newUser= new User({
                name,
                email,
                password:hashedPassword,
                username
            });
            
            await newUser.save();
            
            
            const profile=new Profile({userId:newUser.id});
            await profile.save();
            
            return res.json({message:"User Created"})

    }catch(error){
    return res.status(500).json({message:error.message})
    }

}

export const login =async(req,res)=>{
    try{
        const {email,password}=req.body;

                if(!email ||!password )return res.status(400).json({message:"All fields are required"})
      
                    const user =await User.findOne({
                        email
                    });
                 if(!user)return res.status(400).json({message:"User does not exist"})  
                    const isMatch =await bcrypt.compare(password,user.password);
                if (!isMatch) return res.status(400).json({message:"Invalid Credentials"})
                    const token =crypto.randomBytes(32).toString("hex");
                await User.updateOne({_id: user._id},{token});
                  return res.status(200).json({
      message: "Login successful",
      token:token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username
      }
    });

              
    }catch(error){
          return res.status(500).json({ message: error.message });

    }

}
export const uploadProfilePicture=async(req,res)=>{
    const {token}=req.body;
    try{
        
     
        const user =await User.findOne({token:token});
    
        if(!user){
            return res.status(404).json({message: "User not Found"})
        }

        user.ProfilePicture=req.file.filename;

        await user.save();
        return res.json({message:"Profile Picture Updated"})
    }catch(error){
    return res.status(500).json({message:error.message}) 
    }
}

export const updateUserProfile=async(req,res)=>{
    try{
        const {token, ...newUserData}=req.body;
        const user=await User.findOne({message:"User not found"})

        const {username ,email}=newUserData;
        const existingUser=await User.findOne({$or:[{username},{email}]})
        if(existingUser){
            if(existingUser||String(existingUser._id)!==String(user._id)){

                return res.status(400).json({message:"User already exists"})
            }
        }
        Object.assign(user,newUserData);
        await user.save();
        return res.json({message:"User Update"})


    }catch(error){
        return res.status(500).json({message:error.message})

    }
}
export const getUserAndProfile=async(req,res)=>{
    try{
        const {token}=req.body;
        const user=await User.findOne({token:token})
        if(!user){
            return res.status(404).json({message:"User not found"})
        }
        const userProfile=await Profile.findOne({userId:user._id})
        .populate('userId','name email username profilePicture');
        return res.json(userProfile)

    }catch(error){
        return res.status(500).json({message:error.message})
    }
}

 export const updateProfileData=async(req,res)=>{
    try{
        const { token, ...newProfileData}=req.body;
        const userProfile=await User.findOne({token:token});

        if(!userProfile){
            return res.status(400).json({message:"User not found"})
        }
        const profile_to_update=await Profile.findOne({userId:userProfile._id})
        Object.assign(profile_to_update,newProfileData);
        await profile_to_update.save();
        return res.json({message:"Profile Update"})

    }catch(error){
        return res.status(500).json({message:error.message})
    }
 }

 export const getAllUserProfile =async(req,res)=>{
    try{

        const profiles=await Profile.find().populate('userId','name username email proflePicture');
    
        return res.json({profiles})
    }catch(error){
        return res.status(500).json({message:error.message})
    }

 }
 export const downloadProfile=async(req,res)=>{
    const user_id=req.query.id;
    const userProfile=await Profile.findOne({userId:user_id}).populate('userId','name username email profilePicture');
    let outputPath=await convertUserDataTOPDF(userProfile); 
    console.log("User Image:", userProfile.userId.profilePicture);
    return res.json({"message":outputPath});
}

export const sendConnectionRequest=async(req,res)=>{
 const {token, connectionId}=req.body;
 try{
   
    const user=await User.findOne({token});

    const connectionUser = await User.findOne({_id:connectionId});

    if(!connectionUser){
        return res.status(404).json({message:"Connection User not Found"})
    }

      if(!user){
        return res.status(404).json({message:"User not found"})
    }
    const existingRequest= await ConnectionRequest.findOne
    ({
        userId:user._id,
        connectionId:connectionUser._id
    })
    if(existingRequest){
        return res.status(400).json({message:"Request already sent"})
    }

    const request =new ConnectionRequest({
        userId:user._id,
        connectionId:connectionUser._id
    });
    await request.save();

    return res.json({message:"Request Sent"})


  

 }catch(err){
    return res.status(500).json({message:err.message})
 }

}

export const getMyConnectionsRequests = async (req,res)=>{
    const {token}=req.body;
    try{
       const user=await User.findOne({token});
       if(!user){
        return res.status(404).json({message:"User not found"})
       }
       const connections =(await ConnectionRequest.find({userId:user._id}))
       .populate(`connectionId`,`name username email profilePicture`);

       return res.json({connections})


    }catch(err){
        return res.status(500).json({message:err.message})
    }
}
export const whatAreMyConnections=async (req,res)=>{
    const {token}=req.body;

    try{
         const user =await User.findOne({token});
         if(!user){
            return res.status(404).json({message:"User not found"})
         }

         const connections= await ConnectionRequest.find({connectionId:user._id})
         .populate(`userId`,`name username email profilePicture`);

         return res.json(connections);

    }catch(err){
        return res.status(500).json({message:err.message})
    }
}

export const acceptConnectionRequest=async (req,res)=>{
    const {token,requestId,action_type}=req.body;

    try{
      const user=await User.findOne({token});
      if(!user){
        return res.status(404).json({message:"User not found"})
      }
      const connection =await ConnectionRequest.findOne({_id:requestId});
    
      if(!connection){
        return res.status(404).json({message:"Connection not found"})
      }
      if(action_type === "accept"){
        connection.status_accepted=true;
      }
      else{
        connection.status_accepted=false;
      }

      await connection.save();
      return res.json({message:"Request Update"});


    }catch(err){
    return res.status(500).json({message:err.message})
    }
} 
export const commentPost=async(req,res)=>{

    const {token,post_id,commentBody}=req.body;
    try{
        const user=await User.findOne({token:token}).select("_id");
        if(!user){
            return res.status(404).json({message:"User not found"})
        }
        const post=await Post.findOne({
            _id:post_id
        });
        if(!post){
            return res.satatus(404).json({message:"Post not found"})
        }
        const comment=new Comment({
            userId:user._id,
            postId:post._id,
            comment:commentBody
        });
        await comment.save();

        return res.status(200).json({message:"Comment Added"})
    }
    catch(err){
        return res.status(500).json({message:err.message})
    }
}

export const get_comments_by_post=async(req,res)=>{
    const {post_id}=req.body;

    try{
        const post=await Post.findOne({_id:post_id});
        if(!post){
            return res.status(404).json({message:"Post not found"})
        }
        return res.json({message:"Post Deleted"})
    }catch(err){
        return res.status(500).json({message:err.message})
    }
}
export const delete_comment_of_user=async(req,res)=>{
    const {token,comment_id}=req.body;

    try{
        const user=await User.findOne({token:token})
        .select("_id");

        if(!user){
            return res.status(404).json({message:"User not found"})
        }

        const comment=await Comment.findOne({"_id":comment_id})

        if(!comment){
            return res.status(404).json({message:"Comment not found"})
        }

        if(comment.userId.toString()!==user._id.toString()){
            return res.status(401).json({message:"Unauthorized"})
        }
        await Comment.deleteOne({"_id":comment_id});

        return res.json({message:"Comment Deleted"})

    
 

    }catch(err){
        return res.status(500).json({message:err.message})
    }
}
export const increment_likes=async(req,res)=>{
    const {post_id}=req.body;

    try{
       const post=await Post.findOne({_id:post_id});
       if(!post){
        return res.status(404).json({message:"Post not found"})
       }
       post.likes=post.likes+1;
       await post.save();
       return res.json({message:"Likes Incremented"})
    }catch(err){
      return res.status(500).json({message:err.message})
    }
}

// export const getAllPosts=async(req,res)=>{
//     try{
//         const posts=await postMessage.find().populate('userId','name username email profilePicture')
//         return res.json({posts})
//     }catch(err){
//         return res.status(500).json({message:err.message})
//     }
// }