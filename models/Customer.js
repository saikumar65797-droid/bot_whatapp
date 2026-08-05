const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true
    },
    factoryName: {
      type: String,
      required: [true, 'Factory name is required'],
      trim: true
    },
    factoryAddress: {
      type: String,
      required: [true, 'Factory address is required'],
      trim: true
    },
    machineType: {
      type: String,
      required: [true, 'Machine type is required'],
      trim: true
    }
  },
  {
    timestamps: true
  }
);

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;
