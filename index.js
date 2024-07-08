const express = require("express");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;


// middleWare 
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials:true
  })
);
app.use(express.json())
app.use(cookieParser())

app.get("/", (req, res) => {
  res.send("Car doctor server");
});

// console.log(process.env.ACCESS_TOKEN_SECRET);



const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.USER_PASS}@cluster0.yjkegcv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// middleWare

// const logger = async (req, res, next) => {
//   console.log("called", req.host, req.originalUrl);
//   next()
// }

// const verify = async (req, res, next) => {
//   const token = req?.cookies?.token
//   if (!token) {
//     return res.status(401).send({message:'not authorized access'})
//   }
//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
//     if (err) {
//       return  res.status(401).send({message:'forbidden'})
//     }
//     console.log('value is decoded', decoded)
//     req.user=decoded
//     next()
//   })
// }





// middleware

const logger = async (req, res, next) => {
  console.log('called',req.host,req.originalUrl);
  next()
}


const verify = async (req, res, next) => {
  const token = req.cookies.token;
  console.log(token);
  if (!token) {
    return res.status(401).send({message:'unauthorized'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
    // err throwing
    if (err) {
      return res.status(401).send({message:"unauthorized access"})
    }
    if (decoded) {
      req.user = decoded
      console.log(decoded)
      next()

    }
    
    // decoded token 
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const serviceCollection = client.db('carDoctor').collection('services')
    const bookingCollection = client.db('carDoctor').collection('bookings')
    
  //http cookie
    //  
    
    
    // app.post('/jwt',logger, async (req, res) => {
    //   const user = req.body;
    //   console.log('user:',user);
    //   const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {   //create token
    //     expiresIn: "1h",
    //   });
    //   res
    //     .cookie('access token', token, {
    //       httpOnly: true,
    //       secure: false,
    //       sameSite:"none"
    //     })
    //     .send({success:true})
    // })
    
    
    

    app.post('/jwt',logger, async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
         maxAge: 3600000, // 1 hour in milliseconds
    httpOnly: true, // makes the cookie inaccessible to JavaScript's Document.cookie
    secure: false, // set to true if using HTTPS
    sameSite: 'Lax', // prevents CSRF attacks
    path: '/'
        })
        .send({ success: true })
    })


    // service related auth 

    app.get('/services',logger, async (req, res) => {
      const cursor = serviceCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get('/services/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const options = {
        projection: { title: 1, img: 1, title:1,price:1,service_id:1 },
      };
      const result = await serviceCollection.findOne(query,options)
      res.send(result)
    })



    // bookings

    app.get('/bookings',logger,verify, async (req, res) => {
      // console.log(' token bookings:', req.cookies.token);
      console.log("user in valid token", req.user);
      
      if (req.query.email !== req.user.email) {
        return res.status(403).send({message:"forbidden access"})
      }
      let query = {}
      if (req.query?.email) {
        query={email: req.query.email}
      }

      const result = await bookingCollection.find(query).toArray()
      res.send(result)
    })

    app.post('/bookings', async (req, res) => {
      const doc = req.body;
      //  console.log("tok token:", req.cookies.token);
      // console.log(doc);
      const result = await bookingCollection.insertOne(doc);
      res.send(result)
    })


    app.patch('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          status: "confirm"
        }
      }
      const result = await bookingCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await bookingCollection.deleteOne(query)
      res.send(result)
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.listen(port, () => {
  console.log(`car doctor server running on port ${port}`);
});
