require('dotenv').config();
const mongoose = require('mongoose');
const companyService = require('./src/services/companyService');
const connectDB = require('./src/config/database');

async function testFetch() {
  await connectDB();

  const mobile = '77803 24011';
  const email1 = 'krkagro2018@gmail.com';
  const email2 = 'krkagro2018@gmail.com';

  console.log(`\n--- Testing Mobile: ${mobile} ---`);
  const companyByMobile = await companyService.findByMobile(mobile);
  
  if (companyByMobile) {
    console.log(`\n✅ Company found by mobile!`);
    console.log(`Company Name: ${companyByMobile.company}`);
    console.log(`Profile Code: ${companyByMobile.profileCode}`);
    console.log(`Contact Email in DB: ${companyByMobile.contactEmail}`);
    console.log(`Contact Number in DB: ${companyByMobile.contactNumber}`);
    
    if (companyByMobile.machines && companyByMobile.machines.length > 0) {
      console.log(`Number of machines: ${companyByMobile.machines.length}`);
      companyByMobile.machines.forEach((m, idx) => {
        console.log(`  [Machine ${idx + 1}] ${m.machineType} - ${m.model} (SN: ${m.serialNumber})`);
      });
    } else {
      console.log(`No machines found for this company.`);
    }

    console.log(`\n--- Testing Exact Mobile + Email Match ---`);
    console.log(`Trying email: ${email1}`);
    const exactMatch1 = await companyService.verifyMobileAndEmail(mobile, email1);
    console.log(exactMatch1 ? `✅ Match successful with ${email1}` : `❌ No match with ${email1}`);

    console.log(`Trying email: ${email2}`);
    const exactMatch2 = await companyService.verifyMobileAndEmail(mobile, email2);
    console.log(exactMatch2 ? `✅ Match successful with ${email2}` : `❌ No match with ${email2}`);
    
  } else {
    console.log(`❌ No company found by mobile ${mobile}`);
  }

  process.exit(0);
}

testFetch();
