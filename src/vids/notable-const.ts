interface NotableVendorShape {
  /**
   * 3-letter EDID Vendor ID, aka PNP ID.
   */
  vid: string;

  /**
   * Short, UI-friendly name of the vendor.
   *
   * @example "Samsung"
   */
  shortName: string;

  /**
   * Full official name of the company.
   *
   * @example "Samsung Electronics Company Ltd."
   */
  companyName: string;

  roles: NotableVendorRole[];

  notes?: string;
}

type NotableVendorRole =
  | 'panel_manufacturer'
  | 'consumer_brand'
  | 'commercial_brand'
  | 'audio_video';

// prettier-ignore
export const NOTABLE_VENDORS = [
  { vid: 'ABO', shortName: 'Acer',               companyName: 'Acer Inc.',                                       roles: ['consumer_brand'], },
  { vid: 'ACE', shortName: 'Acer',               companyName: 'Acer Inc.',                                       roles: ['consumer_brand'], },
  { vid: 'ACI', shortName: 'Asus',               companyName: 'ASUSTeK Computer Inc.',                           roles: ['consumer_brand'], },
  { vid: 'ACR', shortName: 'Acer',               companyName: 'Acer Inc.',                                       roles: ['consumer_brand'], },
  { vid: 'ACT', shortName: 'Acer',               companyName: 'Acer Inc.',                                       roles: ['consumer_brand'], },
  { vid: 'AOC', shortName: 'AOC',                companyName: 'AOC International',                               roles: ['panel_manufacturer'], },
  { vid: 'API', shortName: 'Acer',               companyName: 'Acer Inc.',                                       roles: ['consumer_brand'], },
  { vid: 'APP', shortName: 'Apple',              companyName: 'Apple Computer Inc.',                             roles: ['consumer_brand', 'panel_manufacturer'], },
  { vid: 'ASU', shortName: 'Asus',               companyName: 'ASUSTeK Computer Inc.',                           roles: ['consumer_brand'], },
  { vid: 'AUO', shortName: 'AUO',                companyName: 'AUO Corporation',                                 roles: ['panel_manufacturer'], },
  { vid: 'AUS', shortName: 'Asus',               companyName: 'ASUSTeK Computer Inc.',                           roles: ['consumer_brand'], },
  { vid: 'BBK', shortName: 'BBK',                companyName: 'BBK Electronics Corporation',                     roles: ['consumer_brand'],                       notes: 'Historical parent company of brands like Oppo and Vivo', },
  { vid: 'BBY', shortName: 'Best Buy',           companyName: 'Best Buy Co., Inc.',                              roles: ['consumer_brand'], },
  { vid: 'BNQ', shortName: 'BenQ',               companyName: 'BenQ Corporation',                                roles: ['consumer_brand'], },
  { vid: 'BOE', shortName: 'BOE',                companyName: 'BOE Technology Group Co., Ltd.',                  roles: ['panel_manufacturer'], },
  { vid: 'CHE', shortName: 'Acer',               companyName: 'Acer Inc.',                                       roles: ['consumer_brand'], },
  { vid: 'CMN', shortName: 'InnoLux',            companyName: 'Chimei Innolux Corporation',                      roles: ['panel_manufacturer'], },
  { vid: 'CMO', shortName: 'Chi Mei',            companyName: 'Chi Mei Optoelectronics Corp.',                   roles: ['panel_manufacturer'], },
  { vid: 'CSW', shortName: 'CSOT',               companyName: 'China Star Optoelectronics Technology Co., Ltd.', roles: ['panel_manufacturer'],                   notes: 'Subsidiary of TCL', },
  { vid: 'CTX', shortName: 'CTX',                companyName: 'CTX International',                               roles: ['consumer_brand'],                       notes: 'Chuntex Electronic Co., Ltd.', },
  { vid: 'DEL', shortName: 'Dell',               companyName: 'Dell Technologies Inc.',                          roles: ['consumer_brand'], },
  { vid: 'DWE', shortName: 'Daewoo',             companyName: 'Daewoo Electronics',                              roles: ['consumer_brand', 'panel_manufacturer'], },
  { vid: 'EIZ', shortName: 'Eizo',               companyName: 'EIZO Nanao Corporation',                          roles: ['consumer_brand'],                       notes: 'High-end monitors', },
  { vid: 'GBT', shortName: 'Gigabyte',           companyName: 'Gigabyte Technology',                             roles: ['consumer_brand'], },
  { vid: 'GSM', shortName: 'LG',                 companyName: 'LG (GoldStar Technology)',                        roles: ['consumer_brand', 'panel_manufacturer'], },
  { vid: 'HCE', shortName: 'Hitachi',            companyName: 'Hitachi Consumer Electronics',                    roles: ['consumer_brand', 'panel_manufacturer'], },
  { vid: 'HEC', shortName: 'Hisense',            companyName: 'Hisense Group Co., Ltd.',                         roles: ['consumer_brand', 'panel_manufacturer'], },
  { vid: 'HPC', shortName: 'HP',                 companyName: 'Hewlett-Packard / HP Inc.',                       roles: ['consumer_brand'], },
  { vid: 'HPD', shortName: 'HP',                 companyName: 'Hewlett-Packard / HP Inc.',                       roles: ['consumer_brand'], },
  { vid: 'HPN', shortName: 'HP',                 companyName: 'Hewlett-Packard / HP Inc.',                       roles: ['consumer_brand'], },
  { vid: 'HPQ', shortName: 'HP',                 companyName: 'Hewlett-Packard / HP Inc.',                       roles: ['consumer_brand'], },
  { vid: 'HRE', shortName: 'Haier',              companyName: 'Qingdao Haier Electronics',                       roles: ['consumer_brand'], },
  { vid: 'HSD', shortName: 'HANNspree',          companyName: 'HannStar Display Corporation',                    roles: ['consumer_brand'], },
  { vid: 'HSP', shortName: 'HannStar',           companyName: 'HannStar Display Corporation',                    roles: ['panel_manufacturer'], },
  { vid: 'HWP', shortName: 'HP',                 companyName: 'Hewlett-Packard / HP Inc.',                       roles: ['consumer_brand'], },
  { vid: 'HWV', shortName: 'Huawei',             companyName: 'Huawei Corporation',                              roles: ['consumer_brand'], },
  { vid: 'IBM', shortName: 'IBM',                companyName: 'International Business Machines Corporation',     roles: ['consumer_brand'], },
  { vid: 'INL', shortName: 'InnoLux',            companyName: 'InnoLux Display Corporation',                     roles: ['panel_manufacturer'], },
  { vid: 'IOC', shortName: 'InnoCN',             companyName: 'Innovation China',                                roles: ['consumer_brand'],                       notes: 'Subsidiary of Guangxi Century Innovation Display Electronics', },
  { vid: 'IVM', shortName: 'iiyama',             companyName: 'iiyama Corporation',                              roles: ['consumer_brand'], },
  { vid: 'IVO', shortName: 'InfoVision',         companyName: 'InfoVision Optoelectronics (Kunshan) Co., Ltd.',  roles: ['panel_manufacturer'], },
  { vid: 'JDI', shortName: 'JDI',                companyName: 'Japan Display Inc.',                              roles: ['panel_manufacturer'], },
  { vid: 'JVC', shortName: 'JVC',                companyName: 'Victor Company of Japan, Ltd. (JVC)',             roles: ['consumer_brand'], },
  { vid: 'LCA', shortName: 'LaCie',              companyName: 'LaCie',                                           roles: ['consumer_brand'], },
  { vid: 'LCD', shortName: 'Toshiba Matsushita', companyName: 'Toshiba Matsushita Display Technology Co., Ltd.', roles: ['panel_manufacturer'],                   notes: 'Historical joint venture', },
  { vid: 'LEN', shortName: 'Lenovo',             companyName: 'Lenovo',                                          roles: ['consumer_brand'], },
  { vid: 'LGD', shortName: 'LG',                 companyName: 'LG Display',                                      roles: ['consumer_brand', 'panel_manufacturer'], },
  { vid: 'LGE', shortName: 'Samsung',            companyName: 'Samsung',                                         roles: ['consumer_brand', 'panel_manufacturer'], },
  { vid: 'LGP', shortName: 'LG Philips',         companyName: 'LG.Philips Displays',                             roles: ['panel_manufacturer'],                   notes: 'Historical joint venture', },
  { vid: 'LGS', shortName: 'LG',                 companyName: 'LG Semicom Co., Ltd.',                            roles: ['consumer_brand', 'panel_manufacturer'], },
  { vid: 'LNV', shortName: 'Lenovo',             companyName: 'Lenovo',                                          roles: ['consumer_brand'], },
  { vid: 'LPL', shortName: 'LG Philips',         companyName: 'LG.Philips Displays',                             roles: ['panel_manufacturer'],                   notes: 'Historical joint venture', },
  { vid: 'MEI', shortName: 'Panasonic',          companyName: 'Panasonic',                                       roles: ['consumer_brand'], },
  { vid: 'MSI', shortName: 'MSI',                companyName: 'Micro-Star International',                        roles: ['consumer_brand'], },
  { vid: 'NEC', shortName: 'NEC',                companyName: 'NEC Corporation',                                 roles: ['consumer_brand'],                       notes: 'Major historical display brand', },
  { vid: 'ONK', shortName: 'Onkyo',              companyName: 'ONKYO Corporation',                               roles: ['audio_video'],                          notes: 'A/V receivers, amplifiers, and consumer audio gear', },
  { vid: 'ONN', shortName: 'onn',                companyName: 'Walmart onn',                                     roles: ['consumer_brand'],                       notes: 'Walmart private label brand', },
  { vid: 'OPP', shortName: 'Oppo',               companyName: 'OPPO Digital, Inc.',                              roles: ['audio_video'],                          notes: 'Blu-ray / media players and consumer A/V gear', },
  { vid: 'OWC', shortName: 'OWC',                companyName: 'Other World Computing',                           roles: ['audio_video'],                          notes: 'Docks and video adapters (USB-C to HDMI via DisplayLink, etc.)', },
  { vid: 'PHL', shortName: 'Philips',            companyName: 'Philips Consumer Electronics Company',            roles: ['consumer_brand'], },
  { vid: 'QDS', shortName: 'Quanta',             companyName: 'Quanta Display Inc.',                             roles: ['panel_manufacturer'], },
  { vid: 'SAC', shortName: 'Samsung',            companyName: 'Samsung',                                         roles: ['consumer_brand', 'panel_manufacturer'], },
  { vid: 'SAM', shortName: 'Samsung',            companyName: 'Samsung Electric Company',                        roles: ['consumer_brand', 'panel_manufacturer'], },
  { vid: 'SDC', shortName: 'Samsung',            companyName: 'Samsung Display Corp.',                           roles: ['consumer_brand', 'panel_manufacturer'], },
  { vid: 'SEC', shortName: 'Samsung',            companyName: 'Samsung Electronics Company Ltd.',                roles: ['consumer_brand', 'panel_manufacturer'], },
  { vid: 'SEM', shortName: 'Samsung',            companyName: 'Samsung Electronics Company Ltd.',                roles: ['consumer_brand', 'panel_manufacturer'], },
  { vid: 'SHP', shortName: 'Sharp',              companyName: 'Sharp',                                           roles: ['consumer_brand', 'panel_manufacturer'], },
  { vid: 'SIM', shortName: 'Samsung',            companyName: 'Samsung Electronics Company Ltd.',                roles: ['consumer_brand', 'panel_manufacturer'], },
  { vid: 'SNY', shortName: 'Sony',               companyName: 'Sony Corporation',                                roles: ['consumer_brand'], },
  { vid: 'SPT', shortName: 'Sceptre',            companyName: 'Sceptre Inc.',                                    roles: ['consumer_brand'], },
  { vid: 'STN', shortName: 'Samsung',            companyName: 'Samsung',                                         roles: ['consumer_brand', 'panel_manufacturer'], },
  { vid: 'TCL', shortName: 'TCL',                companyName: 'TCL Corporation',                                 roles: ['consumer_brand', 'panel_manufacturer'], },
  { vid: 'TOL', shortName: 'TCL',                companyName: 'TCL Corporation',                                 roles: ['consumer_brand', 'panel_manufacturer'], },
  { vid: 'TPV', shortName: 'TPV',                companyName: 'Top Victory Electronics (Fujian) Company Ltd.',   roles: ['consumer_brand', 'panel_manufacturer'], notes: 'Major TV/monitor OEM, widely associated with Philips/AOC ecosystem', },
  { vid: 'TSB', shortName: 'Toshiba',            companyName: 'Toshiba',                                         roles: ['consumer_brand', 'panel_manufacturer'], },
  { vid: 'VIZ', shortName: 'Vizio',              companyName: 'VIZIO, Inc.',                                     roles: ['consumer_brand'], },
  { vid: 'VSC', shortName: 'ViewSonic',          companyName: 'ViewSonic',                                       roles: ['consumer_brand'], },
  { vid: 'WDE', shortName: 'Westinghouse',       companyName: 'Westinghouse Digital Electronics',                roles: ['consumer_brand'], },
  { vid: 'WOR', shortName: 'Dell',               companyName: 'Dell',                                            roles: ['consumer_brand'], },
  { vid: 'WWW', shortName: 'Asus',               companyName: 'ASUSTeK Computer Inc.',                           roles: ['consumer_brand'], },
] as const satisfies NotableVendorShape[];
