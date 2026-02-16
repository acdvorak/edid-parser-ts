/* eslint-disable @typescript-eslint/no-unnecessary-condition */

import type { AcdVendorName } from '../../gen/vids/acd-types';
import { HWDATA_VENDOR_MAP } from '../../gen/vids/hwdata-const';
import type {
  HwdataVendorId,
  HwdataVendorName,
} from '../../gen/vids/hwdata-types';
import { LANSWEEPER_VENDOR_MAP } from '../../gen/vids/lansweeper-const';
import type {
  LansweeperVendorId,
  LansweeperVendorName,
} from '../../gen/vids/lansweeper-types';
import { LINUXHW_VENDOR_MAP } from '../../gen/vids/linuxhw-const';
import type {
  LinuxhwVendorId,
  LinuxhwVendorName,
} from '../../gen/vids/linuxhw-types';
import type {
  MergedVendorId,
  MergedVendorName,
} from '../../gen/vids/merged-vid-types';

import { NOTABLE_VENDORS } from './notable-const';
import type { VendorInfo } from './vendor-types';

export function getVendorInfo(vid: MergedVendorId): VendorInfo {
  const notable = NOTABLE_VENDORS.find((vendor) => vendor.vid === vid) || null;

  const linuxhwName: LinuxhwVendorName | null =
    LINUXHW_VENDOR_MAP[vid as LinuxhwVendorId] || null;
  const lansweeperName: LansweeperVendorName | null =
    LANSWEEPER_VENDOR_MAP[vid as LansweeperVendorId] || null;
  const hwdataName: HwdataVendorName | null =
    HWDATA_VENDOR_MAP[vid as HwdataVendorId] || null;

  const goodName: MergedVendorName =
    notable?.shortName || linuxhwName || lansweeperName || hwdataName || vid;
  const shortBrandName: AcdVendorName | null = notable?.shortName || null;

  const info: VendorInfo = {
    vid,
    goodName,
  };

  if (shortBrandName) {
    info.shortBrandName = shortBrandName;
  }
  if (linuxhwName) {
    info.linuxhwName = linuxhwName;
  }
  if (lansweeperName) {
    info.lansweeperName = lansweeperName;
  }
  if (hwdataName) {
    info.hwdataName = hwdataName;
  }

  return info;
}
