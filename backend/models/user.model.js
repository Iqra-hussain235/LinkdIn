import mongoose from "mongoose";


const UserSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    username:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    active:{
        type:Boolean,
        default:true
    },
    password:{
        type:String,
        required:true
    },
    ProfilePicture:{
         type:String,
        default:"default.jpg"
    },
     createdAt:{
        type:Date,
        default:Date.now

    },
    token:{
        type:String,
        default:''
    }

});

const User =mongoose.model("User",UserSchema);

export default User;