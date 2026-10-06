require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  verifyToken: process.env.VERIFY_TOKEN,
  whatsappToken: process.env.WHATSAPP_TOKEN,
  phoneNumberId: process.env.PHONE_NUMBER_ID,
  mongoUri: process.env.MONGODB_URI,
  mongoDbName: process.env.MONGODB_DB,
  companyProfileCollection: process.env.COMPANY_PROFILE_COLLECTION || 'companyProfiles_testing',
  brochureUrl: process.env.BROCHURE_URL,
  supportPhone: process.env.SUPPORT_PHONE || '+911234567890',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@sruthitechnologies.com',
  websiteUrl: process.env.WEBSITE_URL || 'https://www.sruthitechnologies.com'
};
