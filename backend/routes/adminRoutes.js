const express = require('express');
const {
  getDashboardStats,
  getUsers,
  toggleUserActive,
  approveProvider,
  getApplications,
  reviewApplication,
  getAllRequirements,
  getProviderDocuments,
  getCancelledBookings,
  getCancellationAnalytics,
} = require('../controllers/adminController');
const {
  getAllCategoriesAdmin,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const {
  getServiceCatalogAdmin,
  createServiceCatalog,
  updateServiceCatalog,
  deleteServiceCatalog,
} = require('../controllers/serviceCatalogController');
const { getReports, getReportById, resolveReport } = require('../controllers/reportController');
const { getAnalytics } = require('../controllers/analyticsController');
const {
  getSettings: getWalletSettings,
  updateSettings: updateWalletSettings,
  getSummary: getWalletSummary,
  getReceivedFromCustomers,
  getPendingDues,
  getPendingPayouts,
  createPayout,
  getRefunds,
  createRefund,
  resolveTransaction,
  getHistory: getWalletHistory,
  getAnalytics: getWalletAnalytics,
} = require('../controllers/walletController');
const { getAllTickets, updateTicketStatus } = require('../controllers/supportController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/users', getUsers);
router.patch('/users/:id/toggle-active', toggleUserActive);
router.patch('/providers/:id/approve', approveProvider);
router.get('/applications', getApplications);
router.patch('/applications/:userId/review', reviewApplication);
router.get('/requirements', getAllRequirements);
router.get('/provider-documents', getProviderDocuments);

router.get('/cancellations', getCancelledBookings);
router.get('/cancellations/analytics', getCancellationAnalytics);

router.get('/reports', getReports);
router.get('/reports/:id', getReportById);
router.patch('/reports/:id/resolve', resolveReport);

router.get('/analytics', getAnalytics);

router.get('/wallet/settings', getWalletSettings);
router.patch('/wallet/settings', updateWalletSettings);
router.get('/wallet/summary', getWalletSummary);
router.get('/wallet/received', getReceivedFromCustomers);
router.get('/wallet/pending-dues', getPendingDues);
router.get('/wallet/payouts/pending', getPendingPayouts);
router.post('/wallet/payouts', createPayout);
router.get('/wallet/refunds', getRefunds);
router.post('/wallet/refunds', createRefund);
router.patch('/wallet/transactions/:id/resolve', resolveTransaction);
router.get('/wallet/history', getWalletHistory);
router.get('/wallet/analytics', getWalletAnalytics);

router.get('/support', getAllTickets);
router.patch('/support/:id/status', updateTicketStatus);

router.get('/categories', getAllCategoriesAdmin);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

router.get('/service-catalog', getServiceCatalogAdmin);
router.post('/service-catalog', createServiceCatalog);
router.put('/service-catalog/:id', updateServiceCatalog);
router.delete('/service-catalog/:id', deleteServiceCatalog);

module.exports = router;
