const {test}=require('node:test');
const assert=require('node:assert/strict');
const VoiceCounter=require('../dist/voice-counter.js');
function feed(detector,loud,from,to){let count=0;for(let t=from;t<=to;t+=50)if(detector.sample(loud,t))count++;return count;}
test('continuous phrase and short pauses count once; next utterance after silence counts again',()=>{
 const d=new VoiceCounter(1200);
 assert.equal(feed(d,true,0,100),0);
 assert.equal(feed(d,false,150,400),0);
 assert.equal(feed(d,true,450,2000),1);
 feed(d,false,2050,2500);
 assert.equal(feed(d,true,2550,3500),0);
 feed(d,false,3550,4800);
 assert.equal(feed(d,true,4850,6000),1);
});
test('configurable gap, noise rejection, and reset',()=>{
 const d=new VoiceCounter(800);
 assert.equal(feed(d,true,0,100),0);
 feed(d,false,150,1000);
 assert.equal(feed(d,true,1050,1400),1);
 feed(d,false,1450,2300);
 assert.equal(feed(d,true,2350,2700),1);
 d.reset();assert.equal(feed(d,true,2750,3100),1);
});
test('speech with syllable gaps counts while isolated clicks do not',()=>{
 const d=new VoiceCounter();let count=0;
 for(let t=0;t<=1000;t+=20) if(d.sample(t%160<100,t))count++;
 assert.equal(count,1);
 const noise=new VoiceCounter();count=0;
 for(let t=0;t<=1000;t+=20) if(noise.sample(t%300===0,t))count++;
 assert.equal(count,0);
});
test('calibration tolerates speech and quiet microphones',()=>{
 const {voiceThreshold}=require('../dist/voice-counter.js');
 assert.equal(voiceThreshold([.001,.001,.001,.1,.2]),.004);
 assert.equal(voiceThreshold([.1,.2,.3]),.02);
});
