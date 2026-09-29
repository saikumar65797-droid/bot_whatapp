const CustomerRequest = require('../models/CustomerRequest');

/**
 * Get all customer requests from customerRequests collection
 * GET /customers
 */
const getAllCustomers = async (req, res) => {
  try {
    const requests = await CustomerRequest.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error('❌ Error fetching customer requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve customer requests',
      error: error.message
    });
  }
};

/**
 * Get single customer request by ID
 * GET /customers/:id
 */
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const requestItem = await CustomerRequest.findById(id);

    if (!requestItem) {
      return res.status(404).json({
        success: false,
        message: 'Customer request not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: requestItem
    });
  } catch (error) {
    console.error(`❌ Error fetching customer request ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve customer request',
      error: error.message
    });
  }
};

/**
 * Delete customer request by ID
 * DELETE /customers/:id
 */
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const requestItem = await CustomerRequest.findByIdAndDelete(id);

    if (!requestItem) {
      return res.status(404).json({
        success: false,
        message: 'Customer request not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Customer request deleted successfully',
      data: requestItem
    });
  } catch (error) {
    console.error(`❌ Error deleting customer request ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete customer request',
      error: error.message
    });
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  deleteCustomer
};
