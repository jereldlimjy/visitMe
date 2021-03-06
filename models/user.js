const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const UserSchema = new Schema({
    location: {
        type: Array,
        required: true
    },
    link: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    joined: {
        type: Date,
        default: () => Date.now()
    },
    // visits: [
    //     {
    //         type: Schema.Types.ObjectId,
    //         ref: 'Visit'
    //     }
   	// ]
})



UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);