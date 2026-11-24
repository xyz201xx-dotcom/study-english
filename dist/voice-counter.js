// Count speech bursts, allowing natural short gaps between syllables.
class VoiceCounter {
  constructor(gap = 800) { this.gap = gap; this.reset(); }
  reset() { this.armed = true; this.voiced = 0; this.quiet = null; this.last = null; }
  sample(loud, now) {
    if (this.last !== null && now - this.last > 500) this.reset();
    const elapsed = this.last === null ? 0 : Math.min(100, now - this.last);
    this.last = now;
    if (!loud) {
      if (this.quiet === null) this.quiet = now;
      // Brief gaps inside a word must not erase all detected speech.
      if (now - this.quiet >= 180) this.voiced = 0;
      if (now - this.quiet >= this.gap) this.armed = true;
      return false;
    }
    this.quiet = null;
    if (!this.armed) return false;
    this.voiced += elapsed;
    if (this.voiced < 180) return false;
    this.armed = false; this.voiced = 0;
    return true;
  }
}
function voiceThreshold(samples) {
  const sorted = [...samples].sort((a,b)=>a-b);
  const floor = sorted[Math.floor(sorted.length * .2)] || 0;
  // Starting to speak during calibration must not make detection impossible.
  return Math.max(.004, Math.min(.02, floor * 2.5));
}
if (typeof module !== 'undefined') {module.exports = VoiceCounter; module.exports.voiceThreshold = voiceThreshold;}
