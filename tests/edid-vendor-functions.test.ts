import { describe, expect, it } from 'vitest';

import {
  getEdidVendorName,
  isEdidVendorId,
} from '../src/edid-vendor-functions';

describe('edid-vendor-functions', () => {
  describe('isEdidVendorId', () => {
    it('should return true for valid EDID manufacturer IDs', () => {
      expect(isEdidVendorId('AAE')).toBe(true);
      expect(isEdidVendorId('ADS')).toBe(true);
      expect(isEdidVendorId('ADT')).toBe(true);
    });

    it('should return false for invalid EDID manufacturer IDs', () => {
      expect(isEdidVendorId('000')).toBe(false);
      expect(isEdidVendorId('999')).toBe(false);
      expect(isEdidVendorId('INVALID')).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(isEdidVendorId(null)).toBe(false);
      expect(isEdidVendorId(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isEdidVendorId('')).toBe(false);
    });
  });

  describe('getEdidVendorName', () => {
    it('should return manufacturer name for valid ID', () => {
      expect(getEdidVendorName('AAE')).toBe('Anatek Electronics');
      expect(getEdidVendorName('ADS')).toBe('Analog Devices');
    });

    it('should return first name when value is an array', () => {
      expect(getEdidVendorName('ADT')).toBe('Adtek');
    });
  });
});
