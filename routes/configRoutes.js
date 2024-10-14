const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const { checkDomainHeader } = require('../middlewares/domainMiddleware');


router.post('/banners', checkDomainHeader, configController.addBanner);
router.put('/banners/:bannerId', checkDomainHeader, configController.updateBanner);
router.delete('/banners/:bannerId', checkDomainHeader, configController.deleteBanner);

router.get('/banners', checkDomainHeader, configController.getBanners);
router.get('/banners/:bannerId', checkDomainHeader, configController.getBannerById);

router.put('/config/logo', checkDomainHeader, configController.updateLogo);
router.put('/config/metadata', checkDomainHeader, configController.updateMetadata);
router.put('/config/colors', checkDomainHeader, configController.updateColors);
router.put('/config/theme', checkDomainHeader, configController.updateTheme);
router.put('/config/catalogo', checkDomainHeader, configController.updateCatalogo);

router.get('/configurations', checkDomainHeader, configController.getConfigByDomain);
router.post('/configurations/create', checkDomainHeader, configController.createConfig);

router.get('/social-link', checkDomainHeader,  configController.getSocialLink);
router.post('/social-link/new', checkDomainHeader,  configController.addSocialLink);
router.put('/social-link/:linkId', checkDomainHeader,  configController.editSocialLink);
router.delete('/social-link/:linkId', checkDomainHeader,  configController.deleteSocialLink);

module.exports = router;
