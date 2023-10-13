const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        require:true,
        unique:true,
    },
    password:{
        type:String,
        required:true
    },
    verified:{
        type: Boolean,
        default:false
    },
    verificationToken:String,
    addresses:[
        {
            name:String,
            mobile:String,
            houseNo:String,
            street:String,
            country:String,
            pincode:String
        }
    ],
    orders:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"Order"
        }
    ],
    createAt:{
        type:Date,
        default:Date.now,
    }
})


const User = mongoose.model("User",userSchema);
module.exports = User;