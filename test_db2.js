require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/database');
const env = require('./src/config/env');

async function testFetch() {
  await connectDB();
  const collection = mongoose.connection.collection(env.companyProfileCollection);
  
  const email = 'krkagro2018@gmail.com';
  console.log(`\n--- Looking up by Email: ${email} ---`);
  
  const companyByEmail = await collection.findOne({ contactEmail: { $regex: email, $options: 'i' } });
  
  if (companyByEmail) {
    console.log(`\n✅ Company found by email!`);
    console.log(`Company Name: ${companyByEmail.company}`);
    console.log(`Profile Code: ${companyByEmail.profileCode}`);
    console.log(`Contact Email in DB: ${companyByEmail.contactEmail}`);
    console.log(`Contact Number in DB: ${companyByEmail.contactNumber}`);
  } else {
    console.log(`❌ No company found by email ${email}`);
  }

  process.exit(0);
}

testFetch();
