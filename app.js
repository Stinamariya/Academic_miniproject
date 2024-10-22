const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cors = require("cors");
const Jwt = require("jsonwebtoken");
const Registration = require('./models/registrations'); // Adjust the path accordingly

const { userModel } = require("./models/Users");
const { postModel } = require("./models/posts");
const {EventModel}  = require('./models/Events'); // Correct the path as necessary

const path = require("path");
const multer = require("multer"); // For image upload

const app = express();

// Static folder for uploaded images
app.use('/uploads', express.static( 'uploads'));

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect("mongodb+srv://stina:stina2006@cluster0.rfrzosg.mongodb.net/blogAppdb?retryWrites=true&w=majority&appName=Cluster0");

// Multer Setup (for image uploads)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage:storage });

const jwt = require('jsonwebtoken');


// Send token as a response after login/signup

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ status: "No token provided" });
  }

  jwt.verify(token, "blogApp", (err, user) => {
    if (err) {
      console.error('Token verification error:', err); // Log the error for debugging
      return res.status(403).json({ status: "Invalid Authentication" });
    }
    if (!user._id) {
      console.error('No user ID in token:', user); // Check if user._id is missing
      return res.status(403).json({ status: "Invalid Authentication: No user ID found" });
    }

    req.user = user; // Attach the user info to the request object
    next(); // Call next to pass control to the next middleware
  });
};

module.exports = authenticateToken; // Export the middleware to use it elsewhere




// Signup API
app.post("/Signup", async (req, res) => {
  try {
    const { username, email, password,role } = req.body;

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const newUser = new userModel({ username, email, password: hashedPassword,role });

    // Save the user in the database
    const savedUser = await newUser.save();

    // Generate token using the saved user data
    const token = jwt.sign({ _id: savedUser._id, role: savedUser.role }, "blogApp", { expiresIn: "1d" });

    // Respond with the token
    res.status(201).json({ token });
  } catch (error) {
    console.error('Signup error:', error.message);
    res.status(500).json({ message: 'Server error during signup' });
  }
});


// Login
app.post("/Login", async (req, res) => {
  try {
    const user = await userModel.findOne({ email: req.body.email });
    if (!user) return res.json({ status: "Invalid Email Id" });

    const passwordIsValid = bcrypt.compareSync(req.body.password, user.password);
    if (!passwordIsValid) return res.json({ status: "Incorrect Password" });

    const token = jwt.sign({ _id: user._id, role: user.role }, "blogApp", { expiresIn: "1d" });
    
    // Include username in the response
    res.json({ 
      status: "success", 
      token, 
      role: user.role, 
      userId: user._id,
      username: user.username // Add this line to include the username
    });
  } catch (error) {
    res.status(500).json({ status: "error", errorMessage: error.message });
  }
});



// Get all users (admin only)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
      const users = await userModel.find({});
      res.json(users);
  } catch (error) {
      res.status(500).json({ status: 'Error fetching users', error: error.message });
  }
});

// Create a new user (admin only)
app.post('/api/users', authenticateToken, async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const newUser = new userModel({ username, email, password: hashedPassword, role });
      await newUser.save();
      res.status(201).json({ status: 'User created successfully' });
  } catch (error) {
      res.status(400).json({ status: 'Error creating user', error: error.message });
  }
});

// Update a user (admin only)
app.put('/api/users/:id', authenticateToken, async (req, res) => {
  const { username, email, role } = req.body;

  try {
      const updatedUser = await userModel.findByIdAndUpdate(
          req.params.id,
          { username, email, role },
          { new: true }
      );

      if (!updatedUser) {
          return res.status(404).json({ status: 'User not found' });
      }

      res.json({ status: 'User updated successfully', user: updatedUser });
  } catch (error) {
      res.status(400).json({ status: 'Error updating user', error: error.message });
  }
});

// Delete a user (admin only)
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  try {
      const deletedUser = await userModel.findByIdAndDelete(req.params.id);

      if (!deletedUser) {
          return res.status(404).json({ status: 'User not found' });
      }

      res.json({ status: 'User deleted successfully' });
  } catch (error) {
      res.status(500).json({ status: 'Error deleting user', error: error.message });
  }
});



