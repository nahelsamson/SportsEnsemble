'use strict';
// Original vector drawings. Run from any directory with Node.js; no image service needed.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const ink = '#252d70';
const paper = '#f3f5f2';
const stroke = (d, width = 12) => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const fill = d => `<path d="${d}" fill="currentColor"/>`;
const circle = (x,y,r=11) => `<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor"/>`;
const ring = (x,y,r,w=6) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="currentColor" stroke-width="${w}"/>`;
const ellipse = (x,y,rx,ry,rotation=0,w=6) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rotation} ${x} ${y})" fill="none" stroke="currentColor" stroke-width="${w}"/>`;
const person = (x,y,torso,limbs) => circle(x,y)+stroke(torso,22)+stroke(limbs,13);
const waves = stroke('M30 180q15-12 30 0t30 0t30 0t30 0t30 0t30 0 M30 197q15-12 30 0t30 0t30 0t30 0t30 0',5);
const running = person(140,44,'M127 72 106 112','M128 74 155 94 181 72 M123 77 95 68 78 94 M108 113 148 138 165 173 M108 113 86 146 46 150');
const kicking = person(113,42,'M105 72 119 118','M107 75 73 91 47 73 M113 78 143 66 159 39 M120 116 91 155 80 190 M122 119 160 115 199 85');
const cycling = ring(58,153,37)+ring(184,153,37)+stroke('M58 153 99 99 126 153H58 M126 153 166 98 184 153 M155 96h23',5)+person(150,45,'M134 65 106 88','M134 66 156 83 169 85 M109 91 139 117 118 148 M106 91 83 119 94 144');
// Each drawing uses a 240 × 220 field, with equipment kept clear of the body.
const icons = {
  combat: ['Arts martiaux', kicking],
  boxing: ['Boxe', person(115,47,'M112 77 119 125','M108 81 87 104 98 71 M120 84 141 104 158 75 M118 129 92 160 74 188 M121 129 152 150 166 183')+circle(98,65,13)+circle(162,68,13)],
  judo: ['Judo', person(86,62,'M94 91 113 126','M95 92 130 82 156 97 M98 94 79 112 61 99 M112 128 89 166 61 179 M113 126 149 149 167 180')+person(160,77,'M148 105 133 132','M150 105 124 99 111 82 M151 105 174 124 M133 135 155 168 184 177 M132 134 111 161')],
  fencing: ['Escrime', person(97,57,'M101 87 116 123','M104 91 147 99 174 91 M98 89 76 65 48 76 M116 127 79 159 46 174 M122 129 155 149 188 150')+stroke('M168 92 218 66 M171 83l7 17',4)],
  run: ['Athlétisme', running+stroke('M49 184H185',3)],
  trail: ['Course & trail', running+stroke('M25 192 74 179 127 194 184 182 216 192',4)],
  ball: ['Football', kicking+ring(193,168,21)+fill('m193 155 12 9-5 14h-14l-5-14Z')+stroke('M193 155v-7 M205 164l8-2 M200 178l5 8 M186 178l-5 8 M181 164l-8-2',3)],
  basket: ['Basket', person(111,62,'M111 91 103 130','M108 91 134 72 150 44 M118 91 145 85 163 61 M104 132 83 164 52 170 M107 131 139 160 155 186')+ring(159,27,15,5)+stroke('M146 28h27 M159 14q-10 13 0 27 M159 14q10 13 0 27',2)+stroke('M191 66h31 M218 35v65 M192 70l6 25h15l6-25',4)],
  handball: ['Handball', person(127,52,'M121 81 104 115','M122 82 146 101 167 86 M116 82 86 64 83 37 M105 118 76 146 46 141 M108 120 141 148 158 181')+circle(83,20,12)],
  rugby: ['Rugby', running+`<ellipse cx="169" cy="88" rx="13" ry="21" transform="rotate(40 169 88)" fill="currentColor"/>`+stroke('M164 81l10 12',3).replace('currentColor',paper)],
  volley: ['Volley-ball', person(120,76,'M120 105 122 140','M112 106 91 82 100 51 M128 106 148 80 143 48 M117 142 91 177 71 178 M128 142 150 166 172 158')+ring(125,26,17,5)+stroke('M110 21q19 1 23 20 M121 10q-2 10 17 26',2)],
  racket: ['Tennis', person(101,58,'M99 88 121 124','M99 89 73 111 44 103 M104 91 135 90 160 70 M122 126 95 156 63 174 M127 129 158 155 185 152')+ellipse(177,44,16,25,35,5)+stroke('M162 65 151 80',5)+circle(206,106,6)],
  badminton: ['Badminton', person(101,63,'M103 92 123 129','M103 94 72 118 46 107 M111 92 144 75 149 47 M121 130 93 161 60 176 M125 133 158 153 185 152')+ellipse(150,25,11,19,20,5)+stroke('M148 44 143 59',5)+fill('m193 50 14 16 13-19Z')+circle(207,70,5)+stroke('m201 50 6 14 5-15',2).replace('currentColor',paper)],
  padel: ['Padel', person(98,55,'M100 85 121 125','M102 87 70 113 44 111 M106 90 141 102 163 82 M121 128 94 162 66 180 M127 130 159 157 190 154')+`<ellipse cx="174" cy="57" rx="19" ry="25" transform="rotate(28 174 57)" fill="currentColor"/>`+stroke('M165 78 156 94',6)+[[-6,-9],[5,-9],[-6,2],[5,2],[-2,13]].map(([x,y])=>circle(174+x,55+y,2.3).replace('currentColor',paper)).join('')+circle(210,105,6)],
  tabletennis: ['Tennis de table', person(67,52,'M73 83 97 117','M72 84 43 110 M78 89 113 94 141 76 M97 119 72 157 49 181 M100 121 129 150 139 180')+`<ellipse cx="149" cy="62" rx="14" ry="18" transform="rotate(30 149 62)" fill="currentColor"/>`+stroke('M129 130h97 M139 132v54 M210 132v54 M176 112v18',6)+circle(194,104,6)],
  bike: ['Cyclisme', cycling],
  bmx: ['BMX & VTT', `<g transform="rotate(-10 120 120)">${cycling}</g>`+stroke('M18 208 90 199 175 213 223 201',4)],
  motorbike: ['Motocyclisme', ring(57,164,30)+ring(186,164,30)+fill('M57 146 87 111h41l24 31-33 27H84Z')+stroke('M145 94h19l22 68',8)+person(140,49,'M127 76 106 98','M127 78 150 102 163 102 M107 101 128 131 112 154')],
  water: ['Natation', circle(175,132,12)+stroke('M151 139 108 128',20)+stroke('M126 132 94 99 62 116 M104 130 78 153 42 150',12)+waves],
  rowing: ['Aviron', person(126,73,'M119 102 133 131','M124 107 91 122 67 114 M131 133 159 152 187 148')+stroke('M35 162h171l-17 17H60Z',7)+stroke('M83 117 157 201',6)+fill('m150 182 25 16-7 10-21-19Z')+stroke('M25 195h74 M185 195h32',4)],
  diving: ['Plongée', circle(168,105,12)+stroke('M143 116 104 132',20)+stroke('M131 121 151 148 184 143 M105 132 76 151 52 132 M108 132 76 118 51 103',12)+fill('M55 129 28 121 38 146 58 141Z M56 99 31 80 25 99 45 115Z')+stroke('M115 108 136 99',12)+ring(179,76,5,3)+ring(190,55,7,3)],
  yoga: ['Yoga & pilates', person(120,53,'M120 84v47','M111 94 88 125 59 121 M129 94 152 125 181 121')+stroke('M115 135 82 161 120 176 158 161 125 135 M84 165h72',13)],
  dance: ['Danse', person(116,42,'M112 73 119 116','M110 76 76 60 62 30 M117 77 150 93 181 77 M118 119 90 148 55 150 M123 120 147 156 162 194')+fill('m112 96 19 7 24 36-59-5Z')],
  gymnastics: ['Gymnastique', person(125,102,'M112 124 93 144','M113 126 145 146 158 179 M105 134 112 163 116 180 M91 143 71 97 46 72 M91 139 99 88 86 43')+stroke('M26 190h190',4)],
  cheer: ['Cheerleading', person(120,55,'M120 85v44','M111 89 83 74 65 48 M129 89 157 74 175 48 M116 132 94 169 79 189 M125 132 147 169 162 189')+fill('m111 111 18 0 21 36H90Z')+circle(58,34,18)+circle(182,34,18)+stroke('M41 16l34 35 M40 52l36-36 M165 16l34 35 M164 52l36-36',5)],
  circus: ['Cirque', person(120,70,'M120 100v37','M112 106 85 125 63 109 M128 106 155 125 177 109 M117 140 97 173 81 190 M125 140 145 173 161 190')+circle(65,77,10)+circle(178,77,10)+circle(121,28,10)],
  fitness: ['Fitness & musculation', person(120,85,'M120 116v32','M110 118 84 99 84 67 M130 118 156 99 156 67 M116 151 96 174 92 197 M125 151 145 174 149 197')+stroke('M50 63h140',7)+stroke('M59 48v30 M73 43v40 M167 43v40 M181 48v30',10)],
  workout: ['Street workout', person(120,88,'M120 118v27','M110 116 84 90 84 51 M130 116 156 90 156 51 M116 146 90 167 65 166 M126 146 145 172 174 172')+stroke('M47 196V44h146v152',7)],
  mountain: ['Escalade', person(143,57,'M129 88 119 126','M130 91 162 86 174 51 M124 91 92 80 80 50 M116 130 91 151 72 144 M124 129 146 161 142 191')+stroke('M68 35h21 M164 39h23 M53 151h24 M129 205h25 M179 139h21',5)],
  hike: ['Randonnée', person(119,50,'M116 80 112 123','M119 89 151 108 168 85 M110 87 86 119 M113 127 94 157 79 190 M118 127 144 149 154 185')+stroke('M169 80 156 198',5)+stroke('M96 78 88 104',15)+stroke('M27 192 58 180 103 199 186 196 216 177',4)],
  ski: ['Ski', person(123,48,'M108 76 88 106','M113 81 147 93 173 86 M89 109 131 133 109 164 M90 108 108 139 85 171')+stroke('M36 180 189 163q16-2 22-12 M29 196l161-17 M160 95 191 143 M146 98 174 151',5)],
  horse: ['Équitation', fill('M45 106 69 97h69l17-38 21 4 23 34-10 16-22-12-9 33-5 28 20 22-8 9-31-26-1-25H84l-13 21-9 33H49l8-39 7-23-20-11-12 27-9-5 10-34Z')+person(124,29,'M118 57 110 94','M119 64 146 84 166 83 M111 96 135 119 127 144')],
  golf: ['Golf', person(106,49,'M106 79 120 119','M107 85 136 92 156 65 M108 86 135 103 161 80 M121 122 95 153 79 184 M125 124 143 154 160 185')+stroke('M157 64 108 24h-19',5)+circle(185,190,5)+stroke('M57 201h143',3)],
  hockey: ['Hockey', person(116,56,'M105 86 92 117','M107 90 135 113 158 136 M97 97 119 126 141 142 M90 122 65 151 42 180 M97 123 126 152 146 180')+stroke('M147 133 187 181q8 12 22-1',6)+circle(211,190,5)],
  frisbee: ['Ultimate frisbee', person(107,50,'M110 80 117 119','M109 85 78 104 54 86 M117 86 149 82 179 95 M116 122 91 152 56 171 M122 123 153 151 178 175')+ellipse(203,94,17,4,0,4)],
  wheels: ['Roller', person(138,43,'M124 70 103 104','M122 75 151 96 183 88 M117 74 89 61 68 82 M104 108 140 135 125 170 M103 108 76 139 45 151')+stroke('M117 173h27 M34 157h25',7)+circle(119,186,5)+circle(138,186,5)+circle(36,169,5)+circle(54,169,5)],
  skate: ['Skateboard', person(126,46,'M120 77 108 112','M121 82 157 99 188 83 M115 82 80 96 58 83 M108 115 81 144 66 166 M112 119 143 142 170 166')+stroke('M44 180q9 7 22 7h104q17 0 23-11',7)+circle(76,201,7)+circle(159,201,7)],
  archery: ['Tir à l’arc', person(101,55,'M101 85v48','M105 89h61 M95 87 63 104 100 106 M101 135 83 183 M108 136 132 184')+stroke('M171 40q37 54 0 108 M171 40l-14 54 14 54 M103 94h107',4)+fill('m213 94-12-5v10Z')],
  target: ['Tir sportif', person(79,52,'M79 82v47','M86 89h56 M75 93 105 105 139 91 M76 132 60 183 M84 132 104 183')+stroke('M132 83h25v-9h-14',6)+ring(201,87,27,5)+ring(201,87,14,4)+circle(201,87,3)],
  boules: ['Pétanque', person(111,51,'M105 80 99 119','M106 85 134 101 150 128 M101 86 81 111 60 98 M99 122 79 154 65 185 M106 122 125 157 149 184')+circle(159,145,8)+circle(194,191,13)+circle(166,196,10)+circle(215,191,4)],
  bowling: ['Bowling', person(101,51,'M100 81 113 118','M101 87 72 103 50 86 M107 87 141 112 150 139 M112 122 84 157 55 173 M119 125 151 157 177 160')+circle(155,159,16)+fill('M194 87c-14 0-10 19-6 28 2 12-11 28-9 50h30c2-22-11-38-9-50 4-9 8-28-6-28Z')+stroke('M187 117h14',4).replace('currentColor',paper)],
  billiards: ['Billard', stroke('M35 112h169l-25 64H16Z M32 177v20 M177 177v20 M56 119l141-63',7)+circle(138,132,11)+circle(98,147,10)+circle(163,145,9)],
  chess: ['Échecs', fill('M133 36v21h21v13h-21v21h-16V70H96V57h21V36Z M91 97h67l-8 21h-51Z M101 126h47l-9 41 26 13v14H84v-14l26-13Z M76 202h97v13H76Z')],
  access: ['Handisport', circle(135,47,12)+stroke('M121 77 108 109',22)+stroke('M120 80 148 93 171 77 M110 111 150 123 166 153 194 155',12)+ring(96,150,39,8)+stroke('M99 132 116 151',6)],
  air: ['Sports aériens', fill('M115 29h10l10 61 78 36v12l-79-15-3 48 28 17v10l-39-10-39 10v-10l28-17-3-48-79 15v-12l78-36Z')],
  parachute: ['Parachutisme', stroke('M33 83c5-80 169-80 174 0 M33 83q22-16 44 0 22-16 43 0 22-16 43 0 22-16 44 0 M33 84l77 67 M207 84l-77 67 M77 84l33 64 M163 84l-33 64',4)+circle(120,136,10)+stroke('M120 157v21 M111 160 93 143 M129 160l18-17 M118 179 102 198 M124 179 140 198',10)],
  dog: ['Sport canin', fill('M52 108h83l22-35 18 5 7 18 28 10-9 18h-28l-16 24v43h-14l-9-36H85l-17 36H53l11-47-17-23-25-11 5-11Z')+fill('m157 72 1-16 18 22Z')+circle(172,98,3).replace('currentColor',paper)+stroke('M39 91V54h57 M39 67h40',5)],
  car: ['Sport automobile', stroke('M34 143v-26l25-12 21-35h69l33 35 25 12v26 M34 145h23 M86 145h68 M183 145h24 M63 105h116 M117 74v30',8)+ring(73,145,19,7)+ring(169,145,19,7)+stroke('M32 72h25 M27 90h22',4)],
  venue: ['Équipements sportifs', stroke('M38 100 120 49 202 100 M48 104v83h144v-83 M86 187v-62h68v62 M33 190h174',9)+stroke('M120 136v43 M59 108h122',4)],
  park: ['Parcs & plein air', fill('M67 42 33 95h19l-30 45h35v48h19v-48h35l-30-45h19Z')+stroke('M136 133h64 M137 148h62 M144 148v39 M192 148v39 M127 190h82',7)+circle(172,64,19)],
  multisport: ['Multisports', `<g transform="translate(-14 0) scale(.82)">${running}</g>`+ring(179,156,27,6)+stroke('M153 155h52 M179 130q-14 25 0 52 M179 130q14 25 0 52',3)]
};


