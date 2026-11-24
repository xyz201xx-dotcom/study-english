const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const lessons = require('../dist/lessons.js');
function boot(stored = null) {
 const elements = new Map();
 const element = () => ({textContent:'',innerHTML:'',style:{},classList:{toggle(){}},setAttribute(){}});
 const storage = {value:stored,getItem(){return this.value;},setItem(k,v){this.value=v;}};
 const context = {lessons,localStorage:storage,document:{addEventListener(){},getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);}},window:{addEventListener(){}}};
 vm.runInNewContext(fs.readFileSync('dist/app.js','utf8'),context);
 return {elements,storage};
}
test('30 complete taxi lessons, including supplied first two',()=>{
 assert.equal(lessons.length,30);assert.ok(lessons.every(l=>l.length===4 && l.every(Boolean)));
 assert.equal(lessons[0][1],'Would you like me to help you with your bags?');
 assert.equal(lessons[1][1],'How would you like to pay?');
});
test('starts at day 3, caps at 100, supports undo and retains progress',()=>{
 const a=boot();const e=a.elements;
 assert.equal(e.get('dayLabel').textContent,'DAY 03');
 assert.equal(e.get('total').textContent,'2 / 30 日 完了');
 for(let i=0;i<110;i++)e.get('count').onclick();
 assert.equal(e.get('number').textContent,100);
 assert.equal(e.get('count').disabled,true);
 assert.equal(e.get('total').textContent,'3 / 30 日 完了');
 e.get('undo').onclick();assert.equal(e.get('number').textContent,99);
 e.get('next').onclick();e.get('count').onclick();
 const b=boot(a.storage.value);
 assert.equal(b.elements.get('dayLabel').textContent,'DAY 04');
 assert.equal(b.elements.get('number').textContent,1);
 b.elements.get('prev').onclick();assert.equal(b.elements.get('number').textContent,99);
});
test('invalid saved data is bounded',()=>{
 const a=boot(JSON.stringify({counts:[-7,1000,'bad'],selected:50}));
 assert.equal(a.elements.get('dayLabel').textContent,'DAY 03');

 const b=boot('broken');assert.equal(b.elements.get('number').textContent,0);
});
