import { DATA_BLOCK_TYPE } from './edid-parser-constants';
import type {
  AudioDataBlock,
  DataBlock,
  ExtendedTagDataBlock,
  SpeakerDataBlock,
  VendorDataBlock,
  VideoDataBlock,
} from './edid-parser-types';

export function isAudioBlock(
  block: DataBlock | null | undefined,
): block is AudioDataBlock {
  return block?.tag.value === DATA_BLOCK_TYPE.AUDIO.value;
}

export function isVideoBlock(
  block: DataBlock | null | undefined,
): block is VideoDataBlock {
  return block?.tag.value === DATA_BLOCK_TYPE.VIDEO.value;
}

export function isVendorBlock(
  block: DataBlock | null | undefined,
): block is VendorDataBlock {
  return block?.tag.value === DATA_BLOCK_TYPE.VENDOR_SPECIFIC.value;
}

export function isSpeakerBlock(
  block: DataBlock | null | undefined,
): block is SpeakerDataBlock {
  return block?.tag.value === DATA_BLOCK_TYPE.SPEAKER_ALLOCATION.value;
}

export function isExtendedTagBlock(
  block: DataBlock | null | undefined,
): block is ExtendedTagDataBlock {
  return block?.tag.value === DATA_BLOCK_TYPE.EXTENDED_TAG.value;
}
