'use strict';

const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { checkinBodyRules, listQueryRules, uuidParamRule } = require('../validators/checkin.validator');
const {
  createCheckin,
  listCheckins,
  getCheckin,
  updateCheckin,
  deleteCheckin,
  getDashboard,
} = require('../controllers/checkin.controller');

// All checkin routes require a valid session
router.use(requireAuth);

router.post('/',     checkinBodyRules, validate, createCheckin);
router.get('/',      listQueryRules,   validate, listCheckins);
router.get('/:id',   uuidParamRule,    validate, getCheckin);
router.put('/:id',   [...uuidParamRule, ...checkinBodyRules], validate, updateCheckin);
router.delete('/:id',uuidParamRule,    validate, deleteCheckin);

module.exports = router;
