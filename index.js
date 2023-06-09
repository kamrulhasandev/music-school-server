const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000

// middleware
const corsOptions = {
  origin: '*',
  credentials: true,
  optionSuccessStatus: 200,
}

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}


app.use(cors(corsOptions))
app.use(express.json())

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mjrrjle.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

async function run() {
  try {
    
    // Send a ping to confirm a successful connection
    
    const usersCollection = client.db('musicSchool').collection('users');
    const allClassCollection = client.db('musicSchool').collection('allClasses');
    const selectClassCollection = client.db('musicSchool').collection('selectedClass');
    

    // create jwt
    app.post('/jwt',(req,res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'}) 
      res.send({token})
    })

    // verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }
    
    
    // save users api
    app.post('/users', async(req,res)=>{
      const user = req.body;
      const query = {email: user.email}
      const existingUser = await usersCollection.findOne(query);
      if(existingUser){
        return res.send({message: 'user already exists'})
      }
      const result = await usersCollection.insertOne(user);
      res.send(result)
    })

    // lode user api
    app.get('/users', verifyJWT,verifyAdmin, async(req,res)=>{
      const result = await usersCollection.find().toArray();
      res.send(result)
    })

    // user to make admin
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);

    })

    // check user admin or not
    app.get('/users/admin/:email', verifyJWT, async(req,res)=>{
      const email = req.params.email;
      if(req.decoded.email !== email){
        res.send({admin: false})
      }
      const query = {email: email};
      const user = await usersCollection.findOne(query);
      const result = {admin: user?.role === 'admin'}
      res.send(result);
    })

    // user to instructor
    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);

    })
    // check user instructor or not
    app.get('/users/instructor/:email', verifyJWT, async(req,res)=>{
      const email = req.params.email;
      if(req.decoded.email !== email){
        res.send({instructor: false})
      }
      const query = {email: email};
      const user = await usersCollection.findOne(query);
      const result = {instructor: user?.role === 'instructor'}
      res.send(result);
    })


    // add a class
    app.post('/allClasses', async(req,res)=>{
      const allClass = req.body;
      const result = await allClassCollection.insertOne(allClass);
      res.send(result);
    })

    // get all class
    app.get('/allClasses', async(req,res)=>{
      const result = await allClassCollection.find().toArray();
      res.send(result);
    })

    // get classes by instructor email
  app.get('/classesByInstructorEmail', async (req, res) => {
    const email = req.query.email;
    const query = { instructorEmail: email };

  try {
    const result = await allClassCollection.find(query).toArray();
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching classes by instructor email.' });
  }
});


  // update status approved
  app.put('/updateStatusApproved/:id', async (req, res) => {
    const id = req.params.id;
    console.log(id);
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: {
        status: 'approved'
      },
    };
  
    const result = await allClassCollection.updateOne(filter, updateDoc); 
    res.send(result);
  });

  // update status deny
  app.put('/updateStatusDeny/:id', async (req, res) => {
    const id = req.params.id;
    console.log(id);
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: {
        status: 'deny'
      },
    };
  
    const result = await allClassCollection.updateOne(filter, updateDoc); 
    res.send(result);
  });



  // feedback api
app.patch('/updateFeedback/:id', async (req, res) => {
  const id = req.params.id;
  const { feedback } = req.body; 
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $set: {
      feedback: feedback
    },
  };

  const result = await allClassCollection.updateOne(filter, updateDoc);
  res.send(result);
});



  // get approved classes
  app.get('/approvedClasses', async (req, res) => {
    const query = { status: 'approved' };
    const result = await allClassCollection.find(query).toArray();
    res.send(result);
  });


  // select class post
  app.post('/selectedClass', async(req,res)=>{
    const item = req.body;
    const result = await selectClassCollection.insertOne(item);
    res.send(result)
  })

  // get select class
  app.get('/selectedClass', async(req,res)=>{
    const email = req.query.email;
    if(!email){
      res.send([])
    }
    const query = {email: email};
    const result = await selectClassCollection.find(query).toArray();
    res.send(result)
  })

  // delete class
  app.delete('/selectedClass/:id', async(req,res)=>{
    const id = req.params.id;
    const query = {_id: new ObjectId(id)};
    const result = await selectClassCollection.deleteOne(query);
    res.send(result)
  })

    


    
    
    
    
    await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Server is running..')
})

app.listen(port, () => {
  console.log(`Server is running on ${port}`)
})