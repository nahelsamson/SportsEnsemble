const {test}=require('node:test'),assert=require('node:assert/strict'),A=require('../agenda-core.js'),clubs=require('../agenda-catalog.cjs');
test('Règles âge : limites, adultes et estimations incertaines',()=>{
 for(const [text,age,want] of [['8-12 ans',8,'match'],['8 à 12 ans',13,'excluded'],['Dès 16 ans',15,'excluded'],['À partir de 16 ans',16,'match'],['50 ans et +',49,'excluded'],['Adultes',17,'excluded'],['Tout public',5,'match'],['18-35 ans (cible estimée)',50,'unknown'],['Enfants 8-12 ans ; adultes',25,'unknown'],['Non communiqué en ligne',30,'unknown']])assert.equal(A.ageMatch(text,age),want,text);
});
test('Préférences contrôlées et URL itinéraire encodée',()=>{
 assert.throws(()=>A.validate({age:14.5,sports:[],selectedIds:[]},clubs));
 assert.throws(()=>A.validate({age:14,sports:['inconnu'],selectedIds:[]},clubs));
 const p=A.validate({age:22,sports:['Tennis','Tennis'],selectedIds:[]},clubs);assert.deepEqual(p.sports,['Tennis']);
 const x={fields:{Adresse:'12 rue A & B, Aix-en-Provence'}};const u=new URL(A.directions(x));assert.equal(u.searchParams.get('destination'),x.fields.Adresse);assert.equal(u.hostname,'www.google.com');
});
