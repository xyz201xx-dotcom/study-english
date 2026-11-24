const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
test('fixed lesson audio is reused at normal speed and stops on lesson change',()=>{
 const elements=new Map();const played=[];
 const context={lessons:require('../dist/lessons.js'),window:{addEventListener(){}},document:{addEventListener(){},getElementById(id){if(!elements.has(id))elements.set(id,{style:{},classList:{toggle(){}},setAttribute(){}});return elements.get(id);}},localStorage:{getItem(){return null;},setItem(){}},Audio:function(src){this.src=src;this.pause=()=>{this.paused=true;};this.play=()=>{played.push(this);return Promise.resolve();};}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/../dist/app.js','utf8'),context);
 elements.get('speak').onclick();
 assert.equal(played[0].src,'audio/day-03.wav');
 assert.equal(played[0].playbackRate,1);
 elements.get('speak').onclick();assert.equal(played[0].paused,true);
 elements.get('next').onclick();assert.equal(played[1].paused,true);
 elements.get('speak').onclick();assert.equal(played[2].src,'audio/day-04.wav');
});
