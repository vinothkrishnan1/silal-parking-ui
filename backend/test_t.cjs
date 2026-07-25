const fs = require('fs');
const en = JSON.parse(fs.readFileSync('src/translations/en.json', 'utf8'));
const ar = JSON.parse(fs.readFileSync('src/translations/ar.json', 'utf8'));

const translations = { en, ar };

function t(path, language) {
    if (typeof path !== 'string') return path;
    const keys = path.split('.');
    let result = translations[language];
    for (const key of keys) {
      if (result && result[key] !== undefined) { // In the original code it's if (result && result[key]) 
        result = result[key];
      } else {
        return path; // Fallback to key itself
      }
    }
    return result;
}

console.log("EN test:", t('subscription.startedAgo', 'en'));
console.log("AR test:", t('subscription.startedAgo', 'ar'));
