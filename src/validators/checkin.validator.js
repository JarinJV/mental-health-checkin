'use strict';

const { body, query, param } = require('express-validator');

const checkinBodyRules = [
  body('mood')
    .notEmpty().withMessage('mood is required')
    .isInt({ min: 1, max: 10 }).withMessage('mood must be an integer between 1 and 10'),

  body('stress')
    .notEmpty().withMessage('stress is required')
    .isInt({ min: 1, max: 10 }).withMessage('stress must be an integer between 1 and 10'),

  body('sleepHours')
    .notEmpty().withMessage('sleepHours is required')
    .isFloat({ min: 0, max: 24 }).withMessage('sleepHours must be a number between 0 and 24'),

  body('energy')
    .notEmpty().withMessage('energy is required')
    .isInt({ min: 1, max: 10 }).withMessage('energy must be an integer between 1 and 10'),

  body('note')
    .optional()
    .isString().withMessage('note must be a string')
    .isLength({ max: 2000 }).withMessage('note must not exceed 2000 characters')
    .trim(),
];

const listQueryRules = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100')
    .toInt(),

  query('from')
    .optional()
    .isISO8601().withMessage('from must be a valid ISO 8601 date'),

  query('to')
    .optional()
    .isISO8601().withMessage('to must be a valid ISO 8601 date'),

  query('mood')
    .optional()
    .isInt({ min: 1, max: 10 }).withMessage('mood filter must be between 1 and 10')
    .toInt(),
];

const uuidParamRule = [
  param('id')
    .isUUID().withMessage('id must be a valid UUID'),
];

module.exports = { checkinBodyRules, listQueryRules, uuidParamRule };
