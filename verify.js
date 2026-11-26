const italian = require('./src/data/cuisines/italian.js');
const korean = require('./src/data/cuisines/korean.js');
const italianCount = italian.menuItems.length;
const koreanCount = korean.menuItems.length;
console.log('Italian menuItems count:', italianCount);
console.log('Korean menuItems count:', koreanCount);
console.log('Italian cuisineMeta:', JSON.stringify(italian.cuisineMeta));
console.log('Korean cuisineMeta:', JSON.stringify(korean.cuisineMeta));
// Check for unique IDs
const italianIds = italian.menuItems.map(m => m.id);
const koreanIds = korean.menuItems.map(m => m.id);
const uniqueItalian = new Set(italianIds).size;
const uniqueKorean = new Set(koreanIds).size;
console.log('Unique Italian IDs:', uniqueItalian, 'of', italianCount);
console.log('Unique Korean IDs:', uniqueKorean, 'of', koreanCount);
// Check categories
const italianCategories = [...new Set(italian.menuItems.map(m => m.category))];
const koreanCategories = [...new Set(korean.menuItems.map(m => m.category))];
console.log('Italian categories:', italianCategories.sort());
console.log('Korean categories:', koreanCategories.sort());
// Check cuisines
const italianCuisines = [...new Set(italian.menuItems.map(m => m.cuisine))];
const koreanCuisines = [...new Set(korean.menuItems.map(m => m.cuisine))];
console.log('Italian cuisines:', italianCuisines.sort());
console.log('Korean cuisines:', koreanCuisines.sort());
// Check price ranges
const italianPrices = italian.menuItems.map(m => m.price);
const koreanPrices = korean.menuItems.map(m => m.price);
console.log('Italian price range:', Math.min(...italianPrices), '-', Math.max(...italianPrices));
console.log('Korean price range:', Math.min(...koreanPrices), '-', Math.max(...koreanPrices));
// Check ID prefixes
const italianPrefixes = italianIds.map(id => id.slice(0,2));
const koreanPrefixes = koreanIds.map(id => id.slice(0,3));
console.log('Italian ID prefixes:', [...new Set(italianPrefixes)]);
console.log('Korean ID prefixes:', [...new Set(koreanPrefixes)]);
// Check spice levels
const italianSpice = [...new Set(italian.menuItems.map(m => m.spiceLevel))];
const koreanSpice = [...new Set(korean.menuItems.map(m => m.spiceLevel))];
console.log('Italian spice levels:', italianSpice.sort());
console.log('Korean spice levels:', koreanSpice.sort());
// Check isVeg distribution
const italianVeg = italian.menuItems.filter(m => m.isVeg).length;
const koreanVeg = korean.menuItems.filter(m => m.isVeg).length;
console.log('Italian vegetarian count:', italianVeg, 'of', italianCount);
console.log('Korean vegetarian count:', koreanVeg, 'of', koreanCount);
// Check rating range
const italianRatings = italian.menuItems.map(m => m.rating);
const koreanRatings = korean.menuItems.map(m => m.rating);
console.log('Italian rating range:', Math.min(...italianRatings), '-', Math.max(...italianRatings));
console.log('Korean rating range:', Math.min(...koreanRatings), '-', Math.max(...koreanRatings));
// Check prepTime distribution
const italianPrep = italian.menuItems.map(m => m.prepTime);
const koreanPrep = korean.menuItems.map(m => m.prepTime);
console.log('Italian prepTimes sample:', italianPrep.slice(0,5));
console.log('Korean prepTimes sample:', koreanPrep.slice(0,5));
// Check tags sample
const italianTags = [...new Set(italian.menuItems.flatMap(m => m.tags))];
const koreanTags = [...new Set(korean.menuItems.flatMap(m => m.tags))];
console.log('Italian tags count:', italianTags.length);
console.log('Korean tags count:', koreanTags.length);
// Check image URLs format
const italianImages = italian.menuItems.slice(0,3).map(m => m.image);
const koreanImages = korean.menuItems.slice(0,3).map(m => m.image);
console.log('Italian image sample:', italianImages);
console.log('Korean image sample:', koreanImages);
// Check isChefSpecial distribution
const italianChef = italian.menuItems.filter(m => m.isChefSpecial).length;
const koreanChef = korean.menuItems.filter(m => m.isChefSpecial).length;
console.log('Italian chef special count:', italianChef, 'of', italianCount);
console.log('Korean chef special count:', koreanChef, 'of', koreanCount);
// Check non-veg count
const italianNonVeg = italian.menuItems.filter(m => !m.isVeg).length;
const koreanNonVeg = korean.menuItems.filter(m => !m.isVeg).length;
console.log('Italian non-veg count:', italianNonVeg, 'of', italianCount);
console.log('Korean non-veg count:', koreanNonVeg, 'of', koreanCount);