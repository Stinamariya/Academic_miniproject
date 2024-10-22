// const mongoose = require("mongoose");

// const postSchema = new mongoose.Schema({
//   title: { type: String, required: true },
//   content: { type: String, required: true },
//   userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to User model
//   image: { type: String },
//   createdAt: { type: Date, default: Date.now },
//   updatedAt: { type: Date, default: Date.now },
// });

// postSchema.pre('save', function(next) {
//   this.updatedAt = Date.now();
//   next();
// });

// const Post = mongoose.model('Post', postSchema);
// module.exports = { postModel: Post };


const mongoose = require('mongoose'); 
const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  image: { type: String },
  comments: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      comment: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
postSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const postModel = mongoose.model('Post', postSchema);
module.exports = { postModel };




// const mongoose = require('mongoose');

// // Define the comment schema
// const commentSchema = new mongoose.Schema({
//   userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to User
//   comment: { type: String, required: true },
//   createdAt: { type: Date, default: Date.now },
// });

// // Define the post schema
// const postSchema = new mongoose.Schema({
//   title: { type: String, required: true },
//   content: { type: String, required: true },
//   userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to User
//   image: { type: String }, // URL or file path for images
//   comments: [commentSchema], // Array of comments
//   createdAt: { type: Date, default: Date.now },
//   updatedAt: { type: Date, default: Date.now },
// });

// // Middleware to update the updatedAt field before saving
// postSchema.pre('save', function(next) {
//   this.updatedAt = Date.now();
//   next();
// });

// // Create and export the Post model
// const postModel = mongoose.model('Post', postSchema);
// module.exports = { postModel };
// Post Schema
// const mongoose = require('mongoose');
// const postSchema = new mongoose.Schema({
//   title: { type: String, required: true },
//   content: { type: String, required: true },
//   userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   image: String,
//   comments: [
//     {
//       userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//       comment: { type: String, required: true },
//       timestamp: { type: Date, default: Date.now },
//     },
//   ],
//   createdAt: { type: Date, default: Date.now },
//   updatedAt: { type: Date, default: Date.now },
// });

// // Add pre-save middleware for updating the updatedAt field
// postSchema.pre('save', function (next) {
//   this.updatedAt = Date.now();
//   next();
// });

// const Post = mongoose.model('Post', postSchema);

