// src/import/validators/registerValidators.ts
import type { Validator } from '../types';
import { defaultValidator } from './DefaultValidator';

export const ALL_VALIDATORS: Validator[] = [defaultValidator];
export const DEFAULT_VALIDATOR_ID = defaultValidator.id;
