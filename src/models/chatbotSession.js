const mongoose = require('mongoose');

const ChatbotSessionSchema = new mongoose.Schema({
  whatsappNumber: { type: String, required: true, index: true },
  state: { type: String, required: true, default: 'START' },
  
  // Verification Data
  companyProfileId: { type: mongoose.Schema.Types.ObjectId },
  profileCode: { type: String },
  company: { type: String },
  verifiedBy: { type: String, enum: ['MOBILE_EMAIL', 'SERIAL_NUMBER'] },
  
  // Selection State
  selectedMachineId: { type: String },
  selectedMachineSerialNumber: { type: String },
  callType: { type: String },
  category: { type: String },
  priority: { type: String },
  description: { type: String },
  
  selectedAMCPlan: {
    duration: String,
    months: Number,
    visits: Number,
    amount: Number
  },
  
  // New Machine/New Customer State
  newMachineType: { type: String },
  newMachineModel: { type: String },
  numberOfChutes: { type: String },
  
  tempMobile: { type: String }, // Add this to track mobile before verification
  
  newCustomerName: { type: String },
  newCustomerMobile: { type: String },
  newCustomerEmail: { type: String },
  newCustomerAddress: { type: String },
  newCustomerBusinessType: { type: String },
  
  // Enquiry State
  enquiryType: { type: String },
  enquiryDescription: { type: String }
}, {
  timestamps: true
});

// Auto expire sessions after 1 hour of inactivity
ChatbotSessionSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 3600 });

module.exports = mongoose.model('ChatbotSession', ChatbotSessionSchema);