const disciplineMap = {
  'Accrobranche':'mountain','Aéromodélisme':'air','Aéronautique':'air','Aïkido':'judo','Arts martiaux':'combat','Athlétisme':'run','Automobile':'car','Aviron':'rowing','Badminton':'badminton','Basket':'basket','Billard':'billiards','BMX / Cyclisme':'bmx','Boulodromes':'boules','Bowling':'bowling','Bowling / Billard':'bowling','Boxe':'boxing','Capoeira':'combat','Cheerleading':'cheer','Cirque':'circus','City-stades':'venue','Complexes sportifs':'venue','Course à pied/Trail':'trail',"Course d'orientation":'hike','Courts de tennis':'racket','CrossFit':'fitness','Cyclisme':'bike','Cyclisme/VTT':'bmx','Danse':'dance','Danse/Fitness':'dance','Danse/Pilates':'yoga','Dojos':'combat','Échecs':'chess','Électrostimulation':'fitness','Équitation':'horse','Escalade':'mountain','Escrime':'fencing','Fitness/Danse':'dance','Fitness/GV':'fitness','Fitness/Musculation':'fitness','Football':'ball','Football américain':'rugby','Golf':'golf','Gymnases':'venue','Gymnastique':'gymnastics','Haltérophilie/Musculation':'fitness','Handball':'handball','Handisport':'access','Hockey':'hockey','Judo':'judo','Karaté':'combat','Krav Maga':'combat','Lutte':'judo','Motocyclisme':'motorbike','Multisports':'multisport','Murs escalade':'mountain','Natation':'water','Padel':'padel','Parachutisme':'parachute','Parcs publics':'park','Pentathlon':'multisport','Pickleball':'padel','Pilates/Yoga':'yoga','Piscines':'water','Plongée':'diving','Randonnée':'hike','Roller':'wheels','Roller/Skate':'skate','Rugby':'rugby','Salles spécifiques':'venue','Skateparks - BMX':'skate','Ski':'ski','Spéléologie':'mountain','Sport canin':'dog','Sports aériens':'parachute','Sports boules':'boules','Sports de combat':'combat','Squash':'racket','Stades':'venue','Stands de tir':'target','Street workout - Parcs':'workout','Taekwondo':'combat','Tennis':'racket','Tennis de table':'tabletennis','Tir':'target',"Tir à l'arc":'archery','Triathlon':'multisport','Ultimate Frisbee':'frisbee','Volley-ball':'volley','Yoga':'yoga'
};
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function render(name, drawing) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300" role="img" aria-labelledby="title"><title id="title">${escape(name)} — pictogramme sportif</title><rect width="600" height="300" fill="${paper}"/><g color="${ink}" transform="translate(170.4 27) scale(1.08)">${drawing}</g></svg>\n`;
}
// Validate every path so that an incomplete drawing can never reach production.
for (const [key,[name,drawing]] of Object.entries(icons)) {
  for (const [,d] of drawing.matchAll(/ d="([^"]+)"/g)) if (/[^MmZzLlHhVvCcSsQqTtAaEe0-9.,+\-\s]/.test(d)) throw Error('Invalid path in '+key);
  fs.writeFileSync(path.join(root,'assets/clubs',key+'.svg'),render(name,drawing));
}
const context = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'clubs-data.js'),'utf8'),context);
for (const club of context.window.CLUB_DIRECTORY) {
  if (club.imageSource) { club.image = club.image.replace(/^\//,''); continue; }
  const key = club.discipline === 'Sports aériens' && /aéro.?club|aviation/i.test(club.name) ? 'air' : disciplineMap[club.discipline];
  if (!icons[key]) throw Error('Missing pictogram for '+club.discipline);
  club.image = 'assets/clubs/'+key+'.svg';
  club.imageCredit = 'Pictogramme original de la discipline · Aix Sport Local';
}
fs.writeFileSync(path.join(root,'clubs-data.js'),'window.CLUB_DIRECTORY = '+JSON.stringify(context.window.CLUB_DIRECTORY,null,2)+';\n');
console.log(`${Object.keys(icons).length} pictograms generated; ${context.window.CLUB_DIRECTORY.length} image paths updated.`);