// Create Post
app.post("/CreatePost", upload.single('image'), authenticateToken, async (req, res) => {
  const { title, content } = req.body;
  const userId = req.user._id; 
  console.log("User ID:", userId); // Log userId to see if it's being set
  if (!title || !content) {
    return res.status(400).json({ status: "All fields are required" });
  }
  // Ensure userId is set before proceeding
  if (!userId) {
    return res.status(400).json({ status: "User ID is required" });
  }

  const blogExist = await postModel.findOne({ title });
  if (blogExist) {
    return res.status(400).json({ status: "Blog post with this title already exists" });
  }
try{
  const newPost = new postModel({
    title: req.body.title,
    content: req.body.content,
    userId: userId, // Only store the user ID here
    image: req.file ? req.file.filename : null

  });

  
    await newPost.save();
    res.status(201).json({ status: "Blog post created successfully" });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ status: "Error creating blog post", error: error.message });
  }
});

// Fetch Post by ID
app.get('/api/Posts/:id', async (req, res) => {
  const postId = req.params.id;
  try {
    const post = await postModel.findById(postId);
    if (!post) {
      return res.status(404).json({ status: "Post not found" });
    }
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ status: "Error fetching post", error: error.message });
  }
});

// Edit Post
app.put('/api/editPost/:id', upload.single('image'), authenticateToken, async (req, res) => {
  const { title, content } = req.body;
  const postId = req.params.id;

  try {
    const post = await postModel.findById(postId);

    if (!post) {
      return res.status(404).json({ status: "Post not found" });
    }

    // Check if the user is either the post owner or an admin
    if (post.userId.toString() !== req.user._id && req.user.role !== 'admin') {
      return res.status(403).json({ status: "You do not have permission to edit this post" });
    }

    post.title = title || post.title;
    post.content = content || post.content;

    // Update the image only if a new file is uploaded
    if (req.file) {
      post.image = req.file.filename; 
    }

    await post.save();
    res.status(200).json({ status: "Post updated successfully", post });
  } catch (error) {
    res.status(500).json({ status: "Error updating post", error: error.message });
  }
});


// Delete Post
app.delete('/deletePost/:id', authenticateToken, async (req, res) => {
  const postId = req.params.id;

  try {
    const post = await postModel.findById(postId);

    if (!post) {
      return res.status(404).json({ status: "Post not found" });
    }

    // Check if the user is either the post owner or an admin
    if (post.userId.toString() !== req.user._id && req.user.role !== 'admin') {
      return res.status(403).json({ status: "You do not have permission to delete this post" });
    }

    await postModel.deleteOne({ _id: postId });
    res.status(200).json({ status: "Post deleted successfully" });
  } catch (error) {
    res.status(500).json({ status: "Error deleting post", error: error.message });
  }
});


// view all posts
app.get('/ViewAll', async (req, res) => {
  try {
    const Posts = await postModel.find().populate('userId', 'username'); // Populate userId to get username
    console.log(Posts); // Log the posts to check their structure
    res.status(200).json(Posts);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch posts', error: err.message });
  }
});

//view my post
app.get('/user/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  
  // Allow admin, faculty, and student to fetch their own posts
  if (req.user.role === 'admin' || req.user.role === 'faculty' || req.user.role === 'student') {
    try {
      // Fetch posts by userId and populate the 'userId' field with the user's 'username'
      const userPosts = await postModel.find({ userId }).populate('userId', 'username');
      
      // Return a 200 status with an empty array if no posts are found
      if (!userPosts.length) {
        return res.status(200).json([]); 
      }

      // Send the posts if found
      res.status(200).json(userPosts);
    } catch (err) {
      // Handle errors and return a 500 status
      res.status(500).json({ message: 'Failed to fetch user posts', error: err.message });
    }
  } else {
    // Return 403 Forbidden if the user is not authorized
    return res.status(403).json({ message: 'Access denied' });
  }
});

// Add Comment
app.post('/api/Posts/:id/comments', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;
  

  if (!comment) {
    return res.status(400).json({ status: "Comment is required" });
  }

  try {
    const post = await postModel.findById(id);
    if (!post) {
      return res.status(404).json({ status: "Post not found" });
    }

    // Create a new comment object
    const newComment = {
      userId: req.user.id, // Get userId from the token
      comment,
      timestamp: Date.now(),
    };

    // Push the new comment into the comments array
    post.comments.push(newComment);
    await post.save();

    res.status(201).json({ status: "Comment added successfully", post });
  } catch (error) {
    console.error("Error adding comment:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ status: "Validation error", error: error.message });
    }
    res.status(500).json({ status: "Error adding comment", error: error.message });
  }
});


