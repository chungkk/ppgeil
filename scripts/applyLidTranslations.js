/**
 * Apply Vietnamese translations to Leben in Deutschland data file
 * Run this after translateLidToVietnamese.js completes
 */

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../lib/data/lebenInDeutschland.js');
const progressPath = path.join(__dirname, '../lib/data/lid_translation_progress.json');

async function main() {
  if (!fs.existsSync(progressPath)) {
    console.error('Progress file not found. Run translateLidToVietnamese.js first.');
    process.exit(1);
  }

  const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
  const translationCount = Object.keys(progress.translated).length;
  console.log(`Found ${translationCount} translations in progress file.`);

  if (translationCount === 0) {
    console.log('No translations to apply.');
    return;
  }

  // Read original JSON from /tmp
  const jsonPath = '/tmp/lid_questions.json';
  if (!fs.existsSync(jsonPath)) {
    console.error('Original JSON not found at /tmp/lid_questions.json');
    console.error('Please re-download from GitHub');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  const stateMapping = {
    'BW': 'bw', 'BY': 'by', 'BE': 'be', 'BB': 'bb', 'HB': 'hb', 'HH': 'hh',
    'HE': 'he', 'MV': 'mv', 'NI': 'ni', 'NW': 'nw', 'RP': 'rp', 'SL': 'sl',
    'SN': 'sn', 'ST': 'st', 'SH': 'sh', 'TH': 'th'
  };
  const solutionMap = { a: 0, b: 1, c: 2, d: 3 };

  const generalQuestions = [];
  const stateQuestions = {};
  Object.values(stateMapping).forEach(s => stateQuestions[s] = []);

  let appliedCount = 0;

  data.forEach(q => {
    const num = q.num;
    const en = q.translation?.en || {};
    
    let viTranslation = { q: '', o: ['', '', '', ''] };
    
    // Check if this question has Vietnamese translation
    if (num.includes('-')) {
      const [stateCode, id] = num.split('-');
      const state = stateMapping[stateCode];
      const key = `state-${state}-${id}`;
      if (progress.translated[key]) {
        viTranslation = progress.translated[key];
        appliedCount++;
      }
    } else {
      const key = `general-${num}`;
      if (progress.translated[key]) {
        viTranslation = progress.translated[key];
        appliedCount++;
      }
    }
    
    const formatted = {
      q: q.question,
      o: [q.a, q.b, q.c, q.d],
      a: solutionMap[q.solution],
      ...(q.image !== '-' ? { img: q.image } : {}),
      en: {
        q: en.question || '',
        o: [en.a || '', en.b || '', en.c || '', en.d || '']
      },
      vi: viTranslation
    };
    
    if (num.includes('-')) {
      const [stateCode, id] = num.split('-');
      const state = stateMapping[stateCode];
      if (state) {
        stateQuestions[state].push({ id: parseInt(id), ...formatted });
      }
    } else {
      generalQuestions.push({ id: parseInt(num), ...formatted });
    }
  });

  generalQuestions.sort((a, b) => a.id - b.id);
  Object.values(stateQuestions).forEach(arr => arr.sort((a, b) => a.id - b.id));

  console.log(`Applied ${appliedCount} Vietnamese translations.`);

  const output = `export const bundeslaender = [
  { code: "bw", name: "Baden-Württemberg", capital: "Stuttgart" },
  { code: "by", name: "Bayern", capital: "München" },
  { code: "be", name: "Berlin", capital: "Berlin" },
  { code: "bb", name: "Brandenburg", capital: "Potsdam" },
  { code: "hb", name: "Bremen", capital: "Bremen" },
  { code: "hh", name: "Hamburg", capital: "Hamburg" },
  { code: "he", name: "Hessen", capital: "Wiesbaden" },
  { code: "mv", name: "Mecklenburg-Vorpommern", capital: "Schwerin" },
  { code: "ni", name: "Niedersachsen", capital: "Hannover" },
  { code: "nw", name: "Nordrhein-Westfalen", capital: "Düsseldorf" },
  { code: "rp", name: "Rheinland-Pfalz", capital: "Mainz" },
  { code: "sl", name: "Saarland", capital: "Saarbrücken" },
  { code: "sn", name: "Sachsen", capital: "Dresden" },
  { code: "st", name: "Sachsen-Anhalt", capital: "Magdeburg" },
  { code: "sh", name: "Schleswig-Holstein", capital: "Kiel" },
  { code: "th", name: "Thüringen", capital: "Erfurt" }
];

export const generalQuestions = ${JSON.stringify(generalQuestions, null, 2)};

export const stateQuestions = ${JSON.stringify(stateQuestions, null, 2)};

export const testConfig = {
  totalQuestions: 33,
  generalQuestions: 30,
  stateQuestions: 3,
  passingScore: 17,
  timeLimit: 60
};

export const getImageUrl = (imgName) => {
  return \`https://www.lebenindeutschland.eu/img/questions/\${imgName}\`;
};

export const generateTest = (stateCode) => {
  const shuffledGeneral = [...generalQuestions].sort(() => Math.random() - 0.5);
  const selectedGeneral = shuffledGeneral.slice(0, testConfig.generalQuestions);
  
  const stateQs = stateQuestions[stateCode] || [];
  const shuffledState = [...stateQs].sort(() => Math.random() - 0.5);
  const selectedState = shuffledState.slice(0, testConfig.stateQuestions);
  
  return [...selectedGeneral, ...selectedState].map((q, idx) => ({
    ...q,
    testNumber: idx + 1
  }));
};
`;

  fs.writeFileSync(dataPath, output);
  console.log('Data file updated with Vietnamese translations!');
}

main().catch(console.error);
