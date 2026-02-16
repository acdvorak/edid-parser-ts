import type { AcdVendorName } from '../../gen/vids/acd-types';
import type { HwdataVendorName } from '../../gen/vids/hwdata-types';
import type { LansweeperVendorName } from '../../gen/vids/lansweeper-types';
import type { LinuxhwVendorName } from '../../gen/vids/linuxhw-types';
import type {
  MergedVendorId,
  MergedVendorName,
} from '../../gen/vids/merged-vid-types';

export interface VendorInfo {
  /**
   * 3-letter EDID Vendor ID, aka PNP ID.
   */
  vid: MergedVendorId;

  /**
   * Highest-quality name selected from the available datasets:
   *
   * 1. {@link shortBrandName} (✅ highest quality)
   * 2. {@link linuxhwName}
   * 3. {@link lansweeperName}
   * 4. {@link hwdataName} (⚠️ lowest quality)
   */
  goodName: MergedVendorName;

  /**
   * Short, UI-friendly brand name according to me (Andrew C. Dvorak).
   *
   * ✅ **Highest** quality name.
   *
   * Only populated for major/notable vendors (Samsung, LG, etc.).
   */
  shortBrandName?: AcdVendorName;

  /**
   * Vendor name according to the `linuxhw/EDID` dataset.
   *
   * ✳️ **Good** quality name.
   *
   * @see https://github.com/linuxhw/EDID
   */
  linuxhwName?: LinuxhwVendorName;

  /**
   * Vendor name according to Lansweeper.
   *
   * 🟡 **Moderate** quality name.
   *
   * @see https://community.lansweeper.com/t5/managing-assets/list-of-3-letter-monitor-manufacturer-codes/ta-p/64429
   */
  lansweeperName?: LansweeperVendorName;

  /**
   * Vendor name according to the `hwdata/pnp.ids` dataset, which is derived
   * from the "official" UEFI PNP ID list.
   *
   * 🟠 **Lowest** quality name.
   *
   * @see https://github.com/vcrhonek/hwdata/blob/428ad3882/pnp.ids
   * @see https://uefi.org/UEFI-PNP-Export (CSV)
   * @see https://uefi.org/PNP_ID_List (paginated HTML)
   * @see https://uefi.org/sites/default/files/resources/PNPID_List.pdf
   */
  hwdataName?: HwdataVendorName;
}
