const Customer = require('../models/Customer');

/**
 * Get all customer enquiries
 * GET /customers
 */
const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: customers.length,
      data: customers
    });
  } catch (error) {
    console.error('❌ Error fetching customers:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve customer enquiries',
      error: error.message
    });
  }
};

/**
 * Get single customer enquiry by ID
 * GET /customers/:id
 */
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer enquiry not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error(`❌ Error fetching customer ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve customer enquiry',
      error: error.message
    });
  }
};

/**
 * Delete customer enquiry by ID
 * DELETE /customers/:id
 */
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByIdAndDelete(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer enquiry not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Customer enquiry deleted successfully',
      data: customer
    });
  } catch (error) {
    console.error(`❌ Error deleting customer ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete customer enquiry',
      error: error.message
    });
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  deleteCustomer
};
