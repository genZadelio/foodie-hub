import { menuItems as chinese } from './cuisines/chinese.js';
import { menuItems as japanese } from './cuisines/japanese.js';
import { menuItems as indian } from './cuisines/indian.js';
import { menuItems as southIndian } from './cuisines/southIndian.js';
import { menuItems as italian } from './cuisines/italian.js';
import { menuItems as korean } from './cuisines/korean.js';

export const menu = [
  ...chinese,
  ...japanese,
  ...indian,
  ...southIndian,
  ...italian,
  ...korean,
];

export const menuByCuisine = menu.reduce((groups, item) => {
  groups[item.cuisine] ??= [];
  groups[item.cuisine].push(item);
  return groups;
}, {});

export const menuById = new Map(menu.map((item) => [item.id, item]));
