const express = require('express');
const {
  getDashboardStats,
  getUsers,
  toggleUserActive,
  approveProvider,
  getApplications,
  reviewApplication,
  getAllRequirements,
  getRequirementDetail,
  getProviderDocuments,
  getProviderDocumentDetail,
  getCancelledBookings,
  getCancellationAnalytics,
  setUserRole,
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
const {
  getAllBlogsAdmin,
  getBlogByIdAdmin,
  createBlog,
  updateBlog,
  deleteBlog,
  uploadBlogCover,
} = require('../controllers/blogController');
const { uploadBlogCoverImage } = require('../middleware/upload');
const { getAnalytics, getLineChart, getBarChart, getPieChart } = require('../controllers/analyticsController');
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
const { getAuditLogs } = require('../controllers/auditLogController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('admin', 'staff'));

router.get('/dashboard', getDashboardStats);
router.get('/users', getUsers);
router.patch('/users/:id/toggle-active', toggleUserActive);
router.patch('/users/:id/role', authorize('admin'), setUserRole);
router.patch('/providers/:id/approve', approveProvider);
router.get('/applications', getApplications);
router.patch('/applications/:userId/review', reviewApplication);
router.get('/requirements', getAllRequirements);
router.get('/requirements/:id', getRequirementDetail);
router.get('/provider-documents', getProviderDocuments);
router.get('/provider-documents/:id', getProviderDocumentDetail);

router.get('/cancellations', getCancelledBookings);
router.get('/cancellations/analytics', getCancellationAnalytics);

router.get('/reports', getReports);
router.get('/reports/:id', getReportById);
router.patch('/reports/:id/resolve', resolveReport);

router.get('/analytics', getAnalytics);
router.get('/analytics/line', getLineChart);
router.get('/analytics/bar', getBarChart);
router.get('/analytics/pie', getPieChart);

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

router.get('/blogs', getAllBlogsAdmin);
router.get('/blogs/:id', getBlogByIdAdmin);
router.post('/blogs', createBlog);
router.put('/blogs/:id', updateBlog);
router.delete('/blogs/:id', deleteBlog);
router.post('/blogs/upload-cover', uploadBlogCoverImage.single('cover'), uploadBlogCover);

router.get('/service-catalog', getServiceCatalogAdmin);
router.post('/service-catalog', createServiceCatalog);
router.put('/service-catalog/:id', updateServiceCatalog);
router.delete('/service-catalog/:id', deleteServiceCatalog);

router.get('/audit-logs', getAuditLogs);

module.exports = router;