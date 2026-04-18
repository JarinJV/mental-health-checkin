'use strict';

const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const { getDashboard } = require('../controllers/checkin.controller');

router.get('/', requireAuth, getDashboard);

module.exports = router;
