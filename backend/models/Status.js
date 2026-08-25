const mongoose = require('mongoose');


const statusSchema = new mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content:{
        type: String,
        required: true
    },
    contentType:{
        type: String,
        enum: ['text', 'image', 'video'],
        required: true , 
        default: 'text'
    },
    viewers:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    ExpiresAt:{
        type: Date,
        default: Date.now,
        expires: 86400 // 24 hours in seconds
    },
},{timestamps: true});

const Status = mongoose.model('Status', statusSchema);