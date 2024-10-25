const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  comment: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  comments: [commentSchema], // Embeds comment schema
});

const Post = mongoose.model('Post', postSchema);
module.exports = Post;