// Combined endpoint for fetching recent posts and upcoming events
app.get('/api/dashboard/data', async (req, res) => {
  try {
    // Fetch recent posts
    const recentPosts = await postModel.find()
      .sort({ createdAt: -1 }) // Sort by creation date, newest first
      .limit(5) // Limit to the most recent 5 posts
      .populate('userId', 'username') // Populate the username field from User model
      .exec();

    // Fetch upcoming events
    const upcomingEvents = await EventModel.find({ eventDatedate: { $gte: new Date() } }) // Fetch events that are on or after the current date
  .sort({ eventDate: 1 }) // Sort by date, upcoming first
  .exec();


    // Respond with both datasets
    res.status(200).json({ recentPosts, upcomingEvents });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Search Posts
app.get('/api/posts/search/:searchBy', async (req, res) => {
  const { query, searchBy } = req.query;

  // Validate query and searchBy
  if (!query || !searchBy) {
    return res.status(400).json({ status: 'Query and searchBy parameters are required.' });
  }

  try {
    let searchCriteria = {};
    
    // Set search criteria based on searchBy
    if (searchBy === 'title') {
      searchCriteria.title = { $regex: query, $options: 'i' }; // Case-insensitive search by title
    } else if (searchBy === 'author') {
      // Find the author by username
      const author = await userModel.findOne({ username: { $regex: query, $options: 'i' } });
      if (author) {
        searchCriteria.userId = author._id; // Use the author's ID to search
      } else {
        return res.status(404).json({ status: 'Post doesn\'t exist', message: `No posts found for author: ${query}` });
      }
    } else {
      return res.status(400).json({ status: 'Invalid search type.' });
    }

    // Find posts based on the search criteria
    const posts = await postModel.find(searchCriteria).populate('userId', 'username');
    
    // Check if posts were found
    if (posts.length === 0) {
      return res.status(404).json({ status: 'Post doesn\'t exist', message: `No posts found matching ${searchBy}: ${query}` });
    }

    // Send the found posts as a response
    res.status(200).json(posts);
  } catch (error) {
    console.error('Error searching posts:', error);
    res.status(500).json({ status: 'Error searching posts', error: error.message });
  }
});






// Create an event
app.post('/createEvent', authenticateToken, async (req, res) => {
  try {
    const { eventName, description, eventDate, eventTime } = req.body;

    // Create the event object
    const eventData = {
      eventName,
      description,
      eventDate,
      eventTime,
      createdAt: new Date(),
    };

    // Save the event to the database
    const savedEvent = await EventModel.create(eventData); // Ensure this is defined

    // Respond with the saved event data
    res.status(201).json(savedEvent);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ message: 'Error creating event', error: error.message });
  }
});



// Fetch all events original
app.get('/ViewEvents',  async (req, res) => {
  

  try {
    const events = await EventModel.find().populate('registrants.userId', 'username email'); // Populate user details // Fetch all events
    console.log('Events fetched successfully:', JSON.stringify(events, null, 2));
    res.status(200).json(events); // Respond with all events
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Error fetching events', error: error.message });
  }
});

// Endpoint to get all events and their respective registrants
// app.get('/api/events/registrations', async (req, res) => {
//   try {
    
//       const events = await EventModel.find().populate('registrants.userId', 'username email'); // Populate user details
//       console.log('Events fetched successfully:', JSON.stringify(events, null, 2));
//       res.json(events);
//   } catch (error) {
//     console.error('Error fetching events:', error); // Log the error
//       res.status(500).json({ error: 'Server Error' });
//   }
// });


app.get('/ViewEvents/:eventId/registrants', authenticateToken, async (req, res) => {
  const { eventId } = req.params;
  try {
    const event = await EventModel.findById(eventId).select('registrants');
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.status(200).json(event.registrants); 
  } catch (error) {
    console.error('Error fetching registrants:', error);
    res.status(500).json({ message: 'Error fetching registrants', error: error.message });
  }
});



//Register for an event
app.post('/api/events/:eventId/register',authenticateToken, async (req, res) => {
  console.log('Authenticated User:', req.user);
  const userId = req.user._id; // Get the user ID from the token payload
  const {eventId} = req.params;

  try {
    const event = await EventModel.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const alreadyRegistered = event.registrants.some((registrant) => registrant.userId && registrant.userId.toString() === userId);

    if (alreadyRegistered) {
      return res.status(400).json({ message: 'You are already registered for this event.' });
    }

    // Add the user to registrants
    event.registrants.push({ userId });
    await event.save();

    res.status(200).json({ message: 'Registration successful', event });
  } catch (error) {
    console.error('Error registering for event:', error);
    res.status(500).json({ message: 'Server error. Please try again later.', error: error.message });
  }
});
      


// View Registered Events for Student
app.get('/api/students/:id/registered-events', authenticateToken, async (req, res) => {
  try {
    // Verify if the user accessing this route is the student or admin
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Access denied. Only students or admin can access this resource.' });
    }

    // Ensure the student is accessing their own data or admin is accessing
    if (req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Access denied. You can only view your own registered events.' });
    }

    // Find events where the student is registered
    const registeredEvents = await EventModel.find({ 'registrants.userId': req.params.id });

    // Return the registered events
    res.status(200).json(registeredEvents);
  } catch (error) {
    console.error('Error fetching registered events:', error);
    res.status(500).json({ status: 'Error fetching registered events', error: error.message });
  }
});

