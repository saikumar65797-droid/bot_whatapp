const express = require('express');
const router = express.Router();
const {
  getAllCustomers,
  getCustomerById,
  deleteCustomer
} = require('../controllers/customerController');

// GET /customers - Get all enquiries
router.get('/customers', getAllCustomers);

// GET /customers/:id - Get single enquiry by ID
router.get('/customers/:id', getCustomerById);

// DELETE /customers/:id - Delete single enquiry by ID
router.delete('/customers/:id', deleteCustomer);

module.exports = router;
