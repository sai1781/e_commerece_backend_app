const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();


const jwt = require('jsonwebtoken');
const app = express();
app.use(bodyParser.json()); // Add this line for JSON data parsing
const http = require('http');

const port = 8000;
const cors = require('cors');
const corsOptions = {
  origin: 'http://196.162.1.21:8080', // Replace with your React Native app's URL
  optionsSuccessStatus: 200, // Some legacy browsers (IE11) choke on 204
};

app.use(cors(corsOptions));

app.use(bodyParser.urlencoded({extended: false}));
// require('dotenv').config();

// Update below to match your own MongoDB connection string.
const MONGO_URL = process.env.MONGO_URL;
const password = process.env.Email_passWord;

mongoose
  .connect(
    'mongodb+srv://nagasaitac143:M0OfhEOjtMKwuxsN@cluster0.q3vlsqo.mongodb.net/',
    {
      useNewUrlParser: true,
      useunifiedTopology: true,
    },
  )
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch(err => {
    console.log('Error connecting to MongoDB', err);
  });

app.listen(port, () => {
  console.log('Server is running on part 8081');
});

//Here now we are start writing the end points

const User = require('./models/user.model');
const Order = require('./models/order.model');

//function to send the verification email to the user
const sendVerificationEmail = async (email, verificationToken) => {
  //create a nodemailer transport
  //Here we are using the nodemailer to the send the verification mails...

  // const transporter = nodemailer.createTransport({
  //   host: 'your-smtp-host', // e.g., 'smtp.gmail.com'
  //   port: 587, // Port for your SMTP server
  //   secure: false, // Use SSL or not, depending on your provider
  //   auth: {
  //     user: 'nagasaitac143@gmail.com',
  //     pass: 'mile lusz cmaw luvg',
  //   },
  // });

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'nagasaitac143@gmail.com',
      pass: password,
    },
  });
  const mailOptions = {
    from: 'amazon.com',
    to: email,
    subject: 'Email verification',
    text: `Please click the followinng link to verify you email :http://localhosts:8000/verify/${verificationToken}`,
  };

  //Sending the email
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.log('Error sending the verification email', error);
  }
};

app.post('/register', async (req, res) => {
  console.log('sai @@@@@@@@@@@');
  try {
    const {name, email, password} = req.body;
    console.log(req.body + ' Incoming data');
    console.log('name => ' + name);
    console.log('sai');
    // Check if the email is already registered
    const existingUser = await User.findOne({email});
    if (existingUser) {
      console.log('Email already registered:', email); // Debugging statement
      return res.status(400).json({message: 'Email already registered'});
    }

    // Create a new user
    const newUser = new User({name, email, password});

    // Generate and store the verification token
    newUser.verificationToken = crypto.randomBytes(20).toString('hex');

    // Save the user to the database
    await newUser.save();

    // Debugging statement to verify data
    console.log('New User Registered:', newUser);

    // Send verification email to the user
    // Use your preferred email service or library to send the email
      sendVerificationEmail(newUser.email, newUser.verificationToken);

    res.status(201).json({
      message:
        'Registration successful. Please check your email for verification.',
    });
  } catch (error) {
    console.log('Error during registration:', error); // Debugging statement
    res.status(500).json({message: 'Registration failed'});
  }
});

//defining the endpoint to verify the email..
app.get('/verify/:token', async (req, res) => {
  try {
    const token = req.params.token;
    //find the user with the given verification Token
    const user = await User.findOne({verificationToken: token});
    if (!user) {
      return res.status(404).json({message: 'Invalid verification Token'});
    }

    //Mark the user as verified...
    user.verified = true;
    user.verificationToken = undefined;
    await user.save();

    res.status(200).json({message: 'Email verified successfully'});
  } catch (error) {
    res.status(500).json({message: 'Email verification failed'});
  }
});

const generateSecretKey = () => {
  const secretKey = crypto.randomBytes(32).toString('hex');
  return secretKey;
};

const secretKey = generateSecretKey();
app.post('/login', async (req, res) => {
  console.log('login triggering in Backend');
  try {
    const {email, password} = req.body;
    //check if the user exists are not
    const user = await User.findOne({email});
    if (!user) {
      return res.status(401).json({message: 'Invalid email or Password'});
    }
    //checkking the password is correct or Not...
    if (user.password !== password) {
      return res.status(401).json({message: 'Invalid Password'});
    }
    //  Generate a Token
    const token = jwt.sign({userId: user._id}, secretKey);
    res.status(200).json({token});
  } catch (error) {
    res.status(500).json({message: 'Login failed'});
  }
});

//Here we are creating the endpoint to store the address from frontend in backend...

app.post('/addresses', async (req, res) => {
  console.log('addresses endpoint is triggering here ');
  try {
    const {userId, address} = req.body;
    //find the user by their Email address...
    const user = await User.findById(userId);
    console.log(user);
    if (!user) {
      return res.status(404).json({message: 'user not found'});
    }

    //add the new address to the user's address Array...
    user.addresses.push(address);

    //save the updated user Id in the backend...
    await user.save(); // This line of will save the address in database MongoDB...

    res.status(200).json({message: 'Address created Successfully'});
  } catch (error) {
    res.status(500).json({message: 'Error Adding the Address'});
  }
});

//Endpoint to get the all address of a Particular user

app.get('/addresses/:userId', async (req, res) => {
  console.log('address endpoint is triggering here');
  try {
    const userId = req.params.userId;
    console.log(userId);
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({message: 'User not Found'});
    }

    const addresses = user.addresses;
    console.log(addresses);
    res.status(200).json(addresses);
  } catch (error) {
    res.status(500).json({message: 'Error getting the user address'});
  }
});

//Endpoint to store all the Ordered Products...

app.post('/orders', async (req, res) => {
  try {
    const {userId, cartItems, totalPrice, shippingAddress, paymentMethod} =
      req.body;
    const user = await User.findById(userId);
    console.log(user);
    console.log(userId);
    console.log(cartItems);
    console.log(totalPrice);
    console.log(shippingAddress);
    console.log(paymentMethod);
    if (!user) {
      return res.status(404).json({message: 'User Not Found'});
    }
    //Create an Array of product Objects from the cart Items..
    const products = cartItems.map((e, idx) => ({
      name: e?.title,
      quantity: e?.quantity,
      price: e?.price,
      image: e?.image,
    }));
    //Creating the new Order
    const order = new Order({
      user: userId,
      shippingAddress: shippingAddress,
      products: products,
      totalPrice: totalPrice,
      paymentMethod: paymentMethod,
    });
    console.log('shipping Address @@@@ => ', shippingAddress);
    await order.save();
    res.status(200).json({message: 'Order created Successfully'});
  } catch (error) {
    console.log('Error creating the Orders', error);
    res.status(500).json({message: "Error Creating Order's"});
  }
});

//Get the user Profile
app.get('/profile/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({message: 'User not found'});
    }
    res.status(200).json({user});
  } catch (error) {
    console.log('error getting the profile', error);
    res.status(500).json({message: 'Errror retriveing the user Profile'});
  }
});

//TO get the ordered list for specific User...

app.get('/orders/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    const orders = await Order.find({user: userId}).populate('user');
    if (!orders || orders.length === 0) {
      res.status(404).json({message: 'No orders found for this User'});
    }
    res.status(200).json({orders});
  } catch (error) {
    console.log('Error getting the orderedList');
    res.status(500).json({message: 'Error getting the Orders'});
  }
});
