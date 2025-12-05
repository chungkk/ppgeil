const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('/tmp/lid_questions.json', 'utf8'));

const stateMapping = {
  'BW': 'bw', 'BY': 'by', 'BE': 'be', 'BB': 'bb', 'HB': 'hb', 'HH': 'hh',
  'HE': 'he', 'MV': 'mv', 'NI': 'ni', 'NW': 'nw', 'RP': 'rp', 'SL': 'sl',
  'SN': 'sn', 'ST': 'st', 'SH': 'sh', 'TH': 'th'
};
const solutionMap = { a: 0, b: 1, c: 2, d: 3 };

const generalQuestions = [];
const stateQuestions = {};
Object.values(stateMapping).forEach(s => stateQuestions[s] = []);

data.forEach(q => {
  const num = q.num;
  const en = q.translation?.en || {};
  
  const formatted = {
    q: q.question,
    o: [q.a, q.b, q.c, q.d],
    a: solutionMap[q.solution],
    ...(q.image !== '-' ? { img: q.image } : {}),
    en: {
      q: en.question || '',
      o: [en.a || '', en.b || '', en.c || '', en.d || '']
    },
    vi: { q: '', o: ['', '', '', ''] }
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

const outputPath = path.join(__dirname, '../lib/data/lebenInDeutschland.js');
fs.writeFileSync(outputPath, output);
console.log('File updated with EN translations!');
console.log('General questions:', generalQuestions.length);
console.log('State questions:', Object.values(stateQuestions).reduce((sum, arr) => sum + arr.length, 0));