// // Sample function to register a user for an event
// async function registerUserForEvent(eventId, userId) {
//   try {
//       // Find the event and update it
//       await EventModel.findByIdAndUpdate(
//           eventId,
//           { $push: { registrants: { userId: userId } } }, // Correctly structured object
//           { new: true, useFindAndModify: false }
//       );
//       console.log('User registered for the event successfully.');
//   } catch (error) {
//       console.error('Error registering user for event:', error);
//   }
// }


// Function to delete expired events
const deleteExpiredEvents = async () => {
  try {
    // Get the current date and time
    const now = new Date();
    console.log(`Checking for expired events at: ${now}`);

    // Find and delete events where the eventDate has passed
    const result = await EventModel.deleteMany({ eventDate: { $lt: now } });

    // Log the result
    console.log(`${result.deletedCount} expired events deleted.`);
  } catch (err) {
    console.error('Error deleting expired events:', err);
  }
};
console.log('Starting the expired events deletion interval...');
setInterval(() => {
  console.log('Running task to delete expired events...');
  deleteExpiredEvents();
}, 360000);//every 10 seconds to test







// Admin Endpoint to Get All Events with Registered Students
app.get('/ViewEvents', authenticateToken, async (req, res) => {
  try {
      const events = await EventModel.find().populate('registrants.userId', 'username email');

      console.log('Fetched Events:', events); // Log the events to check their structure

      if (!events || events.length === 0) {
          return res.status(404).json({ message: "No events found" });
      }

      // Format the output for the admin
      const formattedEvents = events.map(event => ({
        eventName: event.eventName,
        description: event.description,
        registrants: event.registrants.map(registrant => ({
            _id: registrant.userId ? registrant.userId._id : null, // Ensure userId exists
            username: registrant.userId ? registrant.userId.username : 'Unknown User', // Fallback to 'Unknown User'
            email: registrant.userId ? registrant.userId.email : 'Unknown Email', // Fallback to 'Unknown Email'
        }))
              .filter(registrant => registrant._id !== null), // Filter out null values
      }));

      res.status(200).json(formattedEvents);
  } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).json({ message: 'Server error', error });
  }
});






// Search events by eventName or description
app.get('/events/search', async (req, res) => {
  try {
    const { query } = req.query; // Get the search query from the request

    // Perform a case-insensitive search for events where the eventName or description contains the query
    const events = await Event.find({
      $or: [
        { eventName: { $regex: query, $options: 'i' } }, // 'i' makes it case-insensitive
        { description: { $regex: query, $options: 'i' } }
      ]
    });

    // If no events found, return an empty array
    if (events.length === 0) {
      return res.status(200).json([]); // Return empty array if no matches found
    }

    // Return the matched events
    res.status(200).json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Server error', error });
  }
});








// Start Server
app.listen(3032, () => console.log("Server started"));
