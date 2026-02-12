import { EDID_VENDOR_ID_MAP } from './edid-vendor-constants';
import type {
  EdidVendorBrand,
  EdidVendorId,
  EdidVendorName,
} from './edid-vendor-types';

export function isEdidVendorId(
  maybeVID: string | null | undefined,
): maybeVID is EdidVendorId {
  return !!maybeVID && maybeVID in EDID_VENDOR_ID_MAP;
}

export function getEdidVendorName(
  maybeVID: string | null | undefined,
): EdidVendorName | null {
  if (isEdidVendorId(maybeVID)) {
    return EDID_VENDOR_ID_MAP[maybeVID];
  }
  return null;
}

export function getEdidVendorBrand(
  maybeVID: string | null | undefined,
): EdidVendorBrand {
  const name = getEdidVendorName(maybeVID);
  if (!name) {
    return 'Unknown';
  }

  if (
    name === 'Acer' ||
    name === 'Acer Technologies' ||
    name === 'Acer America Corp.'
  ) {
    return 'Acer';
  }

  if (name === 'Apple Computer') {
    return 'Apple';
  }

  if (name === 'Asuscom Network' || name === 'AsusTek Computer') {
    return 'Asus';
  }

  if (name === 'BenQ Corporation') {
    return 'BenQ';
  }

  if (name === 'Dell') {
    return 'Dell';
  }

  if (name === 'Hisense Electric') {
    return 'Hisense';
  }

  if (
    name === 'HP' ||
    name === 'Hewlett Packard' ||
    name === 'Hewlett-Packard' ||
    name === 'Hewlett Packard Enterprise'
  ) {
    return 'HP';
  }

  if (name === 'IBM' || name === 'IBM Corporation') {
    return 'IBM';
  }

  if (
    name === 'Lenovo' ||
    name === 'Lenovo Beijing' ||
    name === 'Lenovo Group'
  ) {
    return 'Lenovo';
  }

  if (
    name === 'LG Display' ||
    name === 'LG Electronics Inc. (GoldStar Technology, Inc.)' ||
    name === 'LG Semicom Company'
  ) {
    return 'LG';
  }

  if (name === 'MSI GmbH') {
    return 'MSI';
  }

  if (
    name === 'Panasonic' ||
    name === 'Panasonic Avionics Corporation' ||
    name === 'Panasonic Connect' ||
    name === 'Panasonic Industry Company'
  ) {
    return 'Panasonic';
  }

  if (
    name === 'LG Philips' ||
    name === 'Philips Communication Systems' ||
    name === 'Philips Consumer Electronics Company' ||
    name === 'Philips Semiconductors'
  ) {
    return 'Philips';
  }

  if (
    name === 'Samsung Display Corp.' ||
    name === 'Samsung Electric Company' ||
    name === 'Samsung Electro-Mechanics Company' ||
    name === 'Samsung Electronic' ||
    name === 'Samsung Electronics America' ||
    name === 'Samsung Electronics Company'
  ) {
    return 'Samsung';
  }

  if (
    name === 'Sharp Corporation' ||
    name === 'Sharp Takaya Electronic Industry'
  ) {
    return 'Sharp';
  }

  if (name === 'Sony' || name === 'Sony Ericsson Mobile Communications') {
    return 'Sony';
  }

  if (name === 'TCL Corporation') {
    return 'TCL';
  }

  if (
    name === 'Toshiba America Info Systems' ||
    name === 'Toshiba Corporation' ||
    name === 'Toshiba Global Commerce Solutions' ||
    name === 'Toshiba Matsushita Display Technology' ||
    name === 'Toshiba Personal Computer System Corporation' ||
    name === 'Toshiba Teli Corporation'
  ) {
    return 'Toshiba';
  }

  if (name === 'ViewSonic Corporation') {
    return 'ViewSonic';
  }

  if (name === 'Vizio') {
    return 'Vizio';
  }

  return 'Unknown';
}
