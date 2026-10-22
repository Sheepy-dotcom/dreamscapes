// Frame-walking duration for MP3 buffers, with no dependency and no decoding.
//
// Narration arrives as an opaque buffer over HTTP 200, so the only way to know
// whether the model actually read the text is to measure what came back. This
// walks the MPEG frame headers and sums their durations, which is exact for
// both constant and variable bitrate and costs a few milliseconds on a file
// the size of a story chunk.

// Layer III only - the speech endpoint has never returned anything else, and a
// wrong guess here would be worse than refusing to measure.
const BITRATES_V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
const BITRATES_V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
const SAMPLE_RATES = {
  // MPEG 1, MPEG 2, MPEG 2.5
  3: [44100, 48000, 32000],
  2: [22050, 24000, 16000],
  0: [11025, 12000, 8000],
};

// An ID3v2 tag sits in front of the first frame and its body length is stored
// as four 7-bit groups, so the high bit of each byte has to be dropped.
function skipId3(buffer) {
  if (buffer.length < 10 || buffer.toString("latin1", 0, 3) !== "ID3") return 0;
  const size =
    ((buffer[6] & 0x7f) << 21) | ((buffer[7] & 0x7f) << 14) | ((buffer[8] & 0x7f) << 7) | (buffer[9] & 0x7f);
  return Math.min(buffer.length, 10 + size);
}

function readFrame(buffer, offset) {
  if (offset + 4 > buffer.length) return null;
  // Sync is eleven set bits across the first byte and the top three of the second.
  if (buffer[offset] !== 0xff || (buffer[offset + 1] & 0xe0) !== 0xe0) return null;

  const versionBits = (buffer[offset + 1] >> 3) & 0x03;
  const layerBits = (buffer[offset + 1] >> 1) & 0x03;
  // 1 is a reserved version, and layer bits 01 is the only one we handle.
  if (versionBits === 1 || layerBits !== 1) return null;

  const bitrateIndex = (buffer[offset + 2] >> 4) & 0x0f;
  const sampleRateIndex = (buffer[offset + 2] >> 2) & 0x03;
  if (bitrateIndex === 0 || bitrateIndex === 15 || sampleRateIndex === 3) return null;

  const isVersion1 = versionBits === 3;
  const bitrate = (isVersion1 ? BITRATES_V1_L3 : BITRATES_V2_L3)[bitrateIndex] * 1000;
  const sampleRate = SAMPLE_RATES[versionBits][sampleRateIndex];
  if (!bitrate || !sampleRate) return null;

  const samples = isVersion1 ? 1152 : 576;
  const padding = (buffer[offset + 2] >> 1) & 0x01;
  const length = Math.floor(((samples / 8) * bitrate) / sampleRate) + padding;
  if (length < 4) return null;

  return { length, seconds: samples / sampleRate };
}

/* Returns the playable length in seconds, or 0 when the buffer holds no
   readable frames at all - which is itself the answer worth having, since an
   empty or non-audio body is the clearest possible sign something went wrong.
   Resyncs rather than giving up on a bad byte, so one corrupt frame in the
   middle does not read as a truncated file. */
function getMp3DurationSeconds(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return 0;

  let offset = skipId3(buffer);
  let seconds = 0;
  let frames = 0;

  while (offset < buffer.length - 4) {
    const frame = readFrame(buffer, offset);
    if (frame) {
      seconds += frame.seconds;
      frames += 1;
      offset += frame.length;
      continue;
    }
    offset += 1;
  }

  return frames ? seconds : 0;
}

module.exports = { getMp3DurationSeconds };
